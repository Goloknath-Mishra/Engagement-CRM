/**
 * Knowledge Articles CRUD.
 *
 * Articles can be linked to CRM records (Cases, Leads, Campaigns) via RelatedKnowledgePanel.
 */
import { Add } from '@mui/icons-material'
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { api } from '../api/apiClient'
import type { KnowledgeArticle, Paginated } from '../api/types'

type Draft = Pick<KnowledgeArticle, 'title' | 'summary' | 'content' | 'tags' | 'status'>

export function KnowledgeArticlesPage() {
  const qc = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [edit, setEdit] = useState<{ id: number; draft: Draft } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const articlesQuery = useQuery({
    queryKey: ['contenthub', 'articles'],
    queryFn: async () => (await api.get<Paginated<KnowledgeArticle>>('/api/contenthub/articles/', { params: { ordering: '-updated_at', page_size: 200 } })).data,
  })

  const createMutation = useMutation({
    mutationFn: async (draft: Draft) => (await api.post<KnowledgeArticle>('/api/contenthub/articles/', draft)).data,
    onSuccess: async () => {
      setCreateOpen(false)
      await qc.invalidateQueries({ queryKey: ['contenthub', 'articles'] })
    },
    onError: () => setError('Failed to create article.'),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: number; patch: Partial<Draft> }) => (await api.patch<KnowledgeArticle>(`/api/contenthub/articles/${id}/`, patch)).data,
    onSuccess: async () => {
      setEdit(null)
      await qc.invalidateQueries({ queryKey: ['contenthub', 'articles'] })
    },
    onError: () => setError('Failed to update article.'),
  })

  const [draft, setDraft] = useState<Draft>({ title: '', summary: '', content: '', tags: '', status: 'draft' })

  const articles = useMemo(() => articlesQuery.data?.results ?? [], [articlesQuery.data?.results])

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }} sx={{ mb: 2 }}>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h5">Knowledge Articles</Typography>
          <Typography variant="body2" sx={{ opacity: 0.8, mt: 0.5 }}>
            Create and link articles to Cases, Leads, and Campaigns.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => {
            setDraft({ title: '', summary: '', content: '', tags: '', status: 'draft' })
            setCreateOpen(true)
          }}
        >
          New Article
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
            <TableCell>Title</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Tags</TableCell>
            <TableCell>Updated</TableCell>
            <TableCell />
          </TableRow>
        </TableHead>
        <TableBody>
          {articles.map((a) => (
            <TableRow key={a.id} hover>
              <TableCell sx={{ fontWeight: 850 }}>{a.title}</TableCell>
              <TableCell>{a.status}</TableCell>
              <TableCell>{a.tags || '—'}</TableCell>
              <TableCell>{a.updated_at.slice(0, 19).replace('T', ' ')}</TableCell>
              <TableCell align="right">
                <Button
                  size="small"
                  onClick={() =>
                    setEdit({
                      id: a.id,
                      draft: { title: a.title, summary: a.summary ?? '', content: a.content ?? '', tags: a.tags ?? '', status: a.status },
                    })
                  }
                >
                  Edit
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {!articlesQuery.isLoading && articles.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5}>No articles</TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>New Knowledge Article</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField label="Title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          <TextField label="Summary" value={draft.summary} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} />
          <TextField label="Tags (comma-separated)" value={draft.tags} onChange={(e) => setDraft({ ...draft, tags: e.target.value })} />
          <TextField select label="Status" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as Draft['status'] })}>
            <MenuItem value="draft">draft</MenuItem>
            <MenuItem value="published">published</MenuItem>
            <MenuItem value="archived">archived</MenuItem>
          </TextField>
          <TextField label="Content" value={draft.content} onChange={(e) => setDraft({ ...draft, content: e.target.value })} multiline minRows={8} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={createMutation.isPending || !draft.title || !draft.content} onClick={() => createMutation.mutate(draft)}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!edit} onClose={() => setEdit(null)} fullWidth maxWidth="md">
        <DialogTitle>Edit Knowledge Article</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {edit ? (
            <>
              <TextField label="Title" value={edit.draft.title} onChange={(e) => setEdit({ ...edit, draft: { ...edit.draft, title: e.target.value } })} />
              <TextField label="Summary" value={edit.draft.summary} onChange={(e) => setEdit({ ...edit, draft: { ...edit.draft, summary: e.target.value } })} />
              <TextField label="Tags (comma-separated)" value={edit.draft.tags} onChange={(e) => setEdit({ ...edit, draft: { ...edit.draft, tags: e.target.value } })} />
              <TextField
                select
                label="Status"
                value={edit.draft.status}
                onChange={(e) => setEdit({ ...edit, draft: { ...edit.draft, status: e.target.value as Draft['status'] } })}
              >
                <MenuItem value="draft">draft</MenuItem>
                <MenuItem value="published">published</MenuItem>
                <MenuItem value="archived">archived</MenuItem>
              </TextField>
              <TextField label="Content" value={edit.draft.content} onChange={(e) => setEdit({ ...edit, draft: { ...edit.draft, content: e.target.value } })} multiline minRows={8} />
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
