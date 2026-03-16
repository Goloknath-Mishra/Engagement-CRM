import { Add } from '@mui/icons-material'
import { Alert, Box, Button, Card, CardContent, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/apiClient'
import type { Campaign, Lead, Paginated } from '../api/types'
import { KanbanBoard } from '../components/KanbanBoard'
import { ValueChip } from '../components/ValueChip'
import { ViewModeToggle, type ViewMode } from '../components/ViewModeToggle'

type CampaignDraft = {
  name: string
  description: string
  status: Campaign['status']
  start_date: string
  end_date: string
  budget: string
}

type LeadDraft = {
  first_name: string
  last_name: string
  company: string
  title: string
  email: string
  phone: string
  status: Lead['status']
  source: Lead['source']
}

/** Campaign management with list/kanban views and lead creation from campaigns. */
export function CampaignsPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [createOpen, setCreateOpen] = useState(false)
  const [leadCampaignId, setLeadCampaignId] = useState<number | null>(null)
  const [editId, setEditId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const campaignsQuery = useQuery({
    queryKey: ['campaigns'],
    queryFn: async () => (await api.get<Paginated<Campaign>>('/api/campaigns/')).data,
  })

  const createCampaign = useMutation({
    mutationFn: async (draft: CampaignDraft) => {
      const payload = {
        ...draft,
        start_date: draft.start_date || null,
        end_date: draft.end_date || null,
        budget: draft.budget ? Number(draft.budget) : 0,
      }
      return (await api.post<Campaign>('/api/campaigns/', payload)).data
    },
    onSuccess: async () => {
      setCreateOpen(false)
      await qc.invalidateQueries({ queryKey: ['campaigns'] })
    },
    onError: () => setError('Failed to create campaign.'),
  })

  const updateCampaign = useMutation({
    mutationFn: async ({ id, patch }: { id: number; patch: Partial<CampaignDraft> }) => {
      const payload = {
        ...patch,
        start_date: patch.start_date === '' ? null : patch.start_date,
        end_date: patch.end_date === '' ? null : patch.end_date,
        budget: patch.budget !== undefined ? Number(patch.budget || 0) : undefined,
      }
      return (await api.patch<Campaign>(`/api/campaigns/${id}/`, payload)).data
    },
    onSuccess: async () => {
      setEditId(null)
      await qc.invalidateQueries({ queryKey: ['campaigns'] })
    },
    onError: () => setError('Failed to update campaign.'),
  })

  const createLead = useMutation({
    mutationFn: async ({ campaignId, draft }: { campaignId: number; draft: LeadDraft }) => {
      return (await api.post<Lead>(`/api/campaigns/${campaignId}/leads/`, draft)).data
    },
    onSuccess: async () => {
      setLeadCampaignId(null)
      await qc.invalidateQueries({ queryKey: ['leads'] })
    },
    onError: () => setError('Failed to create lead.'),
  })

  const [campaignDraft, setCampaignDraft] = useState<CampaignDraft>({
    name: '',
    description: '',
    status: 'draft',
    start_date: '',
    end_date: '',
    budget: '0',
  })

  const [leadDraft, setLeadDraft] = useState<LeadDraft>({
    first_name: '',
    last_name: '',
    company: '',
    title: '',
    email: '',
    phone: '',
    status: 'new',
    source: 'campaign',
  })

  const campaigns = campaignsQuery.data?.results ?? []
  const totalBudget = campaigns.reduce((sum, c) => sum + Number(c.budget ?? 0), 0)
  const statusCounts = campaigns.reduce(
    (acc, c) => {
      acc[c.status] = (acc[c.status] ?? 0) + 1
      return acc
    },
    {} as Record<Campaign['status'], number>,
  )

  const [editDraft, setEditDraft] = useState<CampaignDraft | null>(null)
  const openEdit = (c: Campaign) => {
    setEditId(c.id)
    setEditDraft({
      name: c.name,
      description: c.description ?? '',
      status: c.status,
      start_date: c.start_date ?? '',
      end_date: c.end_date ?? '',
      budget: String(c.budget ?? 0),
    })
  }

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }} sx={{ mb: 2 }}>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h5">Campaigns</Typography>
          <Typography variant="body2" sx={{ opacity: 0.8, mt: 0.5 }}>
            List + kanban views. Click records to drill in and edit.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <ViewModeToggle value={viewMode} onChange={setViewMode} />
          <Button startIcon={<Add />} variant="contained" onClick={() => setCreateOpen(true)}>
            New Campaign
          </Button>
        </Stack>
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 2, mb: 2 }}>
        <Card>
          <CardContent>
            <Typography variant="subtitle2" sx={{ opacity: 0.8 }}>
              Total Campaigns
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 900, mt: 0.75 }}>
              {campaignsQuery.data?.count ?? campaigns.length}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="subtitle2" sx={{ opacity: 0.8 }}>
              Active
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 900, mt: 0.75 }}>
              {statusCounts.active ?? 0}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="subtitle2" sx={{ opacity: 0.8 }}>
              Planned / Draft
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 900, mt: 0.75 }}>
              {statusCounts.draft ?? 0}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="subtitle2" sx={{ opacity: 0.8 }}>
              Total Budget
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 900, mt: 0.75 }}>
              ${totalBudget.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </Typography>
          </CardContent>
        </Card>
      </Box>

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
              <TableCell>Status</TableCell>
              <TableCell>Start</TableCell>
              <TableCell>End</TableCell>
              <TableCell align="right">Budget</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {campaigns.map((c) => (
              <TableRow key={c.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/campaigns/${c.id}`)}>
                <TableCell>{c.name}</TableCell>
                <TableCell>
                  <ValueChip kind="campaignStatus" value={c.status} />
                </TableCell>
                <TableCell>{c.start_date ?? ''}</TableCell>
                <TableCell>{c.end_date ?? ''}</TableCell>
                <TableCell align="right">{c.budget}</TableCell>
                <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Button size="small" onClick={() => navigate(`/campaigns/${c.id}`)}>
                      View
                    </Button>
                    <Button size="small" onClick={() => setLeadCampaignId(c.id)}>
                      Create Lead
                    </Button>
                    <Button size="small" onClick={() => openEdit(c)}>
                      Edit
                    </Button>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
            {!campaignsQuery.isLoading && campaigns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>No campaigns</TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      ) : (
        <KanbanBoard
          boardKey="campaigns-api"
          columns={[
            { key: 'draft', label: 'Draft' },
            { key: 'active', label: 'Active' },
            { key: 'completed', label: 'Completed' },
            { key: 'cancelled', label: 'Cancelled' },
          ]}
          items={campaigns}
          getId={(c) => c.id}
          getColumnKey={(c) => c.status}
          getTitle={(c) => c.name}
          getSubtitle={(c) => `Budget ${c.budget} · ${c.start_date ?? ''} → ${c.end_date ?? ''}`}
          getMeta={(c) => [{ label: c.status, color: c.status === 'active' ? 'success' : c.status === 'draft' ? 'warning' : c.status === 'cancelled' ? 'error' : 'secondary' }]}
          onClickItem={(c) => navigate(`/campaigns/${c.id}`)}
        />
      )}

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>New Campaign</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField label="Name" value={campaignDraft.name} onChange={(e) => setCampaignDraft({ ...campaignDraft, name: e.target.value })} />
          <TextField
            label="Description"
            value={campaignDraft.description}
            onChange={(e) => setCampaignDraft({ ...campaignDraft, description: e.target.value })}
            multiline
            minRows={2}
          />
          <TextField select label="Status" value={campaignDraft.status} onChange={(e) => setCampaignDraft({ ...campaignDraft, status: e.target.value as Campaign['status'] })}>
            <MenuItem value="draft">draft</MenuItem>
            <MenuItem value="active">active</MenuItem>
            <MenuItem value="completed">completed</MenuItem>
            <MenuItem value="cancelled">cancelled</MenuItem>
          </TextField>
          <TextField label="Start date" type="date" value={campaignDraft.start_date} onChange={(e) => setCampaignDraft({ ...campaignDraft, start_date: e.target.value })} InputLabelProps={{ shrink: true }} />
          <TextField label="End date" type="date" value={campaignDraft.end_date} onChange={(e) => setCampaignDraft({ ...campaignDraft, end_date: e.target.value })} InputLabelProps={{ shrink: true }} />
          <TextField label="Budget" type="number" value={campaignDraft.budget} onChange={(e) => setCampaignDraft({ ...campaignDraft, budget: e.target.value })} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={createCampaign.isPending || !campaignDraft.name} onClick={() => createCampaign.mutate(campaignDraft)}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={leadCampaignId !== null} onClose={() => setLeadCampaignId(null)} fullWidth maxWidth="sm">
        <DialogTitle>Create Lead</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField label="First name" value={leadDraft.first_name} onChange={(e) => setLeadDraft({ ...leadDraft, first_name: e.target.value })} />
          <TextField label="Last name" value={leadDraft.last_name} onChange={(e) => setLeadDraft({ ...leadDraft, last_name: e.target.value })} />
          <TextField label="Company" value={leadDraft.company} onChange={(e) => setLeadDraft({ ...leadDraft, company: e.target.value })} />
          <TextField label="Title" value={leadDraft.title} onChange={(e) => setLeadDraft({ ...leadDraft, title: e.target.value })} />
          <TextField label="Email" value={leadDraft.email} onChange={(e) => setLeadDraft({ ...leadDraft, email: e.target.value })} />
          <TextField label="Phone" value={leadDraft.phone} onChange={(e) => setLeadDraft({ ...leadDraft, phone: e.target.value })} />
          <TextField select label="Status" value={leadDraft.status} onChange={(e) => setLeadDraft({ ...leadDraft, status: e.target.value as Lead['status'] })}>
            <MenuItem value="new">new</MenuItem>
            <MenuItem value="working">working</MenuItem>
            <MenuItem value="qualified">qualified</MenuItem>
            <MenuItem value="disqualified">disqualified</MenuItem>
            <MenuItem value="converted">converted</MenuItem>
          </TextField>
          <TextField select label="Source" value={leadDraft.source} onChange={(e) => setLeadDraft({ ...leadDraft, source: e.target.value as Lead['source'] })}>
            <MenuItem value="campaign">campaign</MenuItem>
            <MenuItem value="web">web</MenuItem>
            <MenuItem value="email">email</MenuItem>
            <MenuItem value="phone">phone</MenuItem>
            <MenuItem value="referral">referral</MenuItem>
            <MenuItem value="other">other</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLeadCampaignId(null)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={createLead.isPending || !leadDraft.last_name || leadCampaignId === null}
            onClick={() => leadCampaignId !== null && createLead.mutate({ campaignId: leadCampaignId, draft: leadDraft })}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!editId} onClose={() => setEditId(null)} fullWidth maxWidth="sm">
        <DialogTitle>Edit Campaign</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {editDraft ? (
            <>
              <TextField label="Name" value={editDraft.name} onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })} />
              <TextField label="Description" value={editDraft.description} onChange={(e) => setEditDraft({ ...editDraft, description: e.target.value })} multiline minRows={2} />
              <TextField select label="Status" value={editDraft.status} onChange={(e) => setEditDraft({ ...editDraft, status: e.target.value as Campaign['status'] })}>
                <MenuItem value="draft">draft</MenuItem>
                <MenuItem value="active">active</MenuItem>
                <MenuItem value="completed">completed</MenuItem>
                <MenuItem value="cancelled">cancelled</MenuItem>
              </TextField>
              <TextField label="Start date" type="date" value={editDraft.start_date} onChange={(e) => setEditDraft({ ...editDraft, start_date: e.target.value })} InputLabelProps={{ shrink: true }} />
              <TextField label="End date" type="date" value={editDraft.end_date} onChange={(e) => setEditDraft({ ...editDraft, end_date: e.target.value })} InputLabelProps={{ shrink: true }} />
              <TextField label="Budget" type="number" value={editDraft.budget} onChange={(e) => setEditDraft({ ...editDraft, budget: e.target.value })} />
            </>
          ) : (
            <Typography>Loading…</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setEditId(null)
              setEditDraft(null)
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={!editDraft || updateCampaign.isPending || !editId}
            onClick={() => {
              if (!editId || !editDraft) return
              updateCampaign.mutate({ id: editId, patch: editDraft })
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

