import { ArrowBackOutlined, CampaignOutlined, EditOutlined, GroupOutlined, PaidOutlined, PercentOutlined, TrendingUpOutlined } from '@mui/icons-material'
import { Alert, Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider, IconButton, MenuItem, Stack, Table, TableBody, TableCell, TableHead, TableRow, Tabs, Tab, TextField, Typography } from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState, type ReactNode, type SyntheticEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ResponsiveContainer, Cell, Pie, PieChart, Tooltip as ReTooltip } from 'recharts'
import { api } from '../api/apiClient'
import type { Campaign, Lead, Opportunity, Paginated } from '../api/types'
import { AttachmentsPanel } from '../components/AttachmentsPanel'
import { AuditTimelinePanel } from '../components/AuditTimelinePanel'
import { RelatedKnowledgePanel } from '../components/RelatedKnowledgePanel'
import { ValueChip } from '../components/ValueChip'

type CampaignDraft = {
  name: string
  description: string
  status: Campaign['status']
  start_date: string
  end_date: string
  budget: string
}

type LeadDraft = {
  first_name: string
  last_name: string
  company: string
  title: string
  email: string
  phone: string
  status: Lead['status']
  source: Lead['source']
}

/** Campaign detail view with KPIs, lead distribution, and clickable related records. */
export function CampaignDetailPage() {
  const { id } = useParams()
  const campaignId = Number(id)
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [tab, setTab] = useState<'overview' | 'leads' | 'opportunities' | 'analytics'>('overview')
  const [editOpen, setEditOpen] = useState(false)
  const [createLeadOpen, setCreateLeadOpen] = useState(false)

  const campaignQuery = useQuery({
    queryKey: ['campaign', campaignId],
    enabled: Number.isFinite(campaignId),
    queryFn: async () => (await api.get<Campaign>(`/api/campaigns/${campaignId}/`)).data,
  })

  const leadsQuery = useQuery({
    queryKey: ['campaign', campaignId, 'leads'],
    enabled: Number.isFinite(campaignId),
    queryFn: async () => (await api.get<Paginated<Lead>>(`/api/campaigns/${campaignId}/leads/`, { params: { ordering: '-created_at', page_size: 50 } })).data,
  })

  const opportunitiesQuery = useQuery({
    queryKey: ['campaign', campaignId, 'opportunities'],
    enabled: Number.isFinite(campaignId),
    queryFn: async () => (await api.get<Paginated<Opportunity>>('/api/opportunities/', { params: { campaign: campaignId, ordering: '-created_at', page_size: 50 } })).data,
  })

  const updateCampaign = useMutation({
    mutationFn: async (draft: CampaignDraft) => {
      const payload = {
        name: draft.name,
        description: draft.description || '',
        status: draft.status,
        start_date: draft.start_date || null,
        end_date: draft.end_date || null,
        budget: Number(draft.budget || 0),
      }
      return (await api.patch<Campaign>(`/api/campaigns/${campaignId}/`, payload)).data
    },
    onSuccess: async () => {
      setEditOpen(false)
      await qc.invalidateQueries({ queryKey: ['campaign', campaignId] })
      await qc.invalidateQueries({ queryKey: ['campaigns'] })
      await qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const createLead = useMutation({
    mutationFn: async (draft: LeadDraft) => (await api.post<Lead>(`/api/campaigns/${campaignId}/leads/`, draft)).data,
    onSuccess: async () => {
      setCreateLeadOpen(false)
      await qc.invalidateQueries({ queryKey: ['campaign', campaignId, 'leads'] })
      await qc.invalidateQueries({ queryKey: ['leads'] })
      await qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const campaign = campaignQuery.data
  const leads = useMemo(() => leadsQuery.data?.results ?? [], [leadsQuery.data?.results])
  const opportunities = useMemo(() => opportunitiesQuery.data?.results ?? [], [opportunitiesQuery.data?.results])

  if (!Number.isFinite(campaignId)) return <Alert severity="error">Invalid campaign id.</Alert>
  if (campaignQuery.isLoading) return <Typography>Loading…</Typography>
  if (!campaign) return <Alert severity="error">Campaign not found.</Alert>

  const leadStatus = countBy(leads, (l) => l.status)
  const totalLeads = leads.length
  const qualifiedLeads = leadStatus.get('qualified') ?? 0
  const conversionRate = totalLeads ? Math.round((qualifiedLeads / totalLeads) * 1000) / 10 : 0

  const pipelineValue = opportunities
    .filter((o) => o.stage !== 'closed_lost')
    .reduce((sum, o) => sum + Number(o.amount ?? 0), 0)
  const revenueWon = opportunities.filter((o) => o.stage === 'closed_won').reduce((sum, o) => sum + Number(o.amount ?? 0), 0)

  const leadDistributionData = toPieData(leadStatus)

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }} sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ flexGrow: 1 }}>
          <IconButton onClick={() => navigate('/campaigns')}>
            <ArrowBackOutlined />
          </IconButton>
          <AvatarIcon />
          <Box>
            <Typography variant="h5" sx={{ letterSpacing: -0.4 }}>
              {campaign.name}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5, flexWrap: 'wrap' }}>
              <ValueChip kind="campaignStatus" value={campaign.status} />
              <Typography variant="caption" sx={{ opacity: 0.75 }}>
                {campaign.start_date ?? '—'} → {campaign.end_date ?? '—'}
              </Typography>
            </Stack>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button startIcon={<GroupOutlined />} variant="outlined" onClick={() => setCreateLeadOpen(true)}>
            Create Lead
          </Button>
          <Button startIcon={<EditOutlined />} variant="contained" onClick={() => setEditOpen(true)}>
            Edit Campaign
          </Button>
        </Stack>
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(4, 1fr)' }, gap: 2, mb: 2 }}>
        <MetricCard title="Total Leads" value={String(totalLeads)} icon={<GroupOutlined fontSize="small" />} />
        <MetricCard title="Conversion Rate" value={`${conversionRate.toFixed(1)}%`} icon={<PercentOutlined fontSize="small" />} />
        <MetricCard title="Pipeline Value" value={formatMoney(pipelineValue)} icon={<TrendingUpOutlined fontSize="small" />} />
        <MetricCard title="Revenue Won" value={formatMoney(revenueWon)} icon={<PaidOutlined fontSize="small" />} />
      </Box>

      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ pb: 0 }}>
          <Tabs
            value={tab}
            onChange={(_: SyntheticEvent, v: typeof tab) => setTab(v)}
            sx={{ minHeight: 44 }}
            TabIndicatorProps={{ sx: { height: 3, borderRadius: 99 } }}
          >
            <Tab value="overview" label={`Overview`} />
            <Tab value="leads" label={`Leads (${totalLeads})`} />
            <Tab value="opportunities" label={`Opportunities (${opportunities.length})`} />
            <Tab value="analytics" label="Analytics" />
          </Tabs>
        </CardContent>
        <Divider />
        <CardContent>
          {tab === 'overview' ? (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2 }}>
              <Card variant="outlined" sx={{ borderRadius: 3 }}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                    <Typography variant="h6">Campaign Details</Typography>
                    <Chip size="small" label="Click Edit to update" variant="outlined" />
                  </Stack>
                  <Divider sx={{ my: 1.5 }} />
                  <Stack spacing={1}>
                    <DetailRow label="Status" value={campaign.status} />
                    <DetailRow label="Budget" value={formatMoney(Number(campaign.budget ?? 0))} />
                    <DetailRow label="Start Date" value={campaign.start_date ?? '—'} />
                    <DetailRow label="End Date" value={campaign.end_date ?? '—'} />
                  </Stack>
                </CardContent>
              </Card>

              <Card variant="outlined" sx={{ borderRadius: 3 }}>
                <CardContent>
                  <Stack spacing={0.25}>
                    <Typography variant="h6">Lead Distribution</Typography>
                    <Typography variant="body2" sx={{ opacity: 0.75 }}>
                      Leads by status for this campaign
                    </Typography>
                  </Stack>
                  <Divider sx={{ my: 1.5 }} />
                  <Box sx={{ height: 240 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={leadDistributionData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={92} paddingAngle={2}>
                          {leadDistributionData.map((_, idx) => (
                            <Cell key={idx} fill={['#2563eb', '#06b6d4', '#22c55e', '#f97316', '#ef4444'][idx % 5]} />
                          ))}
                        </Pie>
                        <ReTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>

              <Card sx={{ gridColumn: { xs: '1 / -1' } }}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6">Recent Leads</Typography>
                    <Button size="small" onClick={() => setTab('leads')}>
                      View all
                    </Button>
                  </Stack>
                  <Divider sx={{ my: 1.5 }} />
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Lead Name</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Company</TableCell>
                        <TableCell>Created</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {leads.slice(0, 6).map((l) => (
                        <TableRow key={l.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/leads?open=${l.id}`)}>
                          <TableCell>
                            {l.first_name} {l.last_name}
                          </TableCell>
                          <TableCell>{l.status}</TableCell>
                          <TableCell>{l.company || '—'}</TableCell>
                          <TableCell>{l.created_at?.slice(0, 10) ?? ''}</TableCell>
                        </TableRow>
                      ))}
                      {!leadsQuery.isLoading && leads.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4}>No leads</TableCell>
                        </TableRow>
                      ) : null}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card sx={{ gridColumn: { xs: '1 / -1' } }}>
                <CardContent>
                  <AttachmentsPanel entityType="campaign" entityId={campaign.id} />
                </CardContent>
              </Card>

              <Card sx={{ gridColumn: { xs: '1 / -1' } }}>
                <CardContent>
                  <RelatedKnowledgePanel entityType="campaign" entityId={campaign.id} />
                </CardContent>
              </Card>

              <Card sx={{ gridColumn: { xs: '1 / -1' } }}>
                <CardContent>
                  <AuditTimelinePanel entityType="campaign" entityId={campaign.id} />
                </CardContent>
              </Card>
            </Box>
          ) : null}

          {tab === 'leads' ? (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Source</TableCell>
                  <TableCell>Company</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {leads.map((l) => (
                  <TableRow key={l.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/leads?open=${l.id}`)}>
                    <TableCell>
                      {l.first_name} {l.last_name}
                    </TableCell>
                    <TableCell>{l.status}</TableCell>
                    <TableCell>{l.source}</TableCell>
                    <TableCell>{l.company || '—'}</TableCell>
                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                      <Button size="small" onClick={() => navigate(`/leads?open=${l.id}`)}>
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!leadsQuery.isLoading && leads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5}>No leads</TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          ) : null}

          {tab === 'opportunities' ? (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Stage</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell>Close date</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {opportunities.map((o) => (
                  <TableRow key={o.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/opportunities/${o.id}`)}>
                    <TableCell>{o.name}</TableCell>
                    <TableCell>{o.stage}</TableCell>
                    <TableCell align="right">{formatMoney(Number(o.amount ?? 0))}</TableCell>
                    <TableCell>{o.close_date ?? ''}</TableCell>
                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                      <Button size="small" onClick={() => navigate(`/opportunities/${o.id}`)}>
                        Open
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!opportunitiesQuery.isLoading && opportunities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5}>No opportunities</TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          ) : null}

          {tab === 'analytics' ? (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2 }}>
              <Card variant="outlined" sx={{ borderRadius: 3 }}>
                <CardContent>
                  <Stack spacing={0.25}>
                    <Typography variant="h6">Lead Distribution</Typography>
                    <Typography variant="body2" sx={{ opacity: 0.75 }}>
                      Leads by status
                    </Typography>
                  </Stack>
                  <Divider sx={{ my: 1.5 }} />
                  <Box sx={{ height: 240 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={leadDistributionData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={92} paddingAngle={2}>
                          {leadDistributionData.map((_, idx) => (
                            <Cell key={idx} fill={['#2563eb', '#06b6d4', '#22c55e', '#f97316', '#ef4444'][idx % 5]} />
                          ))}
                        </Pie>
                        <ReTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>

              <Card variant="outlined" sx={{ borderRadius: 3 }}>
                <CardContent>
                  <Stack spacing={0.25}>
                    <Typography variant="h6">Opportunity Totals</Typography>
                    <Typography variant="body2" sx={{ opacity: 0.75 }}>
                      Pipeline vs won revenue
                    </Typography>
                  </Stack>
                  <Divider sx={{ my: 1.5 }} />
                  <Stack spacing={1.25}>
                    <DetailRow label="Pipeline value" value={formatMoney(pipelineValue)} />
                    <DetailRow label="Revenue won" value={formatMoney(revenueWon)} />
                    <DetailRow label="Open opportunities" value={String(opportunities.filter((o) => !o.stage.startsWith('closed_')).length)} />
                  </Stack>
                </CardContent>
              </Card>
            </Box>
          ) : null}
        </CardContent>
      </Card>

      {editOpen ? (
        <EditCampaignDialog
          key={campaign.id}
          open={true}
          initial={campaignToDraft(campaign)}
          isSaving={updateCampaign.isPending}
          onClose={() => setEditOpen(false)}
          onSave={(d) => updateCampaign.mutate(d)}
        />
      ) : null}

      {createLeadOpen ? (
        <CreateLeadDialog
          open={true}
          isSaving={createLead.isPending}
          onClose={() => setCreateLeadOpen(false)}
          onCreate={(d) => createLead.mutate(d)}
        />
      ) : null}
    </Box>
  )
}

function AvatarIcon() {
  return (
    <Box
      sx={(t) => ({
        width: 42,
        height: 42,
        borderRadius: 3,
        display: 'grid',
        placeItems: 'center',
        background: `linear-gradient(135deg, ${t.palette.primary.main}, ${t.palette.secondary.main})`,
        color: '#fff',
      })}
    >
      <CampaignOutlined fontSize="small" />
    </Box>
  )
}

function MetricCard({ title, value, icon }: { title: string; value: string; icon: ReactNode }) {
  return (
    <Card sx={{ borderRadius: 3 }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
          <Box>
            <Typography variant="subtitle2" sx={{ opacity: 0.85 }}>
              {title}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 900, mt: 0.75 }}>
              {value}
            </Typography>
          </Box>
          <Box
            sx={(t) => ({
              width: 36,
              height: 36,
              borderRadius: 3,
              display: 'grid',
              placeItems: 'center',
              backgroundColor: t.palette.mode === 'dark' ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.05)',
            })}
          >
            {icon}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
      <Typography variant="body2" sx={{ opacity: 0.75 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 700 }}>
        {value}
      </Typography>
    </Stack>
  )
}

function EditCampaignDialog({
  open,
  initial,
  isSaving,
  onClose,
  onSave,
}: {
  open: boolean
  initial: CampaignDraft
  isSaving: boolean
  onClose: () => void
  onSave: (draft: CampaignDraft) => void
}) {
  const [draft, setDraft] = useState<CampaignDraft>(initial)

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Edit Campaign</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
        <TextField label="Name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        <TextField label="Description" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} multiline minRows={2} />
        <TextField select label="Status" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as Campaign['status'] })}>
          <MenuItem value="draft">draft</MenuItem>
          <MenuItem value="active">active</MenuItem>
          <MenuItem value="completed">completed</MenuItem>
          <MenuItem value="cancelled">cancelled</MenuItem>
        </TextField>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField label="Start date" type="date" value={draft.start_date} onChange={(e) => setDraft({ ...draft, start_date: e.target.value })} InputLabelProps={{ shrink: true }} sx={{ flexGrow: 1 }} />
          <TextField label="End date" type="date" value={draft.end_date} onChange={(e) => setDraft({ ...draft, end_date: e.target.value })} InputLabelProps={{ shrink: true }} sx={{ flexGrow: 1 }} />
        </Stack>
        <TextField label="Budget" type="number" value={draft.budget} onChange={(e) => setDraft({ ...draft, budget: e.target.value })} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={isSaving || !draft.name} onClick={() => onSave(draft)}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  )
}

function CreateLeadDialog({
  open,
  isSaving,
  onClose,
  onCreate,
}: {
  open: boolean
  isSaving: boolean
  onClose: () => void
  onCreate: (draft: LeadDraft) => void
}) {
  const [draft, setDraft] = useState<LeadDraft>({
    first_name: '',
    last_name: '',
    company: '',
    title: '',
    email: '',
    phone: '',
    status: 'new',
    source: 'campaign',
  })

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>New Lead</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField label="First name" value={draft.first_name} onChange={(e) => setDraft({ ...draft, first_name: e.target.value })} sx={{ flexGrow: 1 }} />
          <TextField label="Last name" value={draft.last_name} onChange={(e) => setDraft({ ...draft, last_name: e.target.value })} sx={{ flexGrow: 1 }} />
        </Stack>
        <TextField label="Company" value={draft.company} onChange={(e) => setDraft({ ...draft, company: e.target.value })} />
        <TextField label="Title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
        <TextField label="Email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
        <TextField label="Phone" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField select label="Status" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as Lead['status'] })} sx={{ flexGrow: 1 }}>
            <MenuItem value="new">new</MenuItem>
            <MenuItem value="working">working</MenuItem>
            <MenuItem value="qualified">qualified</MenuItem>
            <MenuItem value="disqualified">disqualified</MenuItem>
            <MenuItem value="converted">converted</MenuItem>
          </TextField>
          <TextField select label="Source" value={draft.source} onChange={(e) => setDraft({ ...draft, source: e.target.value as Lead['source'] })} sx={{ flexGrow: 1 }}>
            <MenuItem value="campaign">campaign</MenuItem>
            <MenuItem value="web">web</MenuItem>
            <MenuItem value="email">email</MenuItem>
            <MenuItem value="phone">phone</MenuItem>
            <MenuItem value="referral">referral</MenuItem>
            <MenuItem value="other">other</MenuItem>
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={isSaving || !draft.last_name} onClick={() => onCreate(draft)}>
          Create
        </Button>
      </DialogActions>
    </Dialog>
  )
}

function campaignToDraft(c: Campaign): CampaignDraft {
  return {
    name: c.name,
    description: c.description ?? '',
    status: c.status,
    start_date: c.start_date ?? '',
    end_date: c.end_date ?? '',
    budget: String(c.budget ?? 0),
  }
}

function countBy<T>(items: T[], getKey: (it: T) => string) {
  const m = new Map<string, number>()
  for (const it of items) {
    const k = getKey(it)
    m.set(k, (m.get(k) ?? 0) + 1)
  }
  return m
}

function toPieData(counts: Map<string, number>) {
  return Array.from(counts.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

function formatMoney(value: number) {
  const v = Number.isFinite(value) ? value : 0
  return `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}
