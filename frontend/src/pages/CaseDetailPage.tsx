import { Alert, Box, Button, Card, CardContent, Divider, MenuItem, Stack, Step, StepLabel, Stepper, TextField, Typography } from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useNow } from '../app/useNow'
import { api } from '../api/apiClient'
import type { Case, Contact, Paginated, Product } from '../api/types'
import { AttachmentsPanel } from '../components/AttachmentsPanel'
import { AuditTimelinePanel } from '../components/AuditTimelinePanel'
import { MeterGauge } from '../components/MeterGauge'
import { RelatedKnowledgePanel } from '../components/RelatedKnowledgePanel'
import { TemplatesUsePanel } from '../components/TemplatesUsePanel'
import { ValueChip } from '../components/ValueChip'

type CasePatch = {
  subject?: string
  description?: string
  status?: Case['status']
  priority?: Case['priority']
  contact?: number
  product?: number | null
}

/** Case record view with editable fields, SLA indicators, and related entity selectors. */
export function CaseDetailPage() {
  const { id } = useParams()
  const caseId = Number(id)
  const nowMs = useNow(1000)
  const qc = useQueryClient()
  const navigate = useNavigate()

  const caseQuery = useQuery({
    queryKey: ['case', caseId],
    queryFn: async () => (await api.get<Case>(`/api/cases/${caseId}/`)).data,
    enabled: Number.isFinite(caseId),
  })

  const contactsQuery = useQuery({
    queryKey: ['contacts', 'all'],
    queryFn: async () => (await api.get<Paginated<Contact>>('/api/contacts/')).data,
  })

  const productsQuery = useQuery({
    queryKey: ['products', 'all'],
    queryFn: async () => (await api.get<Paginated<Product>>('/api/products/')).data,
  })

  const updateCase = useMutation({
    mutationFn: async (patch: CasePatch) => (await api.patch<Case>(`/api/cases/${caseId}/`, patch)).data,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['case', caseId] })
      await qc.invalidateQueries({ queryKey: ['cases'] })
    },
  })

  const c = caseQuery.data
  const contacts = useMemo(() => contactsQuery.data?.results ?? [], [contactsQuery.data?.results])
  const products = useMemo(() => productsQuery.data?.results ?? [], [productsQuery.data?.results])
  const contactById = useMemo(() => new Map(contacts.map((x) => [x.id, x])), [contacts])
  const productById = useMemo(() => new Map(products.map((x) => [x.id, x])), [products])

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<CasePatch>({})

  if (!Number.isFinite(caseId)) return <Alert severity="error">Invalid case id.</Alert>
  if (caseQuery.isLoading) return <Typography>Loading…</Typography>
  if (!c) return <Alert severity="error">Case not found.</Alert>

  const remainingSeconds = Math.max(0, Math.floor((new Date(c.sla_due_at).getTime() - nowMs) / 1000))
  const pct = Math.max(0, Math.min(100, (remainingSeconds / (c.sla_minutes * 60)) * 100))

  const contact = contactById.get(c.contact)
  const product = c.product ? productById.get(c.product) : null
  const statusSteps: Case['status'][] = ['new', 'in_progress', 'waiting_on_customer', 'closed']
  const activeStep = Math.max(0, statusSteps.indexOf(c.status))

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'flex-start' }}>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h5">{c.subject}</Typography>
          <Typography variant="body2" sx={{ opacity: 0.85, mt: 0.5 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <span>Status</span>
              <ValueChip kind="caseStatus" value={c.status} />
              <span>Priority</span>
              <ValueChip kind="casePriority" value={c.priority} />
              <span>Contact</span>
              <span>{contact ? `${contact.first_name} ${contact.last_name}` : `#${c.contact}`}</span>
              <span>Product</span>
              <span>{product ? `${product.sku}` : c.product ? `#${c.product}` : '—'}</span>
            </Stack>
          </Typography>
        </Box>
        <Card sx={{ minWidth: 360 }}>
          <CardContent>
            <MeterGauge value={pct} label="SLA" sublabel={c.sla_breached ? 'Breached' : formatCountdown(remainingSeconds)} />
          </CardContent>
        </Card>
      </Stack>

      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Typography variant="subtitle2" sx={{ opacity: 0.8, mb: 1 }}>
            Case Progress
          </Typography>
          <Stepper activeStep={activeStep} alternativeLabel>
            <Step>
              <StepLabel>New</StepLabel>
            </Step>
            <Step>
              <StepLabel>In Progress</StepLabel>
            </Step>
            <Step>
              <StepLabel>Waiting</StepLabel>
            </Step>
            <Step>
              <StepLabel>Closed</StepLabel>
            </Step>
          </Stepper>
        </CardContent>
      </Card>

      <Divider sx={{ my: 3 }} />

      {editing ? (
        <Card>
          <CardContent>
            <Typography variant="h6">Edit</Typography>
            <Divider sx={{ my: 2 }} />
            <Stack spacing={2}>
              <TextField label="Subject" value={draft.subject ?? c.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} />
              <TextField
                label="Description"
                value={draft.description ?? c.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                multiline
                minRows={3}
              />
              <TemplatesUsePanel
                onInsert={(body) => {
                  const current = (draft.description ?? c.description ?? '').trim()
                  const next = current ? `${current}\n\n${body}` : body
                  setDraft({ ...draft, description: next })
                }}
              />
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <TextField
                  select
                  label="Status"
                  value={draft.status ?? c.status}
                  onChange={(e) => setDraft({ ...draft, status: e.target.value as Case['status'] })}
                  sx={{ flexGrow: 1 }}
                >
                  <MenuItem value="new">new</MenuItem>
                  <MenuItem value="in_progress">in_progress</MenuItem>
                  <MenuItem value="waiting_on_customer">waiting_on_customer</MenuItem>
                  <MenuItem value="closed">closed</MenuItem>
                </TextField>
                <TextField
                  select
                  label="Priority"
                  value={draft.priority ?? c.priority}
                  onChange={(e) => setDraft({ ...draft, priority: e.target.value as Case['priority'] })}
                  sx={{ flexGrow: 1 }}
                >
                  <MenuItem value="low">low</MenuItem>
                  <MenuItem value="medium">medium</MenuItem>
                  <MenuItem value="high">high</MenuItem>
                  <MenuItem value="urgent">urgent</MenuItem>
                </TextField>
              </Stack>
              <TextField
                select
                label="Contact"
                value={draft.contact ?? c.contact}
                onChange={(e) => setDraft({ ...draft, contact: Number(e.target.value) })}
              >
                {contacts.map((x) => (
                  <MenuItem key={x.id} value={x.id}>
                    {x.first_name} {x.last_name} · {x.account_name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Product"
                value={draft.product ?? c.product ?? ''}
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

              <Stack direction="row" spacing={1.5} justifyContent="flex-end">
                <Button
                  onClick={() => {
                    setEditing(false)
                    setDraft({})
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  disabled={updateCase.isPending}
                  onClick={async () => {
                    await updateCase.mutateAsync(draft)
                    setEditing(false)
                    setDraft({})
                  }}
                >
                  Save
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">Details</Typography>
              <Stack direction="row" spacing={1}>
                <Button variant="outlined" onClick={() => navigate(`/contacts/${c.contact}/cases`)}>
                  Contact cases
                </Button>
                <Button variant="contained" onClick={() => setEditing(true)}>
                  Edit
                </Button>
              </Stack>
            </Stack>
            <Divider sx={{ my: 2 }} />
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {c.description || '—'}
            </Typography>
          </CardContent>
        </Card>
      )}

      <Card sx={{ mt: 2 }}>
        <CardContent>
          <AttachmentsPanel entityType="case" entityId={c.id} />
        </CardContent>
      </Card>

      <Card sx={{ mt: 2 }}>
        <CardContent>
          <RelatedKnowledgePanel entityType="case" entityId={c.id} />
        </CardContent>
      </Card>

      <Card sx={{ mt: 2 }}>
        <CardContent>
          <AuditTimelinePanel entityType="case" entityId={c.id} />
        </CardContent>
      </Card>
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
