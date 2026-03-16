import { Add } from '@mui/icons-material'
import { Alert, Avatar, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/apiClient'
import type { Account, Paginated } from '../api/types'
import { AttachmentsPanel } from '../components/AttachmentsPanel'
import { AuditTimelinePanel } from '../components/AuditTimelinePanel'

type AccountDraft = {
  name: string
  website: string
  industry: string
}

/** Company accounts directory (CRM accounts) with create/edit and attachments. */
export function AccountsPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [createOpen, setCreateOpen] = useState(false)
  const [edit, setEdit] = useState<{ id: number; draft: AccountDraft } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const accountsQuery = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => (await api.get<Paginated<Account>>('/api/accounts/')).data,
  })

  const createAccount = useMutation({
    mutationFn: async (draft: AccountDraft) => (await api.post<Account>('/api/accounts/', draft)).data,
    onSuccess: async () => {
      setCreateOpen(false)
      await qc.invalidateQueries({ queryKey: ['accounts'] })
    },
    onError: () => setError('Failed to create account.'),
  })

  const updateAccount = useMutation({
    mutationFn: async ({ id, patch }: { id: number; patch: Partial<AccountDraft> }) => (await api.patch<Account>(`/api/accounts/${id}/`, patch)).data,
    onSuccess: async () => {
      setEdit(null)
      await qc.invalidateQueries({ queryKey: ['accounts'] })
    },
    onError: () => setError('Failed to update account.'),
  })

  const [draft, setDraft] = useState<AccountDraft>({ name: '', website: '', industry: '' })

  const accounts = accountsQuery.data?.results ?? []
  const openEdit = (a: Account) => {
    setEdit({ id: a.id, draft: { name: a.name, website: a.website ?? '', industry: a.industry ?? '' } })
  }

  const colorFor = (s: string) => {
    let h = 0
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360
    return `hsl(${h}deg 70% 45%)`
  }

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }} sx={{ mb: 2 }}>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h5">Accounts</Typography>
          <Typography variant="body2" sx={{ opacity: 0.8, mt: 0.5 }}>
            Company directory used by contacts and opportunities.
          </Typography>
        </Box>
        <Button
          startIcon={<Add />}
          variant="contained"
          onClick={() => {
            setDraft({ name: '', website: '', industry: '' })
            setCreateOpen(true)
          }}
        >
          New Account
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
            <TableCell>Industry</TableCell>
            <TableCell>Website</TableCell>
            <TableCell />
          </TableRow>
        </TableHead>
        <TableBody>
          {accounts.map((a) => (
            <TableRow key={a.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/accounts/${a.id}`)}>
              <TableCell>
                <Stack direction="row" spacing={1.25} alignItems="center">
                  <Avatar sx={{ width: 34, height: 34, bgcolor: colorFor(a.name), fontWeight: 900 }}>{a.name.slice(0, 1).toUpperCase()}</Avatar>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 850, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</Typography>
                    <Typography variant="caption" sx={{ opacity: 0.75 }}>
                      {a.parent_account ? `Subsidiary of ${a.parent_account.name}` : 'Company'}
                    </Typography>
                  </Box>
                </Stack>
              </TableCell>
              <TableCell>
                {a.industry ? (
                  <Box sx={{ display: 'inline-flex', px: 1, py: 0.25, borderRadius: 99, fontSize: 12, fontWeight: 850, bgcolor: 'secondary.main', color: 'secondary.contrastText' }}>
                    {a.industry}
                  </Box>
                ) : (
                  '—'
                )}
              </TableCell>
              <TableCell>{a.website || '—'}</TableCell>
              <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                  <Button size="small" onClick={() => navigate(`/contacts?account=${a.id}`)}>
                    Employees
                  </Button>
                  <Button size="small" onClick={() => openEdit(a)}>
                    Edit
                  </Button>
                </Stack>
              </TableCell>
            </TableRow>
          ))}
          {!accountsQuery.isLoading && accounts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4}>No accounts</TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>New Account</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField label="Name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <TextField label="Industry" value={draft.industry} onChange={(e) => setDraft({ ...draft, industry: e.target.value })} />
          <TextField label="Website" value={draft.website} onChange={(e) => setDraft({ ...draft, website: e.target.value })} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={createAccount.isPending || !draft.name} onClick={() => createAccount.mutate(draft)}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!edit} onClose={() => setEdit(null)} fullWidth maxWidth="md">
        <DialogTitle>Edit Account</DialogTitle>
        <DialogContent sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mt: 1 }}>
          {edit ? (
            <>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField label="Name" value={edit.draft.name} onChange={(e) => setEdit({ ...edit, draft: { ...edit.draft, name: e.target.value } })} />
                <TextField label="Industry" value={edit.draft.industry} onChange={(e) => setEdit({ ...edit, draft: { ...edit.draft, industry: e.target.value } })} />
                <TextField label="Website" value={edit.draft.website} onChange={(e) => setEdit({ ...edit, draft: { ...edit.draft, website: e.target.value } })} />
              </Box>
              <Stack spacing={2}>
                <AttachmentsPanel entityType="account" entityId={edit.id} />
                <AuditTimelinePanel entityType="account" entityId={edit.id} />
              </Stack>
            </>
          ) : (
            <Typography>Loading…</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEdit(null)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!edit || updateAccount.isPending}
            onClick={() => {
              if (!edit) return
              updateAccount.mutate({ id: edit.id, patch: edit.draft })
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
