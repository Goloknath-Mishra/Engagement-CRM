import { Add } from '@mui/icons-material'
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api/apiClient'
import type { Account, Contact, Paginated } from '../api/types'
import { AttachmentsPanel } from '../components/AttachmentsPanel'
import { AuditTimelinePanel } from '../components/AuditTimelinePanel'

type ContactDraft = {
  first_name: string
  last_name: string
  account_name: string
  account_id: number | null
  title: string
  email: string
  phone: string
  manager_id: number | null
  relationship_tag: Contact['relationship_tag']
}

/** Contact directory with inline create/edit and navigation to related cases. */
export function ContactsPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const accountFilter = searchParams.get('account')
  const accountId = accountFilter ? Number(accountFilter) : null
  const [createOpen, setCreateOpen] = useState(false)
  const [edit, setEdit] = useState<{ id: number; draft: ContactDraft } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const contactsQuery = useQuery({
    queryKey: ['contacts', accountId],
    queryFn: async () => (await api.get<Paginated<Contact>>('/api/contacts/', { params: { account: accountId || undefined, ordering: '-created_at', page_size: 200 } })).data,
  })

  const accountsQuery = useQuery({
    queryKey: ['accounts', 'all'],
    queryFn: async () => (await api.get<Paginated<Account>>('/api/accounts/', { params: { ordering: 'name', page_size: 200 } })).data,
  })

  const createContact = useMutation({
    mutationFn: async (draft: ContactDraft) => (await api.post<Contact>('/api/contacts/', draft)).data,
    onSuccess: async () => {
      setCreateOpen(false)
      await qc.invalidateQueries({ queryKey: ['contacts'] })
    },
    onError: () => setError('Failed to create contact.'),
  })

  const updateContact = useMutation({
    mutationFn: async ({ id, patch }: { id: number; patch: Partial<ContactDraft> }) => (await api.patch<Contact>(`/api/contacts/${id}/`, patch)).data,
    onSuccess: async () => {
      setEdit(null)
      await qc.invalidateQueries({ queryKey: ['contacts'] })
    },
    onError: () => setError('Failed to update contact.'),
  })

  const [draft, setDraft] = useState<ContactDraft>({
    first_name: '',
    last_name: '',
    account_name: '',
    account_id: null,
    title: '',
    email: '',
    phone: '',
    manager_id: null,
    relationship_tag: 'unknown',
  })

  const contacts = contactsQuery.data?.results ?? []
  const accounts = accountsQuery.data?.results ?? []
  const colorFor = (s: string) => {
    let h = 0
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360
    return `hsl(${h}deg 70% 45%)`
  }
  const openEdit = (c: Contact) => {
    setEdit({
      id: c.id,
      draft: {
        first_name: c.first_name ?? '',
        last_name: c.last_name,
        account_name: c.account?.name ?? c.account_name ?? '',
        account_id: c.account?.id ?? null,
        title: c.title ?? '',
        email: c.email ?? '',
        phone: c.phone ?? '',
        manager_id: c.manager?.id ?? null,
        relationship_tag: c.relationship_tag ?? 'unknown',
      },
    })
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5">Contacts</Typography>
        <Button startIcon={<Add />} variant="contained" onClick={() => setCreateOpen(true)}>
          New Contact
        </Button>
      </Box>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Account</TableCell>
            <TableCell>Manager</TableCell>
            <TableCell>Tag</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Phone</TableCell>
            <TableCell />
          </TableRow>
        </TableHead>
        <TableBody>
          {contacts.map((c) => (
            <TableRow key={c.id} hover>
              <TableCell>
                <Stack direction="row" spacing={1.25} alignItems="center">
                  <Box
                    sx={{
                      width: 34,
                      height: 34,
                      borderRadius: '50%',
                      display: 'grid',
                      placeItems: 'center',
                      bgcolor: colorFor(`${c.first_name}${c.last_name}`),
                      color: 'common.white',
                      fontWeight: 900,
                      fontSize: 13,
                    }}
                  >
                    {`${c.first_name?.slice(0, 1) ?? ''}${c.last_name?.slice(0, 1) ?? ''}`.toUpperCase() || 'C'}
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 850, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.first_name} {c.last_name}
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.75 }}>
                      {c.title || '—'}
                    </Typography>
                  </Box>
                </Stack>
              </TableCell>
              <TableCell>{c.account?.name ?? c.account_name}</TableCell>
              <TableCell>{c.manager ? `${c.manager.first_name} ${c.manager.last_name}`.trim() || `#${c.manager.id}` : '—'}</TableCell>
              <TableCell>
                <Box
                  sx={{
                    display: 'inline-flex',
                    px: 1,
                    py: 0.25,
                    borderRadius: 99,
                    fontSize: 12,
                    fontWeight: 800,
                    bgcolor:
                      c.relationship_tag === 'decision_maker'
                        ? 'success.main'
                        : c.relationship_tag === 'influencer'
                          ? 'warning.main'
                          : c.relationship_tag === 'blocker'
                            ? 'error.main'
                            : 'action.disabledBackground',
                    color: c.relationship_tag === 'unknown' ? 'text.primary' : 'common.white',
                    textTransform: 'capitalize',
                  }}
                >
                  {c.relationship_tag.replaceAll('_', ' ')}
                </Box>
              </TableCell>
              <TableCell>{c.email}</TableCell>
              <TableCell>{c.phone}</TableCell>
              <TableCell align="right">
                <Button size="small" onClick={() => navigate(`/contacts/${c.id}/cases`)}>
                  Cases
                </Button>
                <Button size="small" onClick={() => openEdit(c)}>
                  Edit
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {!contactsQuery.isLoading && contacts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7}>No contacts</TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>New Contact</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField label="First name" value={draft.first_name} onChange={(e) => setDraft({ ...draft, first_name: e.target.value })} />
          <TextField label="Last name" value={draft.last_name} onChange={(e) => setDraft({ ...draft, last_name: e.target.value })} />
          <TextField
            select
            label="Company"
            value={draft.account_id ?? ''}
            onChange={(e) => {
              const id = e.target.value ? Number(e.target.value) : null
              const acc = accounts.find((a) => a.id === id) ?? null
              setDraft({ ...draft, account_id: id, account_name: acc?.name ?? draft.account_name })
            }}
          >
            <MenuItem value="">None</MenuItem>
            {accounts.map((a) => (
              <MenuItem key={a.id} value={a.id}>
                {a.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField label="Company name (fallback)" value={draft.account_name} onChange={(e) => setDraft({ ...draft, account_name: e.target.value })} />
          <TextField label="Title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          <TextField label="Email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
          <TextField label="Phone" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
          <TextField select label="Manager" value={draft.manager_id ?? ''} onChange={(e) => setDraft({ ...draft, manager_id: e.target.value ? Number(e.target.value) : null })}>
            <MenuItem value="">None</MenuItem>
            {contacts.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.first_name} {c.last_name}
              </MenuItem>
            ))}
          </TextField>
          <TextField select label="Tag" value={draft.relationship_tag} onChange={(e) => setDraft({ ...draft, relationship_tag: e.target.value as Contact['relationship_tag'] })}>
            <MenuItem value="decision_maker">Decision maker</MenuItem>
            <MenuItem value="influencer">Influencer</MenuItem>
            <MenuItem value="blocker">Blocker</MenuItem>
            <MenuItem value="unknown">Unknown</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={createContact.isPending || !draft.last_name} onClick={() => createContact.mutate(draft)}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!edit} onClose={() => setEdit(null)} fullWidth maxWidth="md">
        <DialogTitle>Edit Contact</DialogTitle>
        <DialogContent sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mt: 1 }}>
          {edit ? (
            <>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField label="First name" value={edit.draft.first_name} onChange={(e) => setEdit({ ...edit, draft: { ...edit.draft, first_name: e.target.value } })} />
                <TextField label="Last name" value={edit.draft.last_name} onChange={(e) => setEdit({ ...edit, draft: { ...edit.draft, last_name: e.target.value } })} />
                <TextField
                  select
                  label="Company"
                  value={edit.draft.account_id ?? ''}
                  onChange={(e) => {
                    const id = e.target.value ? Number(e.target.value) : null
                    const acc = accounts.find((a) => a.id === id) ?? null
                    setEdit({ ...edit, draft: { ...edit.draft, account_id: id, account_name: acc?.name ?? edit.draft.account_name } })
                  }}
                >
                  <MenuItem value="">None</MenuItem>
                  {accounts.map((a) => (
                    <MenuItem key={a.id} value={a.id}>
                      {a.name}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField label="Company name (fallback)" value={edit.draft.account_name} onChange={(e) => setEdit({ ...edit, draft: { ...edit.draft, account_name: e.target.value } })} />
                <TextField label="Title" value={edit.draft.title} onChange={(e) => setEdit({ ...edit, draft: { ...edit.draft, title: e.target.value } })} />
                <TextField label="Email" value={edit.draft.email} onChange={(e) => setEdit({ ...edit, draft: { ...edit.draft, email: e.target.value } })} />
                <TextField label="Phone" value={edit.draft.phone} onChange={(e) => setEdit({ ...edit, draft: { ...edit.draft, phone: e.target.value } })} />
                <TextField
                  select
                  label="Manager"
                  value={edit.draft.manager_id ?? ''}
                  onChange={(e) => setEdit({ ...edit, draft: { ...edit.draft, manager_id: e.target.value ? Number(e.target.value) : null } })}
                >
                  <MenuItem value="">None</MenuItem>
                  {contacts
                    .filter((c) => c.id !== edit.id)
                    .map((c) => (
                      <MenuItem key={c.id} value={c.id}>
                        {c.first_name} {c.last_name}
                      </MenuItem>
                    ))}
                </TextField>
                <TextField
                  select
                  label="Tag"
                  value={edit.draft.relationship_tag}
                  onChange={(e) => setEdit({ ...edit, draft: { ...edit.draft, relationship_tag: e.target.value as Contact['relationship_tag'] } })}
                >
                  <MenuItem value="decision_maker">Decision maker</MenuItem>
                  <MenuItem value="influencer">Influencer</MenuItem>
                  <MenuItem value="blocker">Blocker</MenuItem>
                  <MenuItem value="unknown">Unknown</MenuItem>
                </TextField>
              </Box>
              <Stack spacing={2}>
                <AttachmentsPanel entityType="contact" entityId={edit.id} />
                <AuditTimelinePanel entityType="contact" entityId={edit.id} />
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
            disabled={!edit || updateContact.isPending}
            onClick={() => {
              if (!edit) return
              updateContact.mutate({ id: edit.id, patch: edit.draft })
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
