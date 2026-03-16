import { Add } from '@mui/icons-material'
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api/apiClient'
import type { Case, Contact, Paginated, Product } from '../api/types'
import { ViewModeToggle, type ViewMode } from '../components/ViewModeToggle'
import { KanbanBoard } from '../components/KanbanBoard'
import { useNow } from '../app/useNow'
import { ValueChip } from '../components/ValueChip'

type CaseDraft = {
  subject: string
  description: string
  status: Case['status']
  priority: Case['priority']
  contact: number
  product: number | null
}

/** Case queue with list/kanban views, live SLA countdown, and create/edit dialogs. */
export function CasesPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [sp, setSp] = useSearchParams()
  const nowMs = useNow(1000)

  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [createOpen, setCreateOpen] = useState(false)
  const [edit, setEdit] = useState<{ id: number; draft: CaseDraft } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const statusFilter = sp.get('status') ?? ''

  const casesQuery = useQuery({
    queryKey: ['cases', statusFilter],
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (statusFilter) params.status = statusFilter
      return (await api.get<Paginated<Case>>('/api/cases/', { params })).data
    },
  })

  const contactsQuery = useQuery({
    queryKey: ['contacts', 'all'],
    queryFn: async () => (await api.get<Paginated<Contact>>('/api/contacts/')).data,
  })

  const productsQuery = useQuery({
    queryKey: ['products', 'all'],
    queryFn: async () => (await api.get<Paginated<Product>>('/api/products/')).data,
  })

  const createCase = useMutation({
    mutationFn: async (draft: CaseDraft) => (await api.post<Case>('/api/cases/', draft)).data,
    onSuccess: async (c) => {
      setCreateOpen(false)
      await qc.invalidateQueries({ queryKey: ['cases'] })
      navigate(`/cases/${c.id}`)
    },
    onError: () => setError('Failed to create case.'),
  })

  const updateCase = useMutation({
    mutationFn: async ({ id, patch }: { id: number; patch: Partial<CaseDraft> }) => (await api.patch<Case>(`/api/cases/${id}/`, patch)).data,
    onSuccess: async () => {
      setEdit(null)
      await qc.invalidateQueries({ queryKey: ['cases'] })
    },
    onError: () => setError('Failed to update case.'),
  })

  const items = casesQuery.data?.results ?? []
  const contacts = useMemo(() => contactsQuery.data?.results ?? [], [contactsQuery.data?.results])
  const products = useMemo(() => productsQuery.data?.results ?? [], [productsQuery.data?.results])

  const contactById = useMemo(() => new Map(contacts.map((c) => [c.id, c])), [contacts])
  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products])

  const [draft, setDraft] = useState<CaseDraft>({
    subject: '',
    description: '',
    status: 'new',
    priority: 'medium',
    contact: 0,
    product: null,
  })
  const openEdit = (c: Case) => {
    setEdit({
      id: c.id,
      draft: {
        subject: c.subject,
        description: c.description,
        status: c.status,
        priority: c.priority,
        contact: c.contact,
        product: c.product,
      },
    })
  }

  const columns = [
    { key: 'new', label: 'New' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'waiting_on_customer', label: 'Waiting on Customer' },
    { key: 'closed', label: 'Closed' },
  ]

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }} sx={{ mb: 2 }}>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h5">Cases</Typography>
          <Typography variant="body2" sx={{ opacity: 0.8, mt: 0.5 }}>
            SLA countdown is computed server-side and updates live in the UI.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <TextField
            size="small"
            select
            label="Status"
            value={statusFilter}
            onChange={(e) => {
              const v = e.target.value
              if (v) sp.set('status', v)
              else sp.delete('status')
              setSp(sp, { replace: true })
            }}
            sx={{ minWidth: 220 }}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="new">New</MenuItem>
            <MenuItem value="in_progress">In Progress</MenuItem>
            <MenuItem value="waiting_on_customer">Waiting on Customer</MenuItem>
            <MenuItem value="closed">Closed</MenuItem>
          </TextField>
          <ViewModeToggle value={viewMode} onChange={setViewMode} />
          <Button startIcon={<Add />} variant="contained" onClick={() => setCreateOpen(true)}>
            New Case
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
              <TableCell>Subject</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Priority</TableCell>
              <TableCell>Contact</TableCell>
              <TableCell>Product</TableCell>
              <TableCell align="right">SLA</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((c) => {
              const remaining = Math.max(0, Math.floor((new Date(c.sla_due_at).getTime() - nowMs) / 1000))
              const contact = contactById.get(c.contact)
              const product = c.product ? productById.get(c.product) : null
              return (
                <TableRow key={c.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/cases/${c.id}`)}>
                  <TableCell>{c.subject}</TableCell>
                  <TableCell>
                    <ValueChip kind="caseStatus" value={c.status} />
                  </TableCell>
                  <TableCell>
                    <ValueChip kind="casePriority" value={c.priority} />
                  </TableCell>
                  <TableCell>{contact ? `${contact.first_name} ${contact.last_name}` : `#${c.contact}`}</TableCell>
                  <TableCell>{product ? `${product.sku}` : c.product ? `#${c.product}` : '—'}</TableCell>
                  <TableCell align="right">{formatCountdown(remaining)}</TableCell>
                  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                    <Button size="small" onClick={() => openEdit(c)}>
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
            {!casesQuery.isLoading && items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>No cases</TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      ) : (
        <KanbanBoard
          boardKey="cases-api"
          columns={columns}
          items={items}
          getId={(c) => c.id}
          getColumnKey={(c) => c.status}
          getTitle={(c) => c.subject}
          getSubtitle={(c) => {
            const remaining = Math.max(0, Math.floor((new Date(c.sla_due_at).getTime() - nowMs) / 1000))
            return `${c.priority} · ${formatCountdown(remaining)}`
          }}
          getMeta={(c) => [{ label: c.priority, color: c.priority === 'urgent' ? 'error' : c.priority === 'high' ? 'warning' : 'default' }]}
          onClickItem={(c) => navigate(`/cases/${c.id}`)}
        />
      )}

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>New Case</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField label="Subject" value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} />
          <TextField label="Description" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} multiline minRows={3} />
          <TextField select label="Status" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as Case['status'] })}>
            <MenuItem value="new">new</MenuItem>
            <MenuItem value="in_progress">in_progress</MenuItem>
            <MenuItem value="waiting_on_customer">waiting_on_customer</MenuItem>
            <MenuItem value="closed">closed</MenuItem>
          </TextField>
          <TextField select label="Priority" value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: e.target.value as Case['priority'] })}>
            <MenuItem value="low">low</MenuItem>
            <MenuItem value="medium">medium</MenuItem>
            <MenuItem value="high">high</MenuItem>
            <MenuItem value="urgent">urgent</MenuItem>
          </TextField>
          <TextField
            select
            label="Contact"
            value={draft.contact || ''}
            onChange={(e) => setDraft({ ...draft, contact: Number(e.target.value) })}
          >
            {contacts.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.first_name} {c.last_name} · {c.account_name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Product"
            value={draft.product ?? ''}
            onChange={(e) => {
              const v = e.target.value
              setDraft({ ...draft, product: v ? Number(v) : null })
            }}
          >
            <MenuItem value="">None</MenuItem>
            {products.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.sku} · {p.name}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={createCase.isPending || !draft.subject || !draft.contact} onClick={() => createCase.mutate(draft)}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!edit} onClose={() => setEdit(null)} fullWidth maxWidth="sm">
        <DialogTitle>Edit Case</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {edit ? (
            <>
              <TextField label="Subject" value={edit.draft.subject} onChange={(e) => setEdit({ ...edit, draft: { ...edit.draft, subject: e.target.value } })} />
              <TextField label="Description" value={edit.draft.description} onChange={(e) => setEdit({ ...edit, draft: { ...edit.draft, description: e.target.value } })} multiline minRows={3} />
              <TextField select label="Status" value={edit.draft.status} onChange={(e) => setEdit({ ...edit, draft: { ...edit.draft, status: e.target.value as Case['status'] } })}>
                <MenuItem value="new">new</MenuItem>
                <MenuItem value="in_progress">in_progress</MenuItem>
                <MenuItem value="waiting_on_customer">waiting_on_customer</MenuItem>
                <MenuItem value="closed">closed</MenuItem>
              </TextField>
              <TextField select label="Priority" value={edit.draft.priority} onChange={(e) => setEdit({ ...edit, draft: { ...edit.draft, priority: e.target.value as Case['priority'] } })}>
                <MenuItem value="low">low</MenuItem>
                <MenuItem value="medium">medium</MenuItem>
                <MenuItem value="high">high</MenuItem>
                <MenuItem value="urgent">urgent</MenuItem>
              </TextField>
              <TextField select label="Contact" value={edit.draft.contact} onChange={(e) => setEdit({ ...edit, draft: { ...edit.draft, contact: Number(e.target.value) } })}>
                {contacts.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.first_name} {c.last_name} · {c.account_name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Product"
                value={edit.draft.product ?? ''}
                onChange={(e) => {
                  const v = e.target.value
                  setEdit({ ...edit, draft: { ...edit.draft, product: v ? Number(v) : null } })
                }}
              >
                <MenuItem value="">None</MenuItem>
                {products.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.sku} · {p.name}
                  </MenuItem>
                ))}
              </TextField>
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
            disabled={!edit || updateCase.isPending}
            onClick={() => {
              if (!edit) return
              updateCase.mutate({ id: edit.id, patch: edit.draft })
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

function formatCountdown(seconds: number) {
  const s = Math.max(0, seconds)
  const hh = Math.floor(s / 3600)
  const mm = Math.floor((s % 3600) / 60)
  const ss = s % 60
  if (hh > 0) return `${hh}h ${String(mm).padStart(2, '0')}m ${String(ss).padStart(2, '0')}s`
  return `${mm}m ${String(ss).padStart(2, '0')}s`
}
