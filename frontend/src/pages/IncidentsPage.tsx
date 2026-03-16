import { Add } from '@mui/icons-material'
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api/apiClient'
import type { Incident, Paginated } from '../api/types'
import { ValueChip } from '../components/ValueChip'

type IncidentDraft = {
  title: string
  description: string
  status: Incident['status']
  severity: Incident['severity']
}

/** Incident list with filtering, create/edit dialogs, and navigation to the war room. */
export function IncidentsPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [sp, setSp] = useSearchParams()
  const [createOpen, setCreateOpen] = useState(false)
  const [edit, setEdit] = useState<{ id: number; draft: IncidentDraft } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const statusFilter = sp.get('status') ?? ''

  const incidentsQuery = useQuery({
    queryKey: ['incidents', statusFilter],
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (statusFilter) params.status = statusFilter
      return (await api.get<Paginated<Incident>>('/api/incidents/', { params })).data
    },
  })

  const createIncident = useMutation({
    mutationFn: async (draft: IncidentDraft) => (await api.post<Incident>('/api/incidents/', draft)).data,
    onSuccess: async (i) => {
      setCreateOpen(false)
      await qc.invalidateQueries({ queryKey: ['incidents'] })
      navigate(`/incidents/${i.id}`)
    },
    onError: () => setError('Failed to create incident.'),
  })

  const updateIncident = useMutation({
    mutationFn: async ({ id, patch }: { id: number; patch: Partial<IncidentDraft> }) => (await api.patch<Incident>(`/api/incidents/${id}/`, patch)).data,
    onSuccess: async () => {
      setEdit(null)
      await qc.invalidateQueries({ queryKey: ['incidents'] })
    },
    onError: () => setError('Failed to update incident.'),
  })

  const items = incidentsQuery.data?.results ?? []

  const [draft, setDraft] = useState<IncidentDraft>({ title: '', description: '', status: 'open', severity: 'sev3' })
  const openEdit = (i: Incident) => {
    setEdit({
      id: i.id,
      draft: { title: i.title, description: i.description, status: i.status, severity: i.severity },
    })
  }

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }} sx={{ mb: 2 }}>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h5">Incidents</Typography>
          <Typography variant="body2" sx={{ opacity: 0.8, mt: 0.5 }}>
            War room collaboration with timeline messages.
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
            <MenuItem value="open">Open</MenuItem>
            <MenuItem value="investigating">Investigating</MenuItem>
            <MenuItem value="mitigating">Mitigating</MenuItem>
            <MenuItem value="resolved">Resolved</MenuItem>
          </TextField>
          <Button startIcon={<Add />} variant="contained" onClick={() => setCreateOpen(true)}>
            New Incident
          </Button>
        </Stack>
      </Stack>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Title</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Severity</TableCell>
            <TableCell>Updated</TableCell>
            <TableCell />
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((i) => (
            <TableRow key={i.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/incidents/${i.id}`)}>
              <TableCell>{i.title}</TableCell>
                <TableCell>
                  <ValueChip kind="incidentStatus" value={i.status} />
                </TableCell>
                <TableCell>
                  <ValueChip kind="incidentSeverity" value={i.severity} />
                </TableCell>
              <TableCell>{i.updated_at.slice(0, 19).replace('T', ' ')}</TableCell>
              <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                  <Button size="small" onClick={() => navigate(`/incidents/${i.id}`)}>
                    War Room
                  </Button>
                  <Button size="small" onClick={() => openEdit(i)}>
                    Edit
                  </Button>
                </Stack>
              </TableCell>
            </TableRow>
          ))}
          {!incidentsQuery.isLoading && items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5}>No incidents</TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>New Incident</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField label="Title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          <TextField label="Description" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} multiline minRows={3} />
          <TextField select label="Status" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as Incident['status'] })}>
            <MenuItem value="open">open</MenuItem>
            <MenuItem value="investigating">investigating</MenuItem>
            <MenuItem value="mitigating">mitigating</MenuItem>
            <MenuItem value="resolved">resolved</MenuItem>
          </TextField>
          <TextField select label="Severity" value={draft.severity} onChange={(e) => setDraft({ ...draft, severity: e.target.value as Incident['severity'] })}>
            <MenuItem value="sev1">sev1</MenuItem>
            <MenuItem value="sev2">sev2</MenuItem>
            <MenuItem value="sev3">sev3</MenuItem>
            <MenuItem value="sev4">sev4</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={createIncident.isPending || !draft.title} onClick={() => createIncident.mutate(draft)}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!edit} onClose={() => setEdit(null)} fullWidth maxWidth="sm">
        <DialogTitle>Edit Incident</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {edit ? (
            <>
              <TextField label="Title" value={edit.draft.title} onChange={(e) => setEdit({ ...edit, draft: { ...edit.draft, title: e.target.value } })} />
              <TextField label="Description" value={edit.draft.description} onChange={(e) => setEdit({ ...edit, draft: { ...edit.draft, description: e.target.value } })} multiline minRows={3} />
              <TextField select label="Status" value={edit.draft.status} onChange={(e) => setEdit({ ...edit, draft: { ...edit.draft, status: e.target.value as Incident['status'] } })}>
                <MenuItem value="open">open</MenuItem>
                <MenuItem value="investigating">investigating</MenuItem>
                <MenuItem value="mitigating">mitigating</MenuItem>
                <MenuItem value="resolved">resolved</MenuItem>
              </TextField>
              <TextField select label="Severity" value={edit.draft.severity} onChange={(e) => setEdit({ ...edit, draft: { ...edit.draft, severity: e.target.value as Incident['severity'] } })}>
                <MenuItem value="sev1">sev1</MenuItem>
                <MenuItem value="sev2">sev2</MenuItem>
                <MenuItem value="sev3">sev3</MenuItem>
                <MenuItem value="sev4">sev4</MenuItem>
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
            disabled={!edit || updateIncident.isPending}
            onClick={() => {
              if (!edit) return
              updateIncident.mutate({ id: edit.id, patch: edit.draft })
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
