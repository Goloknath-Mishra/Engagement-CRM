import { Add } from '@mui/icons-material'
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api/apiClient'
import type { Lead, LeadConversion, Paginated } from '../api/types'
import { AttachmentsPanel } from '../components/AttachmentsPanel'
import { AuditTimelinePanel } from '../components/AuditTimelinePanel'
import { KanbanBoard } from '../components/KanbanBoard'
import { RelatedKnowledgePanel } from '../components/RelatedKnowledgePanel'
import { ValueChip } from '../components/ValueChip'
import { ViewModeToggle, type ViewMode } from '../components/ViewModeToggle'

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

/** Lead intake workspace with list/kanban views, conversion action, and inline editing. */
export function LeadsPage() {
  const qc = useQueryClient()
  const [sp, setSp] = useSearchParams()
  const [createOpen, setCreateOpen] = useState(false)
  const [clickedLead, setClickedLead] = useState<Lead | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [conversionInfo, setConversionInfo] = useState<{ contactId: number; opportunityId: number } | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('list')

  const statusFilter = sp.get('status') ?? ''
  const openIdParam = sp.get('open')

  const leadsQuery = useQuery({
    queryKey: ['leads', statusFilter],
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (statusFilter) params.status = statusFilter
      return (await api.get<Paginated<Lead>>('/api/leads/', { params })).data
    },
  })

  const closeEdit = () => {
    setClickedLead(null)
    if (!openIdParam) return
    const next = new URLSearchParams(sp)
    next.delete('open')
    setSp(next, { replace: true })
  }

  const createLead = useMutation({
    mutationFn: async (draft: LeadDraft) => (await api.post<Lead>('/api/leads/', draft)).data,
    onSuccess: async () => {
      setCreateOpen(false)
      await qc.invalidateQueries({ queryKey: ['leads'] })
    },
    onError: () => setError('Failed to create lead.'),
  })

  const updateLead = useMutation({
    mutationFn: async ({ id, patch }: { id: number; patch: Partial<LeadDraft> }) => (await api.patch<Lead>(`/api/leads/${id}/`, patch)).data,
    onSuccess: async () => {
      closeEdit()
      await qc.invalidateQueries({ queryKey: ['leads'] })
    },
    onError: () => setError('Failed to update lead.'),
  })

  const convertLead = useMutation({
    mutationFn: async (leadId: number) => (await api.post<LeadConversion>(`/api/leads/${leadId}/convert/`, {})).data,
    onSuccess: async (data) => {
      setConversionInfo({ contactId: data.contact.id, opportunityId: data.opportunity.id })
      await qc.invalidateQueries({ queryKey: ['leads'] })
      await qc.invalidateQueries({ queryKey: ['contacts'] })
      await qc.invalidateQueries({ queryKey: ['opportunities'] })
    },
    onError: () => setError('Failed to convert lead.'),
  })

  const [draft, setDraft] = useState<LeadDraft>({
    first_name: '',
    last_name: '',
    company: '',
    title: '',
    email: '',
    phone: '',
    status: 'new',
    source: 'web',
  })

  const leads = leadsQuery.data?.results ?? []
  const openId = openIdParam ? Number(openIdParam) : NaN
  const openLeadQuery = useQuery({
    queryKey: ['lead', openId],
    enabled: Number.isFinite(openId),
    queryFn: async () => (await api.get<Lead>(`/api/leads/${openId}/`)).data,
  })
  const openLead = openIdParam ? openLeadQuery.data ?? leads.find((l) => l.id === openId) ?? null : null
  const activeLead = clickedLead ?? openLead

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }} sx={{ mb: 2 }}>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h5">Leads</Typography>
          <Typography variant="body2" sx={{ opacity: 0.8, mt: 0.5 }}>
            Convert qualified leads into contacts and opportunities.
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
            <MenuItem value="working">Working</MenuItem>
            <MenuItem value="qualified">Qualified</MenuItem>
            <MenuItem value="disqualified">Disqualified</MenuItem>
            <MenuItem value="converted">Converted</MenuItem>
          </TextField>
          <ViewModeToggle value={viewMode} onChange={setViewMode} />
          <Button startIcon={<Add />} variant="contained" onClick={() => setCreateOpen(true)}>
            New Lead
          </Button>
        </Stack>
      </Stack>

      {conversionInfo ? (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setConversionInfo(null)}>
          Converted. Contact #{conversionInfo.contactId} and Opportunity #{conversionInfo.opportunityId}.
        </Alert>
      ) : null}

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
              <TableCell>Company</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Source</TableCell>
              <TableCell>Email</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {leads.map((l) => (
              <TableRow key={l.id} hover sx={{ cursor: 'pointer' }} onClick={() => setClickedLead(l)}>
                <TableCell>
                  {l.first_name} {l.last_name}
                </TableCell>
                <TableCell>{l.company}</TableCell>
                <TableCell>
                  <ValueChip kind="leadStatus" value={l.status} />
                </TableCell>
                <TableCell>{l.source}</TableCell>
                <TableCell>{l.email}</TableCell>
                <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Button size="small" disabled={convertLead.isPending || l.status === 'converted'} onClick={() => convertLead.mutate(l.id)}>
                      Convert
                    </Button>
                    <Button size="small" onClick={() => setClickedLead(l)}>
                      Edit
                    </Button>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
            {!leadsQuery.isLoading && leads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>No leads</TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      ) : (
        <KanbanBoard
          boardKey="leads-api"
          columns={[
            { key: 'new', label: 'New' },
            { key: 'working', label: 'Working' },
            { key: 'qualified', label: 'Qualified' },
            { key: 'disqualified', label: 'Disqualified' },
            { key: 'converted', label: 'Converted' },
          ]}
          items={leads}
          getId={(l) => l.id}
          getColumnKey={(l) => l.status}
          getTitle={(l) => `${l.first_name} ${l.last_name}`}
          getSubtitle={(l) => `${l.company || '—'} · ${l.email || '—'}`}
          getMeta={(l) => [{ label: l.status, color: l.status === 'qualified' ? 'success' : l.status === 'working' ? 'primary' : l.status === 'disqualified' ? 'error' : l.status === 'converted' ? 'secondary' : 'default' }]}
          onClickItem={(l) => setClickedLead(l)}
        />
      )}

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>New Lead</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField label="First name" value={draft.first_name} onChange={(e) => setDraft({ ...draft, first_name: e.target.value })} />
          <TextField label="Last name" value={draft.last_name} onChange={(e) => setDraft({ ...draft, last_name: e.target.value })} />
          <TextField label="Company" value={draft.company} onChange={(e) => setDraft({ ...draft, company: e.target.value })} />
          <TextField label="Title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          <TextField label="Email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
          <TextField label="Phone" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
          <TextField select label="Status" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as Lead['status'] })}>
            <MenuItem value="new">new</MenuItem>
            <MenuItem value="working">working</MenuItem>
            <MenuItem value="qualified">qualified</MenuItem>
            <MenuItem value="disqualified">disqualified</MenuItem>
            <MenuItem value="converted">converted</MenuItem>
          </TextField>
          <TextField select label="Source" value={draft.source} onChange={(e) => setDraft({ ...draft, source: e.target.value as Lead['source'] })}>
            <MenuItem value="campaign">campaign</MenuItem>
            <MenuItem value="web">web</MenuItem>
            <MenuItem value="email">email</MenuItem>
            <MenuItem value="phone">phone</MenuItem>
            <MenuItem value="referral">referral</MenuItem>
            <MenuItem value="other">other</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={createLead.isPending || !draft.last_name} onClick={() => createLead.mutate(draft)}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {openIdParam && !activeLead ? (
        <Dialog open={true} onClose={closeEdit} fullWidth maxWidth="sm">
          <DialogTitle>Loading…</DialogTitle>
          <DialogContent sx={{ mt: 1 }}>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              Fetching lead #{openIdParam}.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeEdit}>Close</Button>
          </DialogActions>
        </Dialog>
      ) : null}

      {activeLead ? (
        <LeadEditDialog
          key={activeLead.id}
          open={true}
          lead={activeLead}
          isSaving={updateLead.isPending}
          onClose={closeEdit}
          onSave={(nextDraft) => updateLead.mutate({ id: activeLead.id, patch: nextDraft })}
        />
      ) : null}
    </Box>
  )
}

