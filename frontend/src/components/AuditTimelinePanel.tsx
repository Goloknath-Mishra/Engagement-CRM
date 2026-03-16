import { Box, Card, CardContent, Chip, Divider, Stack, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/apiClient'
import type { AuditLog, Paginated } from '../api/types'

export function AuditTimelinePanel({ entityType, entityId }: { entityType: string; entityId: number }) {
  const query = useQuery({
    queryKey: ['audit-logs', entityType, entityId],
    queryFn: async () =>
      (
        await api.get<Paginated<AuditLog>>('/api/audit-logs/', {
          params: { entity_type: entityType, entity_id: entityId, ordering: '-created_at', page_size: 50 },
        })
      ).data,
    enabled: Number.isFinite(entityId),
  })

  if (query.isError) {
    return (
      <Box>
        <Typography variant="h6">Audit History</Typography>
        <Typography variant="body2" sx={{ opacity: 0.75, mt: 0.5 }}>
          Audit history requires admin access.
        </Typography>
      </Box>
    )
  }

  const logs = query.data?.results ?? []

  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
        <Box>
          <Typography variant="h6">Audit History</Typography>
          <Typography variant="body2" sx={{ opacity: 0.75, mt: 0.5 }}>
            Full activity trail for this record.
          </Typography>
        </Box>
        <Chip size="small" label={`${logs.length} events`} variant="outlined" />
      </Stack>
      <Divider sx={{ my: 1.5 }} />
      <Stack spacing={1.25}>
        {logs.map((l) => (
          <Card key={l.id} variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent sx={{ py: 1.25, '&:last-child': { pb: 1.25 } }}>
              <Stack direction="row" spacing={1.25} alignItems="center" justifyContent="space-between">
                <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                  <Chip size="small" label={l.action} color={l.action === 'create' ? 'success' : l.action === 'update' ? 'warning' : 'error'} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 850, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {l.entity_label}
                  </Typography>
                </Stack>
                <Typography variant="caption" sx={{ opacity: 0.75 }}>
                  {l.created_at.slice(0, 19).replace('T', ' ')}
                </Typography>
              </Stack>
              <Typography variant="caption" sx={{ opacity: 0.75, display: 'block', mt: 0.75 }}>
                by {l.actor.username}
              </Typography>
              {l.changes && Object.keys(l.changes).length ? (
                <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mt: 0.5 }}>
                  {formatChanges(l.changes)}
                </Typography>
              ) : null}
            </CardContent>
          </Card>
        ))}
        {!query.isLoading && logs.length === 0 ? (
          <Typography variant="body2" sx={{ opacity: 0.75 }}>
            No audit events yet.
          </Typography>
        ) : null}
      </Stack>
    </Box>
  )
}

function formatChanges(changes: Record<string, unknown>) {
  const keys = Object.keys(changes).slice(0, 6)
  return `changes: ${keys.join(', ')}${Object.keys(changes).length > keys.length ? '…' : ''}`
}

