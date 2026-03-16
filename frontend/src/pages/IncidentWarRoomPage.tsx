import { Send } from '@mui/icons-material'
import { Alert, Box, Button, Card, CardContent, Divider, IconButton, MenuItem, Stack, TextField, Typography } from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/apiClient'
import type { Incident, IncidentMessage } from '../api/types'
import { useAuth } from '../auth/useAuth'
import { AttachmentsPanel } from '../components/AttachmentsPanel'
import { AuditTimelinePanel } from '../components/AuditTimelinePanel'
import { ValueChip } from '../components/ValueChip'

/** Incident "war room" view with live message timeline and posting. */
export function IncidentWarRoomPage() {
  const { id } = useParams()
  const incidentId = Number(id)
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [text, setText] = useState('')

  const incidentQuery = useQuery({
    queryKey: ['incident', incidentId],
    queryFn: async () => (await api.get<Incident>(`/api/incidents/${incidentId}/`)).data,
    enabled: Number.isFinite(incidentId),
  })

  const messagesQuery = useQuery({
    queryKey: ['incident', incidentId, 'messages'],
    queryFn: async () => (await api.get<IncidentMessage[]>(`/api/incidents/${incidentId}/messages/`)).data,
    enabled: Number.isFinite(incidentId),
    refetchInterval: 5000,
  })

  const updateIncident = useMutation({
    mutationFn: async (patch: Partial<Pick<Incident, 'status' | 'severity' | 'title' | 'description'>>) =>
      (await api.patch<Incident>(`/api/incidents/${incidentId}/`, patch)).data,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['incident', incidentId] })
      await qc.invalidateQueries({ queryKey: ['incidents'] })
    },
  })

  const postMessage = useMutation({
    mutationFn: async (message: string) =>
      (await api.post<IncidentMessage>(`/api/incidents/${incidentId}/messages/`, { message })).data,
    onSuccess: async () => {
      setText('')
      await qc.invalidateQueries({ queryKey: ['incident', incidentId, 'messages'] })
    },
  })

  const incident = incidentQuery.data
  const messages = messagesQuery.data ?? []

  if (!Number.isFinite(incidentId)) return <Alert severity="error">Invalid incident id.</Alert>
  if (incidentQuery.isLoading) return <Typography>Loading…</Typography>
  if (!incident) return <Alert severity="error">Incident not found.</Alert>

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto' }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'flex-start' }}>
        <Box sx={{ flexGrow: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap' }}>
            <Typography variant="h5">{incident.title}</Typography>
            <ValueChip kind="incidentSeverity" value={incident.severity} />
            <ValueChip kind="incidentStatus" value={incident.status} />
          </Stack>
          <Typography variant="body2" sx={{ opacity: 0.85, mt: 0.75, whiteSpace: 'pre-wrap' }}>
            {incident.description || '—'}
          </Typography>
        </Box>
        <Card sx={{ minWidth: 340 }}>
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 850 }}>
              Incident controls
            </Typography>
            <Divider sx={{ my: 1.5 }} />
            <Stack spacing={2}>
              <TextField
                size="small"
                select
                label="Status"
                value={incident.status}
                onChange={(e) => updateIncident.mutate({ status: e.target.value as Incident['status'] })}
              >
                <MenuItem value="open">open</MenuItem>
                <MenuItem value="investigating">investigating</MenuItem>
                <MenuItem value="mitigating">mitigating</MenuItem>
                <MenuItem value="resolved">resolved</MenuItem>
              </TextField>
              <TextField
                size="small"
                select
                label="Severity"
                value={incident.severity}
                onChange={(e) => updateIncident.mutate({ severity: e.target.value as Incident['severity'] })}
              >
                <MenuItem value="sev1">sev1</MenuItem>
                <MenuItem value="sev2">sev2</MenuItem>
                <MenuItem value="sev3">sev3</MenuItem>
                <MenuItem value="sev4">sev4</MenuItem>
              </TextField>
              <Button variant="outlined" onClick={() => navigate('/incidents')}>
                Back to incidents
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Stack>

      <Divider sx={{ my: 3 }} />

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <AttachmentsPanel entityType="incident" entityId={incident.id} />
        </CardContent>
      </Card>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <AuditTimelinePanel entityType="incident" entityId={incident.id} />
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6">War Room</Typography>
          <Typography variant="body2" sx={{ opacity: 0.8, mt: 0.5 }}>
            Live timeline of updates and collaboration messages.
          </Typography>
          <Divider sx={{ my: 2 }} />
          <Box sx={{ height: 360, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 1.25 }}>
            {messages.map((m) => {
              const mine = user?.id && m.author.id === user.id
              return (
                <Box
                  key={m.id}
                  sx={{
                    alignSelf: mine ? 'flex-end' : 'flex-start',
                    maxWidth: '82%',
                    borderRadius: 3,
                    px: 1.75,
                    py: 1.25,
                    bgcolor: mine ? 'primary.main' : 'background.paper',
                    color: mine ? 'primary.contrastText' : 'text.primary',
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                    <Typography variant="caption" sx={{ opacity: 0.75 }}>
                      {m.author.username}
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.6 }}>
                      {m.created_at.slice(0, 19).replace('T', ' ')}
                    </Typography>
                  </Stack>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {m.message}
                  </Typography>
                </Box>
              )
            })}
            {messagesQuery.isLoading ? <Typography>Loading messages…</Typography> : null}
          </Box>

          <Divider sx={{ my: 2 }} />

          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              fullWidth
              placeholder="Post an update…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const v = text.trim()
                  if (!v) return
                  postMessage.mutate(v)
                }
              }}
            />
            <IconButton
              color="primary"
              disabled={!text.trim() || postMessage.isPending}
              onClick={() => {
                const v = text.trim()
                if (!v) return
                postMessage.mutate(v)
              }}
            >
              <Send />
            </IconButton>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  )
}
