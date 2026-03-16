/**
 * Reports builder UI.
 *
 * This page:
 * - Defines report metadata (entity, columns, filters)
 * - Calls backend preview/export/share endpoints
 * - Supports CSV/Excel/Word/PDF export via backend
 */
import { Add, DownloadOutlined, EmailOutlined, VisibilityOutlined } from '@mui/icons-material'
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, MenuItem, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { api } from '../api/apiClient'
import type { Paginated, ReportDefinition } from '../api/types'

type FilterRow = { field: string; op: 'eq' | 'contains' | 'gte' | 'lte' | 'in'; value: string }
type Draft = { name: string; entity_type: string; columnsCsv: string; filters: FilterRow[] }

const entityOptions = ['account', 'contact', 'campaign', 'lead', 'opportunity', 'case', 'product', 'incident']

export function ReportsPage() {
  const qc = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [edit, setEdit] = useState<{ id: number; draft: Draft } | null>(null)
  const [preview, setPreview] = useState<{ id: number; name: string; columns: string[]; rows: Array<Record<string, string>> } | null>(null)
  const [share, setShare] = useState<{ id: number; name: string; to: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const reportsQuery = useQuery({
    queryKey: ['contenthub', 'reports'],
    queryFn: async () => (await api.get<Paginated<ReportDefinition>>('/api/contenthub/reports/', { params: { ordering: '-updated_at', page_size: 200 } })).data,
  })

  const reports = useMemo(() => reportsQuery.data?.results ?? [], [reportsQuery.data?.results])

  const createMutation = useMutation({
    mutationFn: async (draft: Draft) => {
      const payload = toPayload(draft)
      return (await api.post<ReportDefinition>('/api/contenthub/reports/', payload)).data
    },
    onSuccess: async () => {
      setCreateOpen(false)
      await qc.invalidateQueries({ queryKey: ['contenthub', 'reports'] })
    },
    onError: () => setError('Failed to create report.'),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, draft }: { id: number; draft: Draft }) => {
      const payload = toPayload(draft)
      return (await api.patch<ReportDefinition>(`/api/contenthub/reports/${id}/`, payload)).data
    },
    onSuccess: async () => {
      setEdit(null)
      await qc.invalidateQueries({ queryKey: ['contenthub', 'reports'] })
    },
    onError: () => setError('Failed to update report.'),
  })

  const previewMutation = useMutation({
    mutationFn: async (id: number) => (await api.get<{ columns: string[]; rows: Array<Record<string, string>> }>(`/api/contenthub/reports/${id}/preview/`)).data,
    onSuccess: (data, id) => {
      const r = reports.find((x) => x.id === id)
      setPreview({ id, name: r?.name ?? `Report ${id}`, columns: data.columns, rows: data.rows })
    },
  })

  const shareMutation = useMutation({
    mutationFn: async ({ id, to }: { id: number; to: string }) =>
      (await api.post(`/api/contenthub/reports/${id}/share/`, { to, base_url: window.location.origin })).data,
    onSuccess: () => setShare(null),
    onError: () => setError('Failed to share report.'),
  })

  const [draft, setDraft] = useState<Draft>({ name: '', entity_type: 'lead', columnsCsv: 'id,created_at', filters: [] })

  const openEdit = (r: ReportDefinition) => {
    const parsedFilters: FilterRow[] = (r.filters ?? []).map((f) => {
      const obj = typeof f === 'object' && f !== null ? (f as Record<string, unknown>) : {}
      const field = typeof obj.field === 'string' ? obj.field : ''
      const op = (obj.op === 'eq' || obj.op === 'contains' || obj.op === 'gte' || obj.op === 'lte' || obj.op === 'in' ? obj.op : 'eq') as FilterRow['op']
      const value = JSON.stringify(obj.value ?? '')
      return { field, op, value }
    })
    setEdit({
      id: r.id,
      draft: {
        name: r.name,
        entity_type: r.entity_type,
        columnsCsv: (r.columns ?? []).join(','),
        filters: parsedFilters,
      },
    })
  }

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }} sx={{ mb: 2 }}>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h5">Reports</Typography>
          <Typography variant="body2" sx={{ opacity: 0.8, mt: 0.5 }}>
            Build dynamic reports with filters, preview, save, share, and export.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => {
            setDraft({ name: '', entity_type: 'lead', columnsCsv: 'id,created_at', filters: [] })
            setCreateOpen(true)
          }}
        >
          New Report
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
            <TableCell>Name</TableCell>
            <TableCell>Entity</TableCell>
            <TableCell>Updated</TableCell>
            <TableCell />
          </TableRow>
        </TableHead>
        <TableBody>
          {reports.map((r) => (
            <TableRow key={r.id} hover>
              <TableCell sx={{ fontWeight: 900 }}>{r.name}</TableCell>
              <TableCell>{r.entity_type}</TableCell>
              <TableCell>{r.updated_at.slice(0, 19).replace('T', ' ')}</TableCell>
              <TableCell align="right">
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                  <Button size="small" startIcon={<VisibilityOutlined />} onClick={() => previewMutation.mutate(r.id)}>
                    Preview
                  </Button>
                  <Button size="small" startIcon={<EmailOutlined />} onClick={() => setShare({ id: r.id, name: r.name, to: '' })}>
                    Share
                  </Button>
                  <Button size="small" startIcon={<DownloadOutlined />} onClick={() => window.open(`/api/contenthub/reports/${r.id}/export/?format=csv`, '_blank')}>
                    CSV
                  </Button>
                  <Button size="small" onClick={() => window.open(`/api/contenthub/reports/${r.id}/export/?format=excel`, '_blank')}>
                    Excel
                  </Button>
                  <Button size="small" onClick={() => window.open(`/api/contenthub/reports/${r.id}/export/?format=word`, '_blank')}>
                    Word
                  </Button>
                  <Button size="small" onClick={() => window.open(`/api/contenthub/reports/${r.id}/export/?format=pdf`, '_blank')}>
                    PDF
                  </Button>
                  <Button size="small" onClick={() => openEdit(r)}>
                    Edit
                  </Button>
                </Stack>
              </TableCell>
            </TableRow>
          ))}
          {!reportsQuery.isLoading && reports.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4}>No reports</TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>New Report</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <ReportEditor draft={draft} setDraft={setDraft} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={createMutation.isPending || !draft.name} onClick={() => createMutation.mutate(draft)}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!edit} onClose={() => setEdit(null)} fullWidth maxWidth="md">
        <DialogTitle>Edit Report</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {edit ? <ReportEditor draft={edit.draft} setDraft={(d) => setEdit({ ...edit, draft: d })} /> : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEdit(null)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!edit || updateMutation.isPending}
            onClick={() => {
              if (!edit) return
              updateMutation.mutate({ id: edit.id, draft: edit.draft })
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {preview ? (
        <Dialog open={true} onClose={() => setPreview(null)} fullWidth maxWidth="lg">
          <DialogTitle>{preview.name} preview</DialogTitle>
          <DialogContent>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {preview.columns.map((c) => (
                    <TableCell key={c}>{c}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {preview.rows.map((r, idx) => (
                  <TableRow key={idx}>
                    {preview.columns.map((c) => (
                      <TableCell key={c}>{r[c]}</TableCell>
                    ))}
                  </TableRow>
                ))}
                {preview.rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={preview.columns.length}>No rows</TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPreview(null)}>Close</Button>
          </DialogActions>
        </Dialog>
      ) : null}

      {share ? (
        <Dialog open={true} onClose={() => setShare(null)} fullWidth maxWidth="sm">
          <DialogTitle>Share report</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              Sends a link to the exported report to the recipients.
            </Typography>
            <TextField label="To (comma-separated emails)" value={share.to} onChange={(e) => setShare({ ...share, to: e.target.value })} />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShare(null)}>Cancel</Button>
            <Button variant="contained" disabled={!share.to || shareMutation.isPending} onClick={() => shareMutation.mutate({ id: share.id, to: share.to })}>
              Send
            </Button>
          </DialogActions>
        </Dialog>
      ) : null}
    </Box>
  )
}

function ReportEditor({ draft, setDraft }: { draft: Draft; setDraft: (d: Draft) => void }) {
  return (
    <Box>
      <Stack spacing={2}>
        <TextField label="Name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        <TextField select label="Entity" value={draft.entity_type} onChange={(e) => setDraft({ ...draft, entity_type: e.target.value })}>
          {entityOptions.map((e) => (
            <MenuItem key={e} value={e}>
              {e}
            </MenuItem>
          ))}
        </TextField>
        <TextField label="Columns (comma-separated, supports nested like owner.username)" value={draft.columnsCsv} onChange={(e) => setDraft({ ...draft, columnsCsv: e.target.value })} />

        <Divider />

        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Filters</Typography>
          <Button
            size="small"
            onClick={() => setDraft({ ...draft, filters: [...draft.filters, { field: '', op: 'eq', value: '' }] })}
          >
            Add filter
          </Button>
        </Stack>

        {draft.filters.map((f, idx) => (
          <Stack key={idx} direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', md: 'center' }}>
            <TextField
              label="Field"
              value={f.field}
              onChange={(e) => setDraft({ ...draft, filters: draft.filters.map((x, i) => (i === idx ? { ...x, field: e.target.value } : x)) })}
              sx={{ flexGrow: 1 }}
            />
            <TextField
              select
              label="Op"
              value={f.op}
              onChange={(e) => setDraft({ ...draft, filters: draft.filters.map((x, i) => (i === idx ? { ...x, op: e.target.value as FilterRow['op'] } : x)) })}
              sx={{ width: 160 }}
            >
              <MenuItem value="eq">eq</MenuItem>
              <MenuItem value="contains">contains</MenuItem>
              <MenuItem value="gte">gte</MenuItem>
              <MenuItem value="lte">lte</MenuItem>
              <MenuItem value="in">in</MenuItem>
            </TextField>
            <TextField
              label="Value (JSON)"
              value={f.value}
              onChange={(e) => setDraft({ ...draft, filters: draft.filters.map((x, i) => (i === idx ? { ...x, value: e.target.value } : x)) })}
              sx={{ flexGrow: 1 }}
            />
            <Button
              size="small"
              color="inherit"
              onClick={() => setDraft({ ...draft, filters: draft.filters.filter((_, i) => i !== idx) })}
              sx={{ alignSelf: { xs: 'flex-end', md: 'center' } }}
            >
              Remove
            </Button>
          </Stack>
        ))}
      </Stack>
    </Box>
  )
}

function toPayload(draft: Draft) {
  const columns = draft.columnsCsv
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => x.replaceAll(' ', ''))
  const filters = draft.filters
    .filter((f) => f.field && f.op)
    .map((f) => {
      let v: unknown = f.value
      try {
        v = JSON.parse(f.value)
      } catch {
        v = f.value
      }
      return { field: f.field, op: f.op, value: v }
    })
  return { name: draft.name, entity_type: draft.entity_type, columns, filters, is_shared: false }
}
