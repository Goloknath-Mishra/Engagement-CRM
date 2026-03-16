import { DeleteOutline, UploadFileOutlined } from '@mui/icons-material'
import { Box, Button, Divider, IconButton, Link, Stack, Typography } from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/apiClient'
import type { Attachment, Paginated } from '../api/types'

export function AttachmentsPanel({ entityType, entityId }: { entityType: string; entityId: number }) {
  const qc = useQueryClient()
  const listQuery = useQuery({
    queryKey: ['attachments', entityType, entityId],
    queryFn: async () => (await api.get<Paginated<Attachment>>('/api/attachments/', { params: { entity_type: entityType, entity_id: entityId, page_size: 50 } })).data,
    enabled: Number.isFinite(entityId),
  })

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData()
      form.append('entity_type', entityType)
      form.append('entity_id', String(entityId))
      form.append('file', file)
      return (await api.post<Attachment>('/api/attachments/', form, { headers: { 'Content-Type': 'multipart/form-data' } })).data
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['attachments', entityType, entityId] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/api/attachments/${id}/`)
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['attachments', entityType, entityId] })
    },
  })

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent="space-between">
        <Stack spacing={0.25}>
          <Typography variant="h6">Attachments</Typography>
          <Typography variant="body2" sx={{ opacity: 0.75 }}>
            Upload files related to this record.
          </Typography>
        </Stack>
        <Button component="label" variant="outlined" startIcon={<UploadFileOutlined />} disabled={uploadMutation.isPending}>
          Upload
          <input
            type="file"
            hidden
            onChange={(e) => {
              const file = e.currentTarget.files?.[0]
              e.currentTarget.value = ''
              if (!file) return
              uploadMutation.mutate(file)
            }}
          />
        </Button>
      </Stack>

      <Divider sx={{ my: 1.5 }} />

      <Stack spacing={1}>
        {(listQuery.data?.results ?? []).map((a) => (
          <Stack key={a.id} direction="row" spacing={1.5} alignItems="center" justifyContent="space-between">
            <Stack spacing={0.1} sx={{ minWidth: 0 }}>
              <Link href={a.file_url} target="_blank" rel="noreferrer" underline="hover" sx={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {a.filename}
              </Link>
              <Typography variant="caption" sx={{ opacity: 0.7 }}>
                {a.uploaded_by.username} · {a.created_at.slice(0, 19).replace('T', ' ')}
              </Typography>
            </Stack>
            <IconButton size="small" onClick={() => deleteMutation.mutate(a.id)} disabled={deleteMutation.isPending}>
              <DeleteOutline fontSize="small" />
            </IconButton>
          </Stack>
        ))}

        {!listQuery.isLoading && (listQuery.data?.results ?? []).length === 0 ? (
          <Typography variant="body2" sx={{ opacity: 0.75 }}>
            No attachments
          </Typography>
        ) : null}
      </Stack>
    </Box>
  )
}
