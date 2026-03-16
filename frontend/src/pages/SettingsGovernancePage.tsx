import { Alert, Box, Button, Card, CardContent, Divider, MenuItem, Stack, Tab, Tabs, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { useMemo, useState, type SyntheticEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/apiClient'
import type { AuditLog, Paginated } from '../api/types'

/** Governance settings page (placeholder for audit, RBAC, and compliance configuration). */
export function SettingsGovernancePage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<'rbac' | 'audit'>('rbac')

  const [entityType, setEntityType] = useState<string>('')
  const [action, setAction] = useState<string>('')
  const [q, setQ] = useState<string>('')

  const auditQuery = useQuery({
    queryKey: ['audit-logs', entityType, action, q],
    queryFn: async () =>
      (
        await api.get<Paginated<AuditLog>>('/api/audit-logs/', {
          params: {
            entity_type: entityType || undefined,
            action: action || undefined,
            q: q || undefined,
            ordering: '-created_at',
            page_size: 50,
          },
        })
      ).data,
    enabled: tab === 'audit',
  })

  const logs = useMemo(() => auditQuery.data?.results ?? [], [auditQuery.data?.results])
  const counts = useMemo(() => {
    let create = 0
    let update = 0
    let del = 0
    for (const l of logs) {
      if (l.action === 'create') create += 1
      else if (l.action === 'update') update += 1
      else if (l.action === 'delete') del += 1
    }
    return { create, update, del, total: logs.length }
  }, [logs])

  const roles = useMemo(
    () => [
      {
        name: 'Sales Rep',
        depth: 'Own records',
        privileges: ['View opportunities', 'Create leads', 'Update own opportunities', 'Attach files'],
      },
      {
        name: 'Sales Manager',
        depth: 'Team records',
        privileges: ['All Sales Rep privileges', 'Reassign owners', 'View pipeline analytics', 'Export reports'],
      },
      {
        name: 'Support Agent',
        depth: 'Assigned cases',
        privileges: ['View cases', 'Update case status', 'SLA monitoring', 'Attach files', 'Create incidents'],
      },
      {
        name: 'Support Manager',
        depth: 'All cases',
        privileges: ['All Support Agent privileges', 'Escalations', 'War Room moderation', 'Audit access'],
      },
      {
        name: 'Admin',
        depth: 'System-wide',
        privileges: ['User management', 'RBAC configuration', 'Audit logs', 'Seed data', 'Full CRUD access'],
      },
    ],
    [],
  )

  return (
    <Box>
      <Typography variant="h5">Audit & RBAC</Typography>
      <Typography variant="body2" sx={{ opacity: 0.8, mt: 0.5 }}>
        Role-based access and audit trails for compliance
      </Typography>

      <Card sx={{ mt: 2 }}>
        <CardContent sx={{ pb: 0 }}>
          <Tabs value={tab} onChange={(_: SyntheticEvent, v: typeof tab) => setTab(v)}>
            <Tab value="rbac" label="RBAC" />
            <Tab value="audit" label="Audit Log" />
          </Tabs>
        </CardContent>
        <Divider />
        <CardContent>
          {tab === 'rbac' ? (
            <Box>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent="space-between" sx={{ mb: 2 }}>
                <Typography variant="h6">Roles & Privileges</Typography>
                <Button variant="outlined" onClick={() => navigate('/admin/users')}>
                  Manage users
                </Button>
              </Stack>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Role</TableCell>
                    <TableCell>Depth</TableCell>
                    <TableCell>Privileges</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {roles.map((r) => (
                    <TableRow key={r.name} hover>
                      <TableCell sx={{ fontWeight: 800 }}>{r.name}</TableCell>
                      <TableCell>{r.depth}</TableCell>
                      <TableCell>{r.privileges.join(' · ')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Alert severity="info" sx={{ mt: 2 }}>
                User roles are implemented using Groups. Assign groups in Users to control access and privileges.
              </Alert>
            </Box>
          ) : null}

          {tab === 'audit' ? (
            <Box>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', md: 'center' }} sx={{ mb: 2 }}>
                <Typography variant="h6" sx={{ flexGrow: 1 }}>
                  Activity Audit Log
                </Typography>
                <TextField size="small" label="Search" value={q} onChange={(e) => setQ(e.target.value)} sx={{ minWidth: 220 }} />
                <TextField size="small" select label="Action" value={action} onChange={(e) => setAction(e.target.value)} sx={{ minWidth: 150 }}>
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="create">create</MenuItem>
                  <MenuItem value="update">update</MenuItem>
                  <MenuItem value="delete">delete</MenuItem>
                </TextField>
                <TextField size="small" select label="Entity" value={entityType} onChange={(e) => setEntityType(e.target.value)} sx={{ minWidth: 170 }}>
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="campaign">campaign</MenuItem>
                  <MenuItem value="lead">lead</MenuItem>
                  <MenuItem value="contact">contact</MenuItem>
                  <MenuItem value="account">account</MenuItem>
                  <MenuItem value="opportunity">opportunity</MenuItem>
                  <MenuItem value="case">case</MenuItem>
                  <MenuItem value="product">product</MenuItem>
                  <MenuItem value="incident">incident</MenuItem>
                  <MenuItem value="attachment">attachment</MenuItem>
                </TextField>
              </Stack>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 2, mb: 2 }}>
                <MetricCard title="Total" value={counts.total} />
                <MetricCard title="Creates" value={counts.create} />
                <MetricCard title="Updates" value={counts.update} />
                <MetricCard title="Deletes" value={counts.del} />
              </Box>

              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Timestamp</TableCell>
                    <TableCell>Action</TableCell>
                    <TableCell>Entity</TableCell>
                    <TableCell>Performed by</TableCell>
                    <TableCell>Label</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {logs.map((l) => (
                    <TableRow
                      key={l.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => {
                        const to = resolveAuditLink(l.entity_type, l.entity_id)
                        if (to) navigate(to)
                      }}
                    >
                      <TableCell>{l.created_at.slice(0, 19).replace('T', ' ')}</TableCell>
                      <TableCell>{l.action}</TableCell>
                      <TableCell>{l.entity_type}</TableCell>
                      <TableCell>{l.actor.username}</TableCell>
                      <TableCell>{l.entity_label}</TableCell>
                    </TableRow>
                  ))}
                  {!auditQuery.isLoading && logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5}>No audit entries</TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
              {auditQuery.isError ? (
                <Alert severity="error" sx={{ mt: 2 }}>
                  Unable to load audit logs. This section requires admin access.
                </Alert>
              ) : null}
              <Alert severity="info" sx={{ mt: 2 }}>
                Tip: open a record and click Save/Edit to generate audit events.
              </Alert>
            </Box>
          ) : null}
        </CardContent>
      </Card>
    </Box>
  )
}

function MetricCard({ title, value }: { title: string; value: number }) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
      <CardContent>
        <Typography variant="subtitle2" sx={{ opacity: 0.8 }}>
          {title}
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 900, mt: 0.75 }}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  )
}

function resolveAuditLink(entityType: string, entityId: number) {
  if (entityType === 'campaign') return `/campaigns/${entityId}`
  if (entityType === 'lead') return `/leads?open=${entityId}`
  if (entityType === 'contact') return `/contacts`
  if (entityType === 'account') return `/accounts`
  if (entityType === 'opportunity') return `/opportunities/${entityId}`
  if (entityType === 'case') return `/cases/${entityId}`
  if (entityType === 'product') return `/products`
  if (entityType === 'incident') return `/incidents/${entityId}`
  return null
}
