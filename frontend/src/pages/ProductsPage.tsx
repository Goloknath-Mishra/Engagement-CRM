import { Add } from '@mui/icons-material'
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '../api/apiClient'
import type { Paginated, Product } from '../api/types'
import { AttachmentsPanel } from '../components/AttachmentsPanel'
import { AuditTimelinePanel } from '../components/AuditTimelinePanel'

type ProductDraft = {
  sku: string
  name: string
  description: string
  active: boolean
  currency: string
  unit_price: string
  tax_rate: string
}

/** Product catalog management for use in cases and opportunity line items. */
export function ProductsPage() {
  const qc = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [edit, setEdit] = useState<{ id: number; draft: ProductDraft } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const productsQuery = useQuery({
    queryKey: ['products'],
    queryFn: async () => (await api.get<Paginated<Product>>('/api/products/')).data,
  })

  const createProduct = useMutation({
    mutationFn: async (draft: ProductDraft) => {
      const payload = {
        ...draft,
        unit_price: Number(draft.unit_price),
        tax_rate: Number(draft.tax_rate),
      }
      return (await api.post<Product>('/api/products/', payload)).data
    },
    onSuccess: async () => {
      setCreateOpen(false)
      await qc.invalidateQueries({ queryKey: ['products'] })
    },
    onError: () => setError('Failed to create product.'),
  })

  const updateProduct = useMutation({
    mutationFn: async ({ id, patch }: { id: number; patch: Partial<ProductDraft> }) => {
      const payload = {
        ...patch,
        unit_price: patch.unit_price !== undefined ? Number(patch.unit_price) : undefined,
        tax_rate: patch.tax_rate !== undefined ? Number(patch.tax_rate) : undefined,
      }
      return (await api.patch<Product>(`/api/products/${id}/`, payload)).data
    },
    onSuccess: async () => {
      setEdit(null)
      await qc.invalidateQueries({ queryKey: ['products'] })
    },
    onError: () => setError('Failed to update product.'),
  })

  const [draft, setDraft] = useState<ProductDraft>({
    sku: '',
    name: '',
    description: '',
    active: true,
    currency: 'USD',
    unit_price: '0',
    tax_rate: '0',
  })

  const products = productsQuery.data?.results ?? []
  const openEdit = (p: Product) => {
    setEdit({
      id: p.id,
      draft: {
        sku: p.sku,
        name: p.name,
        description: p.description ?? '',
        active: p.active,
        currency: p.currency,
        unit_price: String(p.unit_price ?? 0),
        tax_rate: String(p.tax_rate ?? 0),
      },
    })
  }

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }} sx={{ mb: 2 }}>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h5">Products</Typography>
          <Typography variant="body2" sx={{ opacity: 0.8, mt: 0.5 }}>
            Product catalog is editable and used by opportunity line items and cases.
          </Typography>
        </Box>
        <Button startIcon={<Add />} variant="contained" onClick={() => setCreateOpen(true)}>
          New Product
        </Button>
      </Stack>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>SKU</TableCell>
            <TableCell>Name</TableCell>
            <TableCell>Active</TableCell>
            <TableCell>Currency</TableCell>
            <TableCell align="right">Unit price</TableCell>
            <TableCell />
          </TableRow>
        </TableHead>
        <TableBody>
          {products.map((p) => (
            <TableRow key={p.id} hover>
              <TableCell sx={{ fontWeight: 850 }}>{p.sku}</TableCell>
              <TableCell>{p.name}</TableCell>
              <TableCell>
                <Box
                  sx={{
                    display: 'inline-flex',
                    px: 1,
                    py: 0.25,
                    borderRadius: 99,
                    fontSize: 12,
                    fontWeight: 850,
                    bgcolor: p.active ? 'success.main' : 'action.disabledBackground',
                    color: p.active ? 'common.white' : 'text.primary',
                  }}
                >
                  {p.active ? 'Active' : 'Inactive'}
                </Box>
              </TableCell>
              <TableCell>
                <Box sx={{ display: 'inline-flex', px: 1, py: 0.25, borderRadius: 99, fontSize: 12, fontWeight: 850, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
                  {p.currency}
                </Box>
              </TableCell>
              <TableCell align="right">{p.unit_price}</TableCell>
              <TableCell align="right">
                <Button size="small" onClick={() => openEdit(p)}>
                  Edit
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {!productsQuery.isLoading && products.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6}>No products</TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>New Product</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField label="SKU" value={draft.sku} onChange={(e) => setDraft({ ...draft, sku: e.target.value })} />
          <TextField label="Name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <TextField label="Description" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} multiline minRows={2} />
          <TextField select label="Active" value={draft.active ? 'yes' : 'no'} onChange={(e) => setDraft({ ...draft, active: e.target.value === 'yes' })}>
            <MenuItem value="yes">yes</MenuItem>
            <MenuItem value="no">no</MenuItem>
          </TextField>
          <TextField label="Currency" value={draft.currency} onChange={(e) => setDraft({ ...draft, currency: e.target.value })} />
          <TextField label="Unit price" type="number" value={draft.unit_price} onChange={(e) => setDraft({ ...draft, unit_price: e.target.value })} />
          <TextField label="Tax rate" type="number" value={draft.tax_rate} onChange={(e) => setDraft({ ...draft, tax_rate: e.target.value })} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={createProduct.isPending || !draft.sku || !draft.name} onClick={() => createProduct.mutate(draft)}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!edit} onClose={() => setEdit(null)} fullWidth maxWidth="md">
        <DialogTitle>Edit Product</DialogTitle>
        <DialogContent sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mt: 1 }}>
          {edit ? (
            <>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField label="SKU" value={edit.draft.sku} onChange={(e) => setEdit({ ...edit, draft: { ...edit.draft, sku: e.target.value } })} />
                <TextField label="Name" value={edit.draft.name} onChange={(e) => setEdit({ ...edit, draft: { ...edit.draft, name: e.target.value } })} />
                <TextField label="Description" value={edit.draft.description} onChange={(e) => setEdit({ ...edit, draft: { ...edit.draft, description: e.target.value } })} multiline minRows={2} />
                <TextField select label="Active" value={edit.draft.active ? 'yes' : 'no'} onChange={(e) => setEdit({ ...edit, draft: { ...edit.draft, active: e.target.value === 'yes' } })}>
                  <MenuItem value="yes">yes</MenuItem>
                  <MenuItem value="no">no</MenuItem>
                </TextField>
                <TextField label="Currency" value={edit.draft.currency} onChange={(e) => setEdit({ ...edit, draft: { ...edit.draft, currency: e.target.value } })} />
                <TextField label="Unit price" type="number" value={edit.draft.unit_price} onChange={(e) => setEdit({ ...edit, draft: { ...edit.draft, unit_price: e.target.value } })} />
                <TextField label="Tax rate" type="number" value={edit.draft.tax_rate} onChange={(e) => setEdit({ ...edit, draft: { ...edit.draft, tax_rate: e.target.value } })} />
              </Box>
              <Stack spacing={2}>
                <AttachmentsPanel entityType="product" entityId={edit.id} />
                <AuditTimelinePanel entityType="product" entityId={edit.id} />
              </Stack>
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
            disabled={!edit || updateProduct.isPending}
            onClick={() => {
              if (!edit) return
              updateProduct.mutate({ id: edit.id, patch: edit.draft })
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
