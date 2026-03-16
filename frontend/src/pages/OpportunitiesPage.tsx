import { Add } from '@mui/icons-material'
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api/apiClient'
import type { Opportunity, Paginated } from '../api/types'
import { KanbanBoard } from '../components/KanbanBoard'
import { ValueChip } from '../components/ValueChip'
import { ViewModeToggle, type ViewMode } from '../components/ViewModeToggle'

type OpportunityDraft = {
  name: string
  stage: Opportunity['stage']
  amount: string
  close_date: string
  account_name: string
}

/** Opportunity pipeline with list/kanban views plus create/edit workflows. */
export function OpportunitiesPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [sp, setSp] = useSearchParams()
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [createOpen, setCreateOpen] = useState(false)
  const [edit, setEdit] = useState<{ id: number; draft: OpportunityDraft } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const stageFilter = sp.get('stage') ?? ''

  const opportunitiesQuery = useQuery({
    queryKey: ['opportunities', stageFilter],
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (stageFilter) params.stage = stageFilter
      return (await api.get<Paginated<Opportunity>>('/api/opportunities/', { params })).data
    },
  })

  const createOpportunity = useMutation({
    mutationFn: async (draft: OpportunityDraft) => {
      const payload = {
        name: draft.name,
        stage: draft.stage,
        amount: Number(draft.amount || 0),
        close_date: draft.close_date || null,
        account_name: draft.account_name || '',
      }
      return (await api.post<Opportunity>('/api/opportunities/', payload)).data
    },
    onSuccess: async () => {
      setCreateOpen(false)
      await qc.invalidateQueries({ queryKey: ['opportunities'] })
    },
    onError: () => setError('Failed to create opportunity.'),
  })

  const updateOpportunity = useMutation({
    mutationFn: async ({ id, patch }: { id: number; patch: Partial<OpportunityDraft> }) => {
      const payload = {
        ...patch,
        amount: patch.amount !== undefined ? Number(patch.amount || 0) : undefined,
        close_date: patch.close_date === '' ? null : patch.close_date,
      }
      return (await api.patch<Opportunity>(`/api/opportunities/${id}/`, payload)).data
    },
    onSuccess: async () => {
      setEdit(null)
      await qc.invalidateQueries({ queryKey: ['opportunities'] })
    },
    onError: () => setError('Failed to update opportunity.'),
  })

  const [draft, setDraft] = useState<OpportunityDraft>({
    name: '',
    stage: 'prospecting',
    amount: '0',
    close_date: '',
    account_name: '',
  })

  const items = opportunitiesQuery.data?.results ?? []
  const openEdit = (o: Opportunity) => {
    setEdit({
      id: o.id,
      draft: {
        name: o.name,
        stage: o.stage,
        amount: String(o.amount ?? 0),
        close_date: o.close_date ?? '',
        account_name: o.account_name ?? '',
      },
    })
  }

  const columns = [
    { key: 'prospecting', label: 'Prospecting' },
    { key: 'qualification', label: 'Qualification' },
    { key: 'proposal', label: 'Proposal' },
    { key: 'negotiation', label: 'Negotiation' },
    { key: 'closed_won', label: 'Closed Won' },
    { key: 'closed_lost', label: 'Closed Lost' },
  ]

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }} sx={{ mb: 2 }}>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h5">Opportunities</Typography>
          <Typography variant="body2" sx={{ opacity: 0.8, mt: 0.5 }}>
            Pipeline management with list + kanban views.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <TextField
            size="small"
            select
            label="Stage"
            value={stageFilter}
            onChange={(e) => {
              const v = e.target.value
              if (v) sp.set('stage', v)
              else sp.delete('stage')
              setSp(sp, { replace: true })
            }}
            sx={{ minWidth: 220 }}
          >
            <MenuItem value="">All</MenuItem>
            {columns.map((c) => (
              <MenuItem key={c.key} value={c.key}>
                {c.label}
              </MenuItem>
            ))}
          </TextField>
          <ViewModeToggle value={viewMode} onChange={setViewMode} />
          <Button startIcon={<Add />} variant="contained" onClick={() => setCreateOpen(true)}>
            New Opportunity
          </Button>
        </Stack>
      </Stack>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}

      {viewMode === 'list' ? (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Account</TableCell>
              <TableCell>Stage</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell>Close date</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((o) => (
              <TableRow key={o.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/opportunities/${o.id}`)}>
                <TableCell>{o.name}</TableCell>
                <TableCell>{o.account_name}</TableCell>
                  <TableCell>
                    <ValueChip kind="opportunityStage" value={o.stage} />
                  </TableCell>
                <TableCell align="right">{o.amount}</TableCell>
                <TableCell>{o.close_date ?? ''}</TableCell>
                <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Button size="small" onClick={() => navigate(`/opportunities/${o.id}`)}>
                      Details
                    </Button>
                    <Button size="small" onClick={() => openEdit(o)}>
                      Edit
                    </Button>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
            {!opportunitiesQuery.isLoading && items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>No opportunities</TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      ) : (
        <KanbanBoard
          boardKey="opportunities-api"
          columns={columns}
          items={items}
          getId={(o) => o.id}
          getColumnKey={(o) => o.stage}
          getTitle={(o) => o.name}
          getSubtitle={(o) => `${o.account_name || '—'} · $${o.amount}`}
          getMeta={(o) => [
            {
              label: o.stage,
              color: o.stage === 'closed_won' ? 'success' : o.stage === 'closed_lost' ? 'error' : o.stage === 'negotiation' ? 'warning' : o.stage === 'proposal' ? 'secondary' : 'primary',
            },
          ]}
          onClickItem={(o) => navigate(`/opportunities/${o.id}`)}
        />
      )}

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>New Opportunity</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField label="Name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <TextField label="Account name" value={draft.account_name} onChange={(e) => setDraft({ ...draft, account_name: e.target.value })} />
          <TextField select label="Stage" value={draft.stage} onChange={(e) => setDraft({ ...draft, stage: e.target.value as Opportunity['stage'] })}>
            {columns.map((c) => (
              <MenuItem key={c.key} value={c.key}>
                {c.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField label="Amount" type="number" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} />
          <TextField label="Close date" type="date" value={draft.close_date} onChange={(e) => setDraft({ ...draft, close_date: e.target.value })} InputLabelProps={{ shrink: true }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={createOpportunity.isPending || !draft.name} onClick={() => createOpportunity.mutate(draft)}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!edit} onClose={() => setEdit(null)} fullWidth maxWidth="sm">
        <DialogTitle>Edit Opportunity</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {edit ? (
            <>
              <TextField label="Name" value={edit.draft.name} onChange={(e) => setEdit({ ...edit, draft: { ...edit.draft, name: e.target.value } })} />
              <TextField label="Account name" value={edit.draft.account_name} onChange={(e) => setEdit({ ...edit, draft: { ...edit.draft, account_name: e.target.value } })} />
              <TextField select label="Stage" value={edit.draft.stage} onChange={(e) => setEdit({ ...edit, draft: { ...edit.draft, stage: e.target.value as Opportunity['stage'] } })}>
                {columns.map((c) => (
                  <MenuItem key={c.key} value={c.key}>
                    {c.label}
                  </MenuItem>
                ))}
              </TextField>
              <TextField label="Amount" type="number" value={edit.draft.amount} onChange={(e) => setEdit({ ...edit, draft: { ...edit.draft, amount: e.target.value } })} />
              <TextField label="Close date" type="date" value={edit.draft.close_date} onChange={(e) => setEdit({ ...edit, draft: { ...edit.draft, close_date: e.target.value } })} InputLabelProps={{ shrink: true }} />
            </>
          ) : (
            <Typography>Loading…</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setEdit(null)
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={!edit || updateOpportunity.isPending}
            onClick={() => {
              if (!edit) return
              updateOpportunity.mutate({ id: edit.id, patch: edit.draft })
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

