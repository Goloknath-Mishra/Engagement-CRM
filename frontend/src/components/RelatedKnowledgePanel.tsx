import { Add } from '@mui/icons-material'
import { Alert, Box, Divider, IconButton, MenuItem, Stack, Typography } from '@mui/material'
import TextField from '@mui/material/TextField'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/apiClient'
import type { ArticleLink, KnowledgeArticle, Paginated } from '../api/types'

export function RelatedKnowledgePanel({ entityType, entityId }: { entityType: string; entityId: number }) {
  const qc = useQueryClient()
  const linksQuery = useQuery({
    queryKey: ['contenthub', 'article-links', entityType, entityId],
    enabled: Number.isFinite(entityId),
    queryFn: async () =>
      (
        await api.get<Paginated<ArticleLink>>('/api/contenthub/article-links/', {
          params: { entity_type: entityType, entity_id: entityId, ordering: '-created_at', page_size: 50 },
        })
      ).data,
  })

  const articlesQuery = useQuery({
    queryKey: ['contenthub', 'articles', 'published'],
    queryFn: async () =>
      (await api.get<Paginated<KnowledgeArticle>>('/api/contenthub/articles/', { params: { status: 'published', ordering: 'title', page_size: 200 } })).data,
  })

  const createLink = useMutation({
    mutationFn: async (articleId: number) =>
      (await api.post('/api/contenthub/article-links/', { article_id: articleId, entity_type: entityType, entity_id: entityId })).data,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['contenthub', 'article-links', entityType, entityId] })
    },
  })

  const deleteLink = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/api/contenthub/article-links/${id}/`)
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['contenthub', 'article-links', entityType, entityId] })
    },
  })

  const links = linksQuery.data?.results ?? []
  const articles = articlesQuery.data?.results ?? []
  const linked = new Set(links.map((l) => l.article.id))

  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
        <Typography variant="h6">Knowledge Articles</Typography>
        <TextField
          select
          size="small"
          label="Link article"
          value=""
          onChange={(e) => {
            const v = Number(e.target.value)
            if (!v) return
            createLink.mutate(v)
          }}
          sx={{ minWidth: 260 }}
        >
          <MenuItem value="" disabled>
            Select…
          </MenuItem>
          {articles
            .filter((a) => !linked.has(a.id))
            .map((a) => (
              <MenuItem key={a.id} value={a.id}>
                {a.title}
              </MenuItem>
            ))}
        </TextField>
      </Stack>
      <Divider sx={{ my: 1.5 }} />
      <Stack spacing={1}>
        {links.map((l) => (
          <Stack key={l.id} direction="row" spacing={1} alignItems="center" justifyContent="space-between">
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 850, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.article.title}</Typography>
              <Typography variant="caption" sx={{ opacity: 0.7 }}>
                {l.article.tags || '—'}
              </Typography>
            </Box>
            <IconButton size="small" onClick={() => deleteLink.mutate(l.id)}>
              <Add sx={{ transform: 'rotate(45deg)' }} fontSize="small" />
            </IconButton>
          </Stack>
        ))}
        {!linksQuery.isLoading && links.length === 0 ? (
          <Alert severity="info">No linked articles</Alert>
        ) : null}
      </Stack>
    </Box>
  )
}
