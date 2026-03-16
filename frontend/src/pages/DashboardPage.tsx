import { AutoAwesomeOutlined, BoltOutlined, CampaignOutlined, GroupOutlined, LocalFireDepartmentOutlined, ReportProblemOutlined, SupportAgentOutlined, TrendingUpOutlined } from '@mui/icons-material'
import { Avatar, Box, Button, Card, CardContent, Chip, Divider, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ResponsiveContainer, Bar, BarChart, Cell, Pie, PieChart, Tooltip as ReTooltip, XAxis, YAxis } from 'recharts'
import { useNow } from '../app/useNow'
import { api } from '../api/apiClient'
import type { Campaign, Case, Contact, Incident, Lead, Opportunity, Paginated } from '../api/types'
import { useAuth } from '../auth/useAuth'

/** Landing dashboard with KPI drill-down and quick access to recent records. */
export function DashboardPage() {
  const navigate = useNavigate()
  const nowMs = useNow(1000)
  const qc = useQueryClient()
  const { user } = useAuth()

  const campaignsQuery = useQuery({
    queryKey: ['dashboard', 'campaigns'],
    queryFn: async () => (await api.get<Paginated<Campaign>>('/api/campaigns/', { params: { ordering: '-created_at', page_size: 5 } })).data,
  })
  const leadsQuery = useQuery({
    queryKey: ['dashboard', 'leads'],
    queryFn: async () => (await api.get<Paginated<Lead>>('/api/leads/', { params: { ordering: '-created_at', page_size: 5 } })).data,
  })
  const contactsQuery = useQuery({
    queryKey: ['dashboard', 'contacts'],
    queryFn: async () => (await api.get<Paginated<Contact>>('/api/contacts/', { params: { ordering: '-created_at', page_size: 5 } })).data,
  })
  const opportunitiesQuery = useQuery({
    queryKey: ['dashboard', 'opportunities'],
    queryFn: async () => (await api.get<Paginated<Opportunity>>('/api/opportunities/', { params: { ordering: '-created_at', page_size: 5 } })).data,
  })
  const casesAllQuery = useQuery({
    queryKey: ['dashboard', 'cases', 'all'],
    queryFn: async () => (await api.get<Paginated<Case>>('/api/cases/', { params: { ordering: '-created_at', page_size: 5 } })).data,
  })
  const casesClosedQuery = useQuery({
    queryKey: ['dashboard', 'cases', 'closed-count'],
    queryFn: async () => (await api.get<Paginated<Case>>('/api/cases/', { params: { status: 'closed', page_size: 1 } })).data,
  })
  const incidentsQuery = useQuery({
    queryKey: ['dashboard', 'incidents'],
    queryFn: async () => (await api.get<Paginated<Incident>>('/api/incidents/', { params: { ordering: '-updated_at', page_size: 5 } })).data,
  })
  const casesUrgentQuery = useQuery({
    queryKey: ['dashboard', 'cases', 'urgent'],
    queryFn: async () => (await api.get<Paginated<Case>>('/api/cases/', { params: { priority: 'urgent', ordering: '-created_at', page_size: 5 } })).data,
  })

  const campaignCount = campaignsQuery.data?.count ?? 0
  const leadCount = leadsQuery.data?.count ?? 0
  const contactCount = contactsQuery.data?.count ?? 0
  const opportunityCount = opportunitiesQuery.data?.count ?? 0
  const caseCount = casesAllQuery.data?.count ?? 0
  const caseClosedCount = casesClosedQuery.data?.count ?? 0
  const caseOpenCount = Math.max(0, caseCount - caseClosedCount)
  const incidentCount = incidentsQuery.data?.count ?? 0

  const seedMutation = useMutation({
    mutationFn: async () => (await api.post('/api/campaigns/seed/', {})).data,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['dashboard'] })
      await qc.invalidateQueries({ queryKey: ['campaigns'] })
      await qc.invalidateQueries({ queryKey: ['leads'] })
      await qc.invalidateQueries({ queryKey: ['contacts'] })
      await qc.invalidateQueries({ queryKey: ['opportunities'] })
      await qc.invalidateQueries({ queryKey: ['cases'] })
      await qc.invalidateQueries({ queryKey: ['incidents'] })
    },
  })

  const leadStatusCounts = countBy(leadsQuery.data?.results ?? [], (l) => l.status)
  const pipelineStageCounts = countBy(opportunitiesQuery.data?.results ?? [], (o) => o.stage)
  const leadStatusBar = toBarData(leadStatusCounts)
  const pipelineStageBar = toBarData(pipelineStageCounts)
  const membership = [
    { name: 'Campaigns', value: campaignCount },
    { name: 'Leads', value: leadCount },
    { name: 'Contacts', value: contactCount },
    { name: 'Opportunities', value: opportunityCount },
  ]

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'center' }} sx={{ mb: 2 }}>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h5" sx={{ letterSpacing: -0.4 }}>
            Dashboard
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.8, mt: 0.5 }}>
            Click any KPI card to drill into records. Click a row to open the record.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          {user?.is_staff ? (
            <Button variant="outlined" startIcon={<AutoAwesomeOutlined />} disabled={seedMutation.isPending} onClick={() => seedMutation.mutate()}>
              Generate sample data
            </Button>
          ) : null}
        </Stack>
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(5, 1fr)' }, gap: 2, mb: 2 }}>
        <KpiCard title="Campaigns" value={campaignCount} subtitle="Marketing initiatives" icon={<CampaignOutlined />} gradient="linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)" onClick={() => navigate('/campaigns')} />
        <KpiCard title="Leads" value={leadCount} subtitle="Potential customers" icon={<BoltOutlined />} gradient="linear-gradient(135deg, #2563eb 0%, #22c55e 100%)" onClick={() => navigate('/leads')} />
        <KpiCard title="Contacts" value={contactCount} subtitle="People & relationships" icon={<GroupOutlined />} gradient="linear-gradient(135deg, #db2777 0%, #f97316 100%)" onClick={() => navigate('/contacts')} />
        <KpiCard title="Open cases" value={caseOpenCount} subtitle="Customer support" icon={<SupportAgentOutlined />} gradient="linear-gradient(135deg, #f97316 0%, #ef4444 100%)" onClick={() => navigate('/cases')} />
        <KpiCard title="Incidents" value={incidentCount} subtitle="War room ready" icon={<ReportProblemOutlined />} gradient="linear-gradient(135deg, #1f2937 0%, #4f46e5 100%)" onClick={() => navigate('/incidents')} />
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr 1fr' }, gap: 2, mb: 2 }}>
        <Card>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Stack spacing={0.25}>
                <Typography variant="h6">Lead Status Distribution</Typography>
                <Typography variant="body2" sx={{ opacity: 0.75 }}>
                  Current pipeline breakdown
                </Typography>
              </Stack>
              <Button size="small" onClick={() => navigate('/leads')}>
                View all
              </Button>
            </Stack>
            <Divider sx={{ my: 1.5 }} />
            <Box sx={{ height: 210 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={leadStatusBar} layout="vertical" margin={{ left: 28, right: 16 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={110} />
                  <ReTooltip />
                  <Bar dataKey="value" radius={[10, 10, 10, 10]}>
                    {leadStatusBar.map((_, idx) => (
                      <Cell key={idx} fill={['#2563eb', '#06b6d4', '#22c55e', '#f97316', '#ef4444'][idx % 5]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Stack spacing={0.25}>
                <Typography variant="h6">Opportunity Pipeline</Typography>
                <Typography variant="body2" sx={{ opacity: 0.75 }}>
                  Deals by stage
                </Typography>
              </Stack>
              <Button size="small" onClick={() => navigate('/opportunities')}>
                View all
              </Button>
            </Stack>
            <Divider sx={{ my: 1.5 }} />
            <Box sx={{ height: 210 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pipelineStageBar} margin={{ left: 8, right: 16 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={54} />
                  <YAxis allowDecimals={false} />
                  <ReTooltip />
                  <Bar dataKey="value" fill="#7c3aed" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Stack spacing={0.25}>
                <Typography variant="h6">Workspace Mix</Typography>
                <Typography variant="body2" sx={{ opacity: 0.75 }}>
                  Entities in your CRM
                </Typography>
              </Stack>
              <Chip size="small" label="Live" variant="outlined" />
            </Stack>
            <Divider sx={{ my: 1.5 }} />
            <Box sx={{ height: 210 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={membership} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                    {membership.map((_, idx) => (
                      <Cell key={idx} fill={['#7c3aed', '#06b6d4', '#db2777', '#f97316'][idx % 4]} />
                    ))}
                  </Pie>
                  <ReTooltip />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      </Box>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent="space-between">
            <Stack spacing={0.25}>
              <Typography variant="h6">Quick Access</Typography>
              <Typography variant="body2" sx={{ opacity: 0.75 }}>
                Jump to the most common workflows
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="flex-end">
              <Button size="small" startIcon={<CampaignOutlined />} onClick={() => navigate('/campaigns')}>
                Campaigns
              </Button>
              <Button size="small" startIcon={<BoltOutlined />} onClick={() => navigate('/leads')}>
                Leads
              </Button>
              <Button size="small" startIcon={<TrendingUpOutlined />} onClick={() => navigate('/opportunities')}>
                Opportunities
              </Button>
              <Button size="small" startIcon={<SupportAgentOutlined />} onClick={() => navigate('/cases')}>
                Cases
              </Button>
              <Button size="small" startIcon={<LocalFireDepartmentOutlined />} onClick={() => navigate('/incidents')}>
                War Room
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2 }}>
        <Card>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">Recent Leads</Typography>
              <Button size="small" onClick={() => navigate('/leads')}>
                View all
              </Button>
            </Stack>
            <Divider sx={{ my: 1.5 }} />
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Company</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(leadsQuery.data?.results ?? []).map((l) => (
                  <TableRow key={l.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/leads?open=${l.id}`)}>
                    <TableCell>
                      {l.first_name} {l.last_name}
                    </TableCell>
                    <TableCell>{l.status}</TableCell>
                    <TableCell>{l.company || '—'}</TableCell>
                  </TableRow>
                ))}
                {!leadsQuery.isLoading && (leadsQuery.data?.results ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3}>No leads</TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">Recent Cases</Typography>
              <Button size="small" onClick={() => navigate('/cases')}>
                View all
              </Button>
            </Stack>
            <Divider sx={{ my: 1.5 }} />
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Subject</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">SLA</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(casesAllQuery.data?.results ?? []).map((c) => {
                  const remaining = Math.max(0, Math.floor((new Date(c.sla_due_at).getTime() - nowMs) / 1000))
                  return (
                    <TableRow key={c.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/cases/${c.id}`)}>
                      <TableCell>{c.subject}</TableCell>
                      <TableCell>{c.status}</TableCell>
                      <TableCell align="right">{formatCountdown(remaining)}</TableCell>
                    </TableRow>
                  )
                })}
                {!casesAllQuery.isLoading && (casesAllQuery.data?.results ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3}>No cases</TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">High Priority Cases</Typography>
              <Button size="small" onClick={() => navigate('/cases')}>
                View all
              </Button>
            </Stack>
            <Divider sx={{ my: 1.5 }} />
            <Stack spacing={1.25}>
              {(casesUrgentQuery.data?.results ?? []).map((c) => {
                const remaining = Math.max(0, Math.floor((new Date(c.sla_due_at).getTime() - nowMs) / 1000))
                return (
                  <Card
                    key={c.id}
                    variant="outlined"
                    onClick={() => navigate(`/cases/${c.id}`)}
                    sx={{ cursor: 'pointer', borderRadius: 3, borderStyle: 'dashed' }}
                  >
                    <CardContent sx={{ py: 1.25, '&:last-child': { pb: 1.25 } }}>
                      <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between">
                        <Stack direction="row" spacing={1.25} alignItems="center">
                          <Avatar sx={{ width: 34, height: 34, bgcolor: 'error.main' }}>
                            <LocalFireDepartmentOutlined fontSize="small" />
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                              {c.subject}
                            </Typography>
                            <Typography variant="caption" sx={{ opacity: 0.75 }}>
                              {c.status} · {formatCountdown(remaining)}
                            </Typography>
                          </Box>
                        </Stack>
                        <Chip size="small" color="error" label="Urgent" />
                      </Stack>
                    </CardContent>
                  </Card>
                )
              })}
              {!casesUrgentQuery.isLoading && (casesUrgentQuery.data?.results ?? []).length === 0 ? (
                <Typography variant="body2" sx={{ opacity: 0.75 }}>
                  No urgent cases
                </Typography>
              ) : null}
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">Incidents (War Room)</Typography>
              <Button size="small" onClick={() => navigate('/incidents')}>
                View all
              </Button>
            </Stack>
            <Divider sx={{ my: 1.5 }} />
            <Stack spacing={1.25}>
              {(incidentsQuery.data?.results ?? []).map((i) => (
                <Card
                  key={i.id}
                  variant="outlined"
                  onClick={() => navigate(`/incidents/${i.id}`)}
                  sx={{ cursor: 'pointer', borderRadius: 3 }}
                >
                  <CardContent sx={{ py: 1.25, '&:last-child': { pb: 1.25 } }}>
                    <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between">
                      <Stack direction="row" spacing={1.25} alignItems="center">
                        <Avatar sx={{ width: 34, height: 34, bgcolor: 'primary.main' }}>
                          <ReportProblemOutlined fontSize="small" />
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                            {i.title}
                          </Typography>
                          <Typography variant="caption" sx={{ opacity: 0.75 }}>
                            {i.severity} · {i.status}
                          </Typography>
                        </Box>
                      </Stack>
                      <Chip size="small" label="Live discussion" variant="outlined" />
                    </Stack>
                  </CardContent>
                </Card>
              ))}
              {!incidentsQuery.isLoading && (incidentsQuery.data?.results ?? []).length === 0 ? (
                <Typography variant="body2" sx={{ opacity: 0.75 }}>
                  No incidents
                </Typography>
              ) : null}
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Box>
  )
}

function KpiCard({
  title,
  value,
  subtitle,
  icon,
  gradient,
  onClick,
}: {
  title: string
  value: number
  subtitle: string
  icon: ReactNode
  gradient: string
  onClick: () => void
}) {
  return (
    <Card
      onClick={onClick}
      sx={{
        cursor: 'pointer',
        color: '#fff',
        border: 'none',
        background: gradient,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.5}>
          <Box>
            <Typography variant="overline" sx={{ opacity: 0.9, letterSpacing: 0.6 }}>
              {title}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 900, mt: 0.5, lineHeight: 1.05 }}>
              {value}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.75 }}>
              {subtitle}
            </Typography>
          </Box>
          <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.16)', width: 36, height: 36 }}>{icon}</Avatar>
        </Stack>
      </CardContent>
    </Card>
  )
}

function formatCountdown(seconds: number) {
  const s = Math.max(0, seconds)
  const hh = Math.floor(s / 3600)
  const mm = Math.floor((s % 3600) / 60)
  const ss = s % 60
  if (hh > 0) return `${hh}h ${String(mm).padStart(2, '0')}m ${String(ss).padStart(2, '0')}s`
  return `${mm}m ${String(ss).padStart(2, '0')}s`
}

function countBy<T>(items: T[], getKey: (item: T) => string) {
  const out = new Map<string, number>()
  for (const it of items) {
    const key = getKey(it)
    out.set(key, (out.get(key) ?? 0) + 1)
  }
  return out
}

function toBarData(counts: Map<string, number>) {
  return Array.from(counts.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}
