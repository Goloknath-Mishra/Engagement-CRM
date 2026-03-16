/**
 * Account detail page with Dynamics-style hierarchy and org chart concepts.
 *
 * Sections:
 * - Company Hierarchy: parent/subsidiary tree
 * - Leadership & Managers: manager -> direct report tree for employees in this account
 * - Attachments and audit history panels
 */
import { ArrowBackOutlined } from '@mui/icons-material'
import { Alert, Box, Button, Card, CardContent, Divider, IconButton, Stack, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/apiClient'
import type { Account, Contact, Paginated } from '../api/types'
import { AttachmentsPanel } from '../components/AttachmentsPanel'
import { AuditTimelinePanel } from '../components/AuditTimelinePanel'

export function AccountDetailPage() {
  const { id } = useParams()
  const accountId = Number(id)
  const navigate = useNavigate()

  const accountQuery = useQuery({
    queryKey: ['account', accountId],
    enabled: Number.isFinite(accountId),
    queryFn: async () => (await api.get<Account>(`/api/accounts/${accountId}/`)).data,
  })

  const accountsQuery = useQuery({
    queryKey: ['accounts', 'hierarchy'],
    queryFn: async () => (await api.get<Paginated<Account>>('/api/accounts/', { params: { ordering: 'name', page_size: 250 } })).data,
  })

  const contactsQuery = useQuery({
    queryKey: ['contacts', 'hierarchy'],
    queryFn: async () => (await api.get<Paginated<Contact>>('/api/contacts/', { params: { ordering: 'last_name', page_size: 500 } })).data,
  })

  const account = accountQuery.data ?? null
  const accounts = useMemo(() => accountsQuery.data?.results ?? [], [accountsQuery.data?.results])
  const contacts = useMemo(() => contactsQuery.data?.results ?? [], [contactsQuery.data?.results])

  const accountsByParent = useMemo(() => {
    const m = new Map<number, Account[]>()
    for (const a of accounts) {
      const pid = a.parent_account?.id
      if (!pid) continue
      const arr = m.get(pid) ?? []
      arr.push(a)
      m.set(pid, arr)
    }
    for (const [k, arr] of m.entries()) {
      arr.sort((x, y) => x.name.localeCompare(y.name))
      m.set(k, arr)
    }
    return m
  }, [accounts])

  const employeesByAccount = useMemo(() => {
    const m = new Map<number, Contact[]>()
    for (const c of contacts) {
      const aid = c.account?.id
      if (!aid) continue
      const arr = m.get(aid) ?? []
      arr.push(c)
      m.set(aid, arr)
    }
    return m
  }, [contacts])

  const myEmployees = useMemo(() => employeesByAccount.get(accountId) ?? [], [employeesByAccount, accountId])

  if (!Number.isFinite(accountId)) return <Alert severity="error">Invalid account id.</Alert>
  if (accountQuery.isLoading) return <Typography>Loading…</Typography>
  if (!account) return <Alert severity="error">Account not found.</Alert>

  return (
    <Box>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }} sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ flexGrow: 1 }}>
          <IconButton onClick={() => navigate('/accounts')}>
            <ArrowBackOutlined />
          </IconButton>
          <Box>
            <Typography variant="h5" sx={{ letterSpacing: -0.4 }}>
              {account.name}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.75, mt: 0.5 }}>
              {account.industry || '—'} · {account.website || '—'}
            </Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button variant="outlined" onClick={() => navigate(`/contacts?account=${accountId}`)}>
            View employees
          </Button>
        </Stack>
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2, mb: 2 }}>
        <Card>
          <CardContent>
            <Typography variant="h6">Company Hierarchy</Typography>
            <Typography variant="body2" sx={{ opacity: 0.75, mt: 0.5 }}>
              Parent → subsidiaries view
            </Typography>
            <Divider sx={{ my: 1.5 }} />
            <CompanyTree root={account} getChildren={(id) => accountsByParent.get(id) ?? []} employeeCount={(id) => (employeesByAccount.get(id) ?? []).length} />
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6">Leadership & Managers</Typography>
            <Typography variant="body2" sx={{ opacity: 0.75, mt: 0.5 }}>
              Org chart for employees in this company
            </Typography>
            <Divider sx={{ my: 1.5 }} />
            <OrgTree contacts={myEmployees} />
          </CardContent>
        </Card>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2 }}>
        <Card>
          <CardContent>
            <AttachmentsPanel entityType="account" entityId={accountId} />
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <AuditTimelinePanel entityType="account" entityId={accountId} />
          </CardContent>
        </Card>
      </Box>
    </Box>
  )
}

