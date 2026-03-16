/**
 * Templates management.
 *
 * Types:
 * - email, signature, mailmerge, word
 *
 * Templates are used inside operational flows (example: insert into Case description).
 */
import { Add } from '@mui/icons-material'
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, Tab, Tabs, TextField, Typography } from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState, type SyntheticEvent } from 'react'
import { api } from '../api/apiClient'
import type { Paginated, Template } from '../api/types'

type Draft = Pick<Template, 'name' | 'type' | 'subject' | 'body' | 'is_active'>

export function TemplatesPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<Template['type']>('email')
  const [createOpen, setCreateOpen] = useState(false)
  const [edit, setEdit] = useState<{ id: number; draft: Draft } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const templatesQuery = useQuery({
    queryKey: ['contenthub', 'templates', tab],
    queryFn: async () => (await api.get<Paginated<Template>>('/api/contenthub/templates/', { params: { type: tab, ordering: '-updated_at', page_size: 200 } })).data,
  })

  const createMutation = useMutation({
    mutationFn: async (draft: Draft) => (await api.post<Template>('/api/contenthub/templates/', draft)).data,
    onSuccess: async () => {
      setCreateOpen(false)
      await qc.invalidateQueries({ queryKey: ['contenthub', 'templates', tab] })
    },
    onError: () => setError('Failed to create template.'),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: number; patch: Partial<Draft> }) => (await api.patch<Template>(`/api/contenthub/templates/${id}/`, patch)).data,
    onSuccess: async () => {
      setEdit(null)
      await qc.invalidateQueries({ queryKey: ['contenthub', 'templates', tab] })
    },
    onError: () => setError('Failed to update template.'),
  })

  const templates = useMemo(() => templatesQuery.data?.results ?? [], [templatesQuery.data?.results])
  const [draft, setDraft] = useState<Draft>({ name: '', type: tab, subject: '', body: '', is_active: true })

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }} sx={{ mb: 2 }}>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h5">Templates</Typography>
          <Typography variant="body2" sx={{ opacity: 0.8, mt: 0.5 }}>
            Email templates, signatures, mail merge, and Word templates.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => {
            setDraft({ name: '', type: tab, subject: '', body: '', is_active: true })
            setCreateOpen(true)
          }}
        >
          New Template
        </Button>
      </Stack>

      <Tabs value={tab} onChange={(_: SyntheticEvent, v: Template['type']) => setTab(v)} sx={{ mb: 2 }}>
        <Tab value="email" label="Email" />
        <Tab value="signature" label="Signature" />
        <Tab value="mailmerge" label="Mail merge" />
        <Tab value="word" label="Word" />
      </Tabs>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
        {templates.map((t) => (
          <Box
            key={t.id}
            sx={{
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              p: 2,
              cursor: 'pointer',
              bgcolor: t.is_active ? 'background.paper' : 'action.disabledBackground',
            }}
            onClick={() => setEdit({ id: t.id, draft: { name: t.name, type: t.type, subject: t.subject ?? '', body: t.body ?? '', is_active: t.is_active } })}
          >
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
              <Typography sx={{ fontWeight: 900 }}>{t.name}</Typography>
              <Box sx={{ display: 'inline-flex', px: 1, py: 0.25, borderRadius: 99, fontSize: 12, fontWeight: 850, bgcolor: t.is_active ? 'success.main' : 'warning.main', color: 'common.white' }}>
                {t.is_active ? 'Active' : 'Inactive'}
              </Box>
            </Stack>
            <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mt: 0.5 }}>
              {t.type.toUpperCase()} · Updated {t.updated_at.slice(0, 10)}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.85, mt: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {t.subject || '—'}
            </Typography>
          </Box>
        ))}
        {!templatesQuery.isLoading && templates.length === 0 ? <Typography>No templates</Typography> : null}
      </Box>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>New Template</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField label="Name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <TextField select label="Type" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as Template['type'] })}>
            <MenuItem value="email">email</MenuItem>
            <MenuItem value="signature">signature</MenuItem>
            <MenuItem value="mailmerge">mailmerge</MenuItem>
            <MenuItem value="word">word</MenuItem>
          </TextField>
          <TextField label="Subject" value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} />
          <TextField label="Body" value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} multiline minRows={10} />
          <TextField select label="Active" value={draft.is_active ? 'yes' : 'no'} onChange={(e) => setDraft({ ...draft, is_active: e.target.value === 'yes' })}>
            <MenuItem value="yes">yes</MenuItem>
            <MenuItem value="no">no</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={createMutation.isPending || !draft.name || !draft.body} onClick={() => createMutation.mutate(draft)}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!edit} onClose={() => setEdit(null)} fullWidth maxWidth="md">
        <DialogTitle>Edit Template</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {edit ? (
            <>
              <TextField label="Name" value={edit.draft.name} onChange={(e) => setEdit({ ...edit, draft: { ...edit.draft, name: e.target.value } })} />
              <TextField select label="Type" value={edit.draft.type} onChange={(e) => setEdit({ ...edit, draft: { ...edit.draft, type: e.target.value as Template['type'] } })}>
                <MenuItem value="email">email</MenuItem>
                <MenuItem value="signature">signature</MenuItem>
                <MenuItem value="mailmerge">mailmerge</MenuItem>
                <MenuItem value="word">word</MenuItem>
              </TextField>
              <TextField label="Subject" value={edit.draft.subject} onChange={(e) => setEdit({ ...edit, draft: { ...edit.draft, subject: e.target.value } })} />
              <TextField label="Body" value={edit.draft.body} onChange={(e) => setEdit({ ...edit, draft: { ...edit.draft, body: e.target.value } })} multiline minRows={10} />
              <TextField
                select
                label="Active"
                value={edit.draft.is_active ? 'yes' : 'no'}
                onChange={(e) => setEdit({ ...edit, draft: { ...edit.draft, is_active: e.target.value === 'yes' } })}
              >
                <MenuItem value="yes">yes</MenuItem>
                <MenuItem value="no">no</MenuItem>
              </TextField>
            </>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEdit(null)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!edit || updateMutation.isPending}
            onClick={() => {
              if (!edit) return
              updateMutation.mutate({ id: edit.id, patch: edit.draft })
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
