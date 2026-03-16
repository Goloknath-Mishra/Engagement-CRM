import { Alert, Box, Button, Divider, MenuItem, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../api/apiClient'
import type { Contact, Opportunity, OpportunityLineItem, Paginated, Product } from '../api/types'
import { AttachmentsPanel } from '../components/AttachmentsPanel'
import { AuditTimelinePanel } from '../components/AuditTimelinePanel'
import { ValueChip } from '../components/ValueChip'

type ContactLinkDraft = {
  contact_id: number
  role: 'primary' | 'decision_maker' | 'influencer' | 'other'
}

type LineItemDraft = {
  product: number
  quantity: number
  unit_price: string
  discount_pct: string
}

/** Opportunity record view with line items, totals, and editable sales stages. */
export function OpportunityDetailPage() {
  const { id } = useParams()
  const opportunityId = Number(id)
  const qc = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  const opportunityQuery = useQuery({
    queryKey: ['opportunity', opportunityId],
    queryFn: async () => (await api.get<Opportunity>(`/api/opportunities/${opportunityId}/`)).data,
    enabled: Number.isFinite(opportunityId),
  })

  const contactsQuery = useQuery({
    queryKey: ['contacts'],
    queryFn: async () => (await api.get<Paginated<Contact>>('/api/contacts/')).data,
  })

  const productsQuery = useQuery({
    queryKey: ['products'],
    queryFn: async () => (await api.get<Paginated<Product>>('/api/products/')).data,
  })

  const addContact = useMutation({
    mutationFn: async (draft: ContactLinkDraft) => {
      return (await api.post(`/api/opportunities/${opportunityId}/contacts/`, draft)).data
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['opportunity', opportunityId] })
    },
    onError: () => setError('Failed to link contact.'),
  })

  const addLineItem = useMutation({
    mutationFn: async (draft: LineItemDraft) => {
      const payload = {
        ...draft,
        unit_price: Number(draft.unit_price),
        discount_pct: Number(draft.discount_pct),
      }
      return (await api.post<OpportunityLineItem>(`/api/opportunities/${opportunityId}/line_items/`, payload)).data
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['opportunity', opportunityId] })
    },
    onError: () => setError('Failed to add line item.'),
  })

  const contactOptions = contactsQuery.data?.results ?? []
  const productOptions = productsQuery.data?.results ?? []

  const [contactDraft, setContactDraft] = useState<ContactLinkDraft>({
    contact_id: 0,
    role: 'other',
  })

  const [lineDraft, setLineDraft] = useState<LineItemDraft>({
    product: 0,
    quantity: 1,
    unit_price: '0',
    discount_pct: '0',
  })

  const opportunity = opportunityQuery.data
  const contacts = opportunity?.contacts ?? []
  const lineItems = opportunity?.line_items ?? []

  const sum = lineItems.reduce((acc, li) => acc + Number(li.total), 0)
  const amountTotal = Number.isFinite(sum) ? sum.toFixed(2) : '0.00'

  if (!Number.isFinite(opportunityId)) {
    return <Alert severity="error">Invalid opportunity id.</Alert>
  }

  if (opportunityQuery.isLoading) {
    return <Typography>Loading…</Typography>
  }

  if (!opportunity) {
    return <Alert severity="error">Opportunity not found.</Alert>
  }

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 1 }}>
        {opportunity.name}
      </Typography>
      <Typography variant="body2" sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <span>Stage</span>
          <ValueChip kind="opportunityStage" value={opportunity.stage} />
          <span>Account</span>
          <span>{opportunity.account_name || '—'}</span>
          <span>Amount</span>
          <span>{opportunity.amount}</span>
        </Stack>
      </Typography>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}

      <Typography variant="h6" sx={{ mt: 2 }}>
        Contacts
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', my: 1 }}>
        <TextField
          select
          size="small"
          label="Contact"
          value={contactDraft.contact_id}
          onChange={(e) => setContactDraft({ ...contactDraft, contact_id: Number(e.target.value) })}
          sx={{ minWidth: 240 }}
        >
          <MenuItem value={0} disabled>
            Select…
          </MenuItem>
          {contactOptions.map((c) => (
            <MenuItem key={c.id} value={c.id}>
              {c.first_name} {c.last_name} ({c.account_name || '—'})
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Role"
          value={contactDraft.role}
          onChange={(e) => setContactDraft({ ...contactDraft, role: e.target.value as ContactLinkDraft['role'] })}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="primary">primary</MenuItem>
          <MenuItem value="decision_maker">decision_maker</MenuItem>
          <MenuItem value="influencer">influencer</MenuItem>
          <MenuItem value="other">other</MenuItem>
        </TextField>
        <Button variant="contained" disabled={addContact.isPending || contactDraft.contact_id === 0} onClick={() => addContact.mutate(contactDraft)}>
          Link
        </Button>
      </Box>

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Contact</TableCell>
            <TableCell>Role</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {contacts.map((l) => (
            <TableRow key={l.id}>
              <TableCell>
                {l.contact.first_name} {l.contact.last_name} ({l.contact.account_name || '—'})
              </TableCell>
              <TableCell>{l.role}</TableCell>
            </TableRow>
          ))}
          {contacts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={2}>No contacts linked</TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>

      <Divider sx={{ my: 3 }} />

      <Typography variant="h6">Products</Typography>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', my: 1 }}>
        <TextField
          select
          size="small"
          label="Product"
          value={lineDraft.product}
          onChange={(e) => setLineDraft({ ...lineDraft, product: Number(e.target.value) })}
          sx={{ minWidth: 260 }}
        >
          <MenuItem value={0} disabled>
            Select…
          </MenuItem>
          {productOptions.map((p) => (
            <MenuItem key={p.id} value={p.id}>
              {p.sku} · {p.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          size="small"
          label="Qty"
          type="number"
          value={lineDraft.quantity}
          onChange={(e) => setLineDraft({ ...lineDraft, quantity: Number(e.target.value) })}
          sx={{ width: 120 }}
        />
        <TextField
          size="small"
          label="Unit price"
          type="number"
          value={lineDraft.unit_price}
          onChange={(e) => setLineDraft({ ...lineDraft, unit_price: e.target.value })}
          sx={{ width: 160 }}
        />
        <TextField
          size="small"
          label="Discount %"
          type="number"
          value={lineDraft.discount_pct}
          onChange={(e) => setLineDraft({ ...lineDraft, discount_pct: e.target.value })}
          sx={{ width: 160 }}
        />
        <Button variant="contained" disabled={addLineItem.isPending || lineDraft.product === 0} onClick={() => addLineItem.mutate(lineDraft)}>
          Add
        </Button>
      </Box>

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Product</TableCell>
            <TableCell align="right">Qty</TableCell>
            <TableCell align="right">Unit</TableCell>
            <TableCell align="right">Discount</TableCell>
            <TableCell align="right">Total</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {lineItems.map((li) => (
            <TableRow key={li.id}>
              <TableCell>
                {li.product_sku} · {li.product_name}
              </TableCell>
              <TableCell align="right">{li.quantity}</TableCell>
              <TableCell align="right">{li.unit_price}</TableCell>
              <TableCell align="right">{li.discount_pct}%</TableCell>
              <TableCell align="right">{li.total}</TableCell>
            </TableRow>
          ))}
          {lineItems.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5}>No products added</TableCell>
            </TableRow>
          ) : null}
          {lineItems.length > 0 ? (
            <TableRow>
              <TableCell colSpan={4} align="right">
                Total
              </TableCell>
              <TableCell align="right">{amountTotal}</TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>

      <Divider sx={{ my: 3 }} />

      <AttachmentsPanel entityType="opportunity" entityId={opportunity.id} />

      <Divider sx={{ my: 3 }} />

      <AuditTimelinePanel entityType="opportunity" entityId={opportunity.id} />
    </Box>
  )
}