function CompanyTree({
  root,
  getChildren,
  employeeCount,
}: {
  root: Account
  getChildren: (id: number) => Account[]
  employeeCount: (id: number) => number
}) {
  return (
    <Box>
      <CompanyNode account={root} depth={0} employeeCount={employeeCount(root.id)} />
      {renderChildren(root.id, 1)}
    </Box>
  )

  function renderChildren(parentId: number, depth: number) {
    const children = getChildren(parentId)
    if (!children.length) return null
    return (
      <Box sx={{ mt: 1 }}>
        {children.map((c) => (
          <Box key={c.id} sx={{ mt: 1 }}>
            <CompanyNode account={c} depth={depth} employeeCount={employeeCount(c.id)} />
            {renderChildren(c.id, depth + 1)}
          </Box>
        ))}
      </Box>
    )
  }
}

function CompanyNode({ account, depth, employeeCount }: { account: Account; depth: number; employeeCount: number }) {
  return (
    <Box sx={{ pl: depth * 2, borderLeft: depth ? '2px solid' : undefined, borderColor: depth ? 'divider' : undefined }}>
      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <CardContent sx={{ py: 1.25, '&:last-child': { pb: 1.25 } }}>
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 850, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {account.name}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.7 }}>
                {account.industry || '—'}
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              {employeeCount} employees
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  )
}

function OrgTree({ contacts }: { contacts: Contact[] }) {
  const nodes = useMemo(() => {
    const byId = new Map<number, Contact>()
    for (const c of contacts) byId.set(c.id, c)
    const children = new Map<number, Contact[]>()
    const roots: Contact[] = []
    for (const c of contacts) {
      const mid = c.manager?.id
      if (mid && byId.has(mid)) {
        const arr = children.get(mid) ?? []
        arr.push(c)
        children.set(mid, arr)
      } else {
        roots.push(c)
      }
    }
    for (const [k, arr] of children.entries()) {
      arr.sort((a, b) => `${a.last_name}${a.first_name}`.localeCompare(`${b.last_name}${b.first_name}`))
      children.set(k, arr)
    }
    roots.sort((a, b) => `${a.last_name}${a.first_name}`.localeCompare(`${b.last_name}${b.first_name}`))
    return { children, roots }
  }, [contacts])

  if (!contacts.length) return <Typography variant="body2">No employees for this account.</Typography>

  return (
    <Box>
      {nodes.roots.map((r) => (
        <Box key={r.id} sx={{ mt: 1 }}>
          <OrgNode contact={r} depth={0} />
          {render(r.id, 1)}
        </Box>
      ))}
    </Box>
  )

  function render(managerId: number, depth: number) {
    const kids = nodes.children.get(managerId) ?? []
    if (!kids.length) return null
    return (
      <Box sx={{ mt: 1 }}>
        {kids.map((c) => (
          <Box key={c.id} sx={{ mt: 1 }}>
            <OrgNode contact={c} depth={depth} />
            {render(c.id, depth + 1)}
          </Box>
        ))}
      </Box>
    )
  }
}

function OrgNode({ contact, depth }: { contact: Contact; depth: number }) {
  const name = `${contact.first_name} ${contact.last_name}`.trim()
  const tag = contact.relationship_tag ?? 'unknown'
  const tagStyle =
    tag === 'decision_maker'
      ? { bgcolor: 'success.main', color: 'common.white' }
      : tag === 'influencer'
        ? { bgcolor: 'warning.main', color: 'common.white' }
        : tag === 'blocker'
          ? { bgcolor: 'error.main', color: 'common.white' }
          : { bgcolor: 'action.disabledBackground', color: 'text.primary' }
  return (
    <Box sx={{ pl: depth * 2, borderLeft: depth ? '2px solid' : undefined, borderColor: depth ? 'divider' : undefined }}>
      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <CardContent sx={{ py: 1.25, '&:last-child': { pb: 1.25 } }}>
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 850 }}>
                {name || `#${contact.id}`}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.7 }}>
                {contact.title || '—'}
              </Typography>
            </Box>
            <Box sx={{ display: 'inline-flex', px: 1, py: 0.25, borderRadius: 99, fontSize: 12, fontWeight: 850, textTransform: 'capitalize', ...tagStyle }}>
              {tag.replaceAll('_', ' ')}
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  )
}
