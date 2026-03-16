import { ContentCopyOutlined } from '@mui/icons-material'
import { Box, Button, Divider, MenuItem, Stack, TextField, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { api } from '../api/apiClient'
import type { Paginated, Template } from '../api/types'

export function TemplatesUsePanel({ onInsert }: { onInsert?: (body: string) => void }) {
  const [type, setType] = useState<Template['type']>('email')
  const [templateId, setTemplateId] = useState<number | ''>('')

  const templatesQuery = useQuery({
    queryKey: ['contenthub', 'templates', type, 'active'],
    queryFn: async () => (await api.get<Paginated<Template>>('/api/contenthub/templates/', { params: { type, ordering: 'name', page_size: 200 } })).data,
  })

  const templates = useMemo(() => (templatesQuery.data?.results ?? []).filter((t) => t.is_active), [templatesQuery.data?.results])
  const selected = templates.find((t) => t.id === templateId) ?? null

  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
        <Typography variant="h6">Templates</Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField size="small" select label="Type" value={type} onChange={(e) => setType(e.target.value as Template['type'])} sx={{ minWidth: 160 }}>
            <MenuItem value="email">email</MenuItem>
            <MenuItem value="signature">signature</MenuItem>
            <MenuItem value="mailmerge">mailmerge</MenuItem>
            <MenuItem value="word">word</MenuItem>
          </TextField>
          <TextField
            size="small"
            select
            label="Template"
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value ? Number(e.target.value) : '')}
            sx={{ minWidth: 260 }}
          >
            <MenuItem value="" disabled>
              Select…
            </MenuItem>
            {templates.map((t) => (
              <MenuItem key={t.id} value={t.id}>
                {t.name}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </Stack>

      <Divider sx={{ my: 1.5 }} />

      <Stack spacing={1}>
        <Typography variant="subtitle2" sx={{ fontWeight: 850 }}>
          {selected ? selected.subject || selected.name : 'Select a template'}
        </Typography>
        <TextField value={selected?.body ?? ''} multiline minRows={6} placeholder="Template content…" />
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button
            variant="outlined"
            startIcon={<ContentCopyOutlined />}
            disabled={!selected?.body}
            onClick={async () => {
              if (!selected?.body) return
              await navigator.clipboard.writeText(selected.body)
            }}
          >
            Copy
          </Button>
          <Button
            variant="contained"
            disabled={!selected?.body || !onInsert}
            onClick={() => {
              if (!selected?.body || !onInsert) return
              onInsert(selected.body)
            }}
          >
            Insert
          </Button>
        </Stack>
      </Stack>
    </Box>
  )
}

