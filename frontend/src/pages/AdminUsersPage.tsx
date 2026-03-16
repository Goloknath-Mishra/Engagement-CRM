import { Add } from '@mui/icons-material'
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '../api/apiClient'
import type { AdminUser, Paginated } from '../api/types'
import { useAuth } from '../auth/useAuth'

type UserDraft = {
  username: string
  first_name: string
  last_name: string
  email: string
  is_staff: boolean
  is_active: boolean
  groupsCsv: string
  password: string
}

/** Admin-only user management: list, create, edit, group assignment, and password reset. */
export function AdminUsersPage() {
  const { user } = useAuth()
  const qc = useQueryClient()

  const [createOpen, setCreateOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const emptyDraft: UserDraft = {
    username: '',
    first_name: '',
    last_name: '',
    email: '',
    is_staff: false,
    is_active: true,
    groupsCsv: '',
    password: '',
  }
  const [draft, setDraft] = useState<UserDraft>(emptyDraft)
  const [edit, setEdit] = useState<{ id: number; draft: UserDraft } | null>(null)

  const usersQuery = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => (await api.get<Paginated<AdminUser>>('/api/admin/users/')).data,
    enabled: !!user?.is_staff,
  })

  const createUser = useMutation({
    mutationFn: async (draft: UserDraft) => {
      const groups = draft.groupsCsv
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean)
      const payload = {
        username: draft.username,
        first_name: draft.first_name,
        last_name: draft.last_name,
        email: draft.email,
        is_staff: draft.is_staff,
        is_active: draft.is_active,
        groups,
        password: draft.password,
      }
      return (await api.post<AdminUser>('/api/admin/users/', payload)).data
    },
    onSuccess: async () => {
      setCreateOpen(false)
      await qc.invalidateQueries({ queryKey: ['admin-users'] })
    },
    onError: () => setError('Failed to create user.'),
  })

  const updateUser = useMutation({
    mutationFn: async ({ id, draft }: { id: number; draft: UserDraft }) => {
      const groups = draft.groupsCsv
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean)
      const payload = {
        username: draft.username,
        first_name: draft.first_name,
        last_name: draft.last_name,
        email: draft.email,
        is_staff: draft.is_staff,
        is_active: draft.is_active,
        groups,
        password: draft.password || undefined,
      }
      return (await api.patch<AdminUser>(`/api/admin/users/${id}/`, payload)).data
    },
    onSuccess: async () => {
      setEdit(null)
      await qc.invalidateQueries({ queryKey: ['admin-users'] })
    },
    onError: () => setError('Failed to update user.'),
  })

  const seedUsers = useMutation({
    mutationFn: async () => (await api.post('/api/campaigns/seed/', {})).data,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-users'] })
    },
  })

  const users = usersQuery.data?.results ?? []
  const openEdit = (u: AdminUser) => {
    setEdit({
      id: u.id,
      draft: {
        username: u.username,
        first_name: u.first_name,
        last_name: u.last_name,
        email: u.email,
        is_staff: u.is_staff,
        is_active: u.is_active,
        groupsCsv: u.groups.join(', '),
        password: '',
      },
    })
  }

  if (!user?.is_staff) return <Alert severity="error">You do not have access to User Management.</Alert>

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }} sx={{ mb: 2 }}>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h5">User Management</Typography>
          <Typography variant="body2" sx={{ opacity: 0.8, mt: 0.5 }}>
            Admins can create users, edit attributes, and reset passwords.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => {
            setDraft(emptyDraft)
            setCreateOpen(true)
          }}
        >
          New User
        </Button>
      </Stack>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}

      {!usersQuery.isLoading && users.length === 0 ? (
        <Alert
          severity="info"
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" disabled={seedUsers.isPending} onClick={() => seedUsers.mutate()}>
              Generate sample users
            </Button>
          }
        >
          No users found. Generate sample data to populate Users, CRM records, and dashboard visuals.
        </Alert>
      ) : null}

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Username</TableCell>
            <TableCell>Name</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Active</TableCell>
            <TableCell>Staff</TableCell>
            <TableCell>Groups</TableCell>
            <TableCell />
          </TableRow>
        </TableHead>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u.id} hover>
              <TableCell>{u.username}</TableCell>
              <TableCell>
                {u.first_name} {u.last_name}
              </TableCell>
              <TableCell>{u.email}</TableCell>
              <TableCell>{u.is_active ? 'yes' : 'no'}</TableCell>
              <TableCell>{u.is_staff ? 'yes' : 'no'}</TableCell>
              <TableCell>{u.groups.join(', ') || '—'}</TableCell>
              <TableCell align="right">
                <Button size="small" onClick={() => openEdit(u)}>
                  Edit
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {!usersQuery.isLoading && users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7}>No users</TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>New User</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField label="Username" value={draft.username} onChange={(e) => setDraft({ ...draft, username: e.target.value })} />
          <TextField label="First name" value={draft.first_name} onChange={(e) => setDraft({ ...draft, first_name: e.target.value })} />
          <TextField label="Last name" value={draft.last_name} onChange={(e) => setDraft({ ...draft, last_name: e.target.value })} />
          <TextField label="Email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
          <TextField label="Groups (comma-separated)" value={draft.groupsCsv} onChange={(e) => setDraft({ ...draft, groupsCsv: e.target.value })} />
          <TextField label="Password" type="password" value={draft.password} onChange={(e) => setDraft({ ...draft, password: e.target.value })} />
          <Stack direction="row" spacing={2}>
            <TextField
              select
              label="Active"
              value={draft.is_active ? 'yes' : 'no'}
              onChange={(e) => setDraft({ ...draft, is_active: e.target.value === 'yes' })}
              sx={{ flexGrow: 1 }}
            >
              <MenuItem value="yes">yes</MenuItem>
              <MenuItem value="no">no</MenuItem>
            </TextField>
            <TextField
              select
              label="Staff"
              value={draft.is_staff ? 'yes' : 'no'}
              onChange={(e) => setDraft({ ...draft, is_staff: e.target.value === 'yes' })}
              sx={{ flexGrow: 1 }}
            >
              <MenuItem value="yes">yes</MenuItem>
              <MenuItem value="no">no</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={createUser.isPending || !draft.username || !draft.password} onClick={() => createUser.mutate(draft)}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!edit} onClose={() => setEdit(null)} fullWidth maxWidth="sm">
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {edit ? (
            <>
              <TextField label="Username" value={edit.draft.username} onChange={(e) => setEdit({ ...edit, draft: { ...edit.draft, username: e.target.value } })} />
              <TextField label="First name" value={edit.draft.first_name} onChange={(e) => setEdit({ ...edit, draft: { ...edit.draft, first_name: e.target.value } })} />
              <TextField label="Last name" value={edit.draft.last_name} onChange={(e) => setEdit({ ...edit, draft: { ...edit.draft, last_name: e.target.value } })} />
              <TextField label="Email" value={edit.draft.email} onChange={(e) => setEdit({ ...edit, draft: { ...edit.draft, email: e.target.value } })} />
              <TextField
                label="Groups (comma-separated)"
                value={edit.draft.groupsCsv}
                onChange={(e) => setEdit({ ...edit, draft: { ...edit.draft, groupsCsv: e.target.value } })}
              />
              <TextField
                label="New password (optional)"
                type="password"
                value={edit.draft.password}
                onChange={(e) => setEdit({ ...edit, draft: { ...edit.draft, password: e.target.value } })}
              />
              <Stack direction="row" spacing={2}>
                <TextField
                  select
                  label="Active"
                  value={edit.draft.is_active ? 'yes' : 'no'}
                  onChange={(e) => setEdit({ ...edit, draft: { ...edit.draft, is_active: e.target.value === 'yes' } })}
                  sx={{ flexGrow: 1 }}
                >
                  <MenuItem value="yes">yes</MenuItem>
                  <MenuItem value="no">no</MenuItem>
                </TextField>
                <TextField
                  select
                  label="Staff"
                  value={edit.draft.is_staff ? 'yes' : 'no'}
                  onChange={(e) => setEdit({ ...edit, draft: { ...edit.draft, is_staff: e.target.value === 'yes' } })}
                  sx={{ flexGrow: 1 }}
                >
                  <MenuItem value="yes">yes</MenuItem>
                  <MenuItem value="no">no</MenuItem>
                </TextField>
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
          disabled={!edit || updateUser.isPending}
            onClick={() => {
            if (!edit) return
            updateUser.mutate({ id: edit.id, draft: edit.draft })
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
