import { Add } from '@mui/icons-material'
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useNow } from '../app/useNow'
import { api } from '../api/apiClient'
import type { Case, Contact, Paginated, Product } from '../api/types'

type CaseDraft = {
  subject: string
  description: string
  status: Case['status']
  priority: Case['priority']
  product: number | null
}

/** Contact-scoped case list with SLA countdown and click-through to case detail. */
export function ContactCasesPage() {
  const { id } = useParams()
  const contactId = Number(id)
  const qc = useQueryClient()
  const navigate = useNavigate()
  const nowMs = useNow(1000)
  const [createOpen, setCreateOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const contactQuery = useQuery({
    queryKey: ['contact', contactId],
    queryFn: async () => (await api.get<Contact>(`/api/contacts/${contactId}/`)).data,
    enabled: Number.isFinite(contactId),
  })

  const casesQuery = useQuery({
    queryKey: ['contact', contactId, 'cases'],
    queryFn: async () => (await api.get<Paginated<Case>>(`/api/contacts/${contactId}/cases/`)).data,
    enabled: Number.isFinite(contactId),
  })

  const productsQuery = useQuery({
    queryKey: ['products'],
    queryFn: async () => (await api.get<Paginated<Product>>('/api/products/')).data,
  })

  const createCase = useMutation({
    mutationFn: async (draft: CaseDraft) => {
      const payload = { ...draft, product: draft.product || null }
      return (await api.post<Case>(`/api/contacts/${contactId}/cases/`, payload)).data
    },
    onSuccess: async () => {
      setCreateOpen(false)
      await qc.invalidateQueries({ queryKey: ['contact', contactId, 'cases'] })
    },
    onError: () => setError('Failed to create case.'),
  })

  const [draft, setDraft] = useState<CaseDraft>({
    subject: '',
    description: '',
    status: 'new',
    priority: 'medium',
    product: null,
  })

  const cases = casesQuery.data?.results ?? []
  const products = productsQuery.data?.results ?? []
  const productById = new Map(products.map((p) => [p.id, p]))
  const contact = contactQuery.data

  if (!Number.isFinite(contactId)) {
    return <Alert severity="error">Invalid contact id.</Alert>
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5">
          Cases {contact ? `· ${contact.first_name} ${contact.last_name}` : ''}
        </Typography>
        <Button startIcon={<Add />} variant="contained" onClick={() => setCreateOpen(true)}>
          New Case
        </Button>
      </Box>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Subject</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Priority</TableCell>
            <TableCell>Product</TableCell>
            <TableCell align="right">SLA</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {cases.map((c) => {
            const product = c.product ? productById.get(c.product) : null
            const remaining = Math.max(0, Math.floor((new Date(c.sla_due_at).getTime() - nowMs) / 1000))
            return (
              <TableRow key={c.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/cases/${c.id}`)}>
              <TableCell>{c.subject}</TableCell>
              <TableCell>{c.status}</TableCell>
              <TableCell>{c.priority}</TableCell>
              <TableCell>{product ? `${product.sku}` : c.product ? `#${c.product}` : '—'}</TableCell>
              <TableCell align="right">{formatCountdown(remaining)}</TableCell>
            </TableRow>
            )
          })}
          {!casesQuery.isLoading && cases.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5}>No cases</TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>

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
            label="Product"
            value={draft.product ?? 0}
            onChange={(e) => setDraft({ ...draft, product: Number(e.target.value) || null })}
          >
            <MenuItem value={0}>None</MenuItem>
            {products.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.sku} · {p.name}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={createCase.isPending || !draft.subject} onClick={() => createCase.mutate(draft)}>
            Create
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