/** Modal editor for a single lead record; draft state is local to the dialog instance. */
function LeadEditDialog({
  open,
  lead,
  isSaving,
  onClose,
  onSave,
}: {
  open: boolean
  lead: Lead
  isSaving: boolean
  onClose: () => void
  onSave: (draft: LeadDraft) => void
}) {
  const [draft, setDraft] = useState<LeadDraft>(() => leadToDraft(lead))

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Edit Lead</DialogTitle>
      <DialogContent sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mt: 1 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField label="First name" value={draft.first_name} onChange={(e) => setDraft({ ...draft, first_name: e.target.value })} />
          <TextField label="Last name" value={draft.last_name} onChange={(e) => setDraft({ ...draft, last_name: e.target.value })} />
          <TextField label="Company" value={draft.company} onChange={(e) => setDraft({ ...draft, company: e.target.value })} />
          <TextField label="Title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          <TextField label="Email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
          <TextField label="Phone" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
          <TextField select label="Status" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as Lead['status'] })}>
            <MenuItem value="new">new</MenuItem>
            <MenuItem value="working">working</MenuItem>
            <MenuItem value="qualified">qualified</MenuItem>
            <MenuItem value="disqualified">disqualified</MenuItem>
            <MenuItem value="converted">converted</MenuItem>
          </TextField>
          <TextField select label="Source" value={draft.source} onChange={(e) => setDraft({ ...draft, source: e.target.value as Lead['source'] })}>
            <MenuItem value="campaign">campaign</MenuItem>
            <MenuItem value="web">web</MenuItem>
            <MenuItem value="email">email</MenuItem>
            <MenuItem value="phone">phone</MenuItem>
            <MenuItem value="referral">referral</MenuItem>
            <MenuItem value="other">other</MenuItem>
          </TextField>
        </Box>
        <Stack spacing={2}>
          <AttachmentsPanel entityType="lead" entityId={lead.id} />
          <RelatedKnowledgePanel entityType="lead" entityId={lead.id} />
          <AuditTimelinePanel entityType="lead" entityId={lead.id} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={isSaving} onClick={() => onSave(draft)}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  )
}

function leadToDraft(l: Lead): LeadDraft {
  return {
    first_name: l.first_name ?? '',
    last_name: l.last_name,
    company: l.company ?? '',
    title: l.title ?? '',
    email: l.email ?? '',
    phone: l.phone ?? '',
    status: l.status,
    source: l.source,
  }
}
