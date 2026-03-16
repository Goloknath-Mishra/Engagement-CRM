import { EmojiEventsOutlined, GroupsOutlined, PersonOutlined, ShareOutlined } from '@mui/icons-material'
import { Alert, Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider, LinearProgress, MenuItem, Stack, Tab, Tabs, TextField, Typography } from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState, type SyntheticEvent } from 'react'
import { api } from '../api/apiClient'
import type { GamificationBadge, GamificationBadgeAward, GamificationChallenge, GamificationChallengeProgress, Paginated, UserRef } from '../api/types'

type ModuleKey = 'sales' | 'service' | 'marketing'

type IndividualLeaderboardRow = { user: UserRef; points: number }
type TeamLeaderboardRow = { team_id: number; team_name: string; points: number }
type LeaderboardResponse = { mode: 'team'; rows: TeamLeaderboardRow[] } | { mode: 'individual'; rows: IndividualLeaderboardRow[] }

export function GamificationPage() {
  const qc = useQueryClient()
  const [module, setModule] = useState<ModuleKey>('sales')
  const [tab, setTab] = useState<'challenges' | 'leaderboard' | 'badges'>('challenges')
  const [selectedChallengeId, setSelectedChallengeId] = useState<number | null>(null)
  const [share, setShare] = useState<GamificationBadgeAward | null>(null)
  const [badgesView, setBadgesView] = useState<'my' | 'catalog'>('catalog')

  const challengesQuery = useQuery({
    queryKey: ['gamification', 'challenges', module],
    queryFn: async () => (await api.get<Paginated<GamificationChallenge>>('/api/gamification/challenges/', { params: { module, is_active: 'true', ordering: '-start_at' } })).data,
  })

  const badgesQuery = useQuery({
    queryKey: ['gamification', 'my-badges'],
    queryFn: async () => (await api.get<Paginated<GamificationBadgeAward>>('/api/gamification/my-badges/', { params: { ordering: '-created_at' } })).data,
  })

  const badgesCatalogQuery = useQuery({
    queryKey: ['gamification', 'badges', module],
    queryFn: async () => (await api.get<Paginated<GamificationBadge>>('/api/gamification/badges/', { params: { module, ordering: 'name', page_size: 100 } })).data,
    enabled: tab === 'badges' && badgesView === 'catalog',
  })

  const challenges = useMemo(() => challengesQuery.data?.results ?? [], [challengesQuery.data?.results])
  const badges = useMemo(() => badgesQuery.data?.results ?? [], [badgesQuery.data?.results])
  const badgesCatalog = useMemo(() => badgesCatalogQuery.data?.results ?? [], [badgesCatalogQuery.data?.results])

  const activeChallengeId = selectedChallengeId ?? challenges[0]?.id ?? null

  const progressQuery = useQuery({
    queryKey: ['gamification', 'progress', activeChallengeId],
    enabled: tab !== 'badges' && activeChallengeId != null,
    queryFn: async () => (await api.get<GamificationChallengeProgress>(`/api/gamification/challenges/${activeChallengeId}/progress/`)).data,
    refetchInterval: 8000,
  })

  const leaderboardQuery = useQuery({
    queryKey: ['gamification', 'leaderboard', activeChallengeId],
    enabled: tab === 'leaderboard' && activeChallengeId != null,
    queryFn: async () => (await api.get<LeaderboardResponse>(`/api/gamification/challenges/${activeChallengeId}/leaderboard/`)).data,
    refetchInterval: 12000,
  })

  const joinMutation = useMutation({
    mutationFn: async ({ challengeId, teamId }: { challengeId: number; teamId?: number }) => {
      return (await api.post(`/api/gamification/challenges/${challengeId}/join/`, teamId ? { team_id: teamId } : {})).data
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['gamification', 'progress', activeChallengeId] })
      await qc.invalidateQueries({ queryKey: ['gamification', 'leaderboard', activeChallengeId] })
      await qc.invalidateQueries({ queryKey: ['gamification', 'my-badges'] })
    },
  })

  const bootstrapMutation = useMutation({
    mutationFn: async () => (await api.post('/api/gamification/admin/bootstrap/', {})).data,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['gamification', 'challenges'] })
      await qc.invalidateQueries({ queryKey: ['gamification', 'my-badges'] })
    },
  })

  const selectedChallenge = useMemo(() => challenges.find((c) => c.id === activeChallengeId) ?? null, [challenges, activeChallengeId])

  const shareText = share
    ? `I earned the "${share.badge.name}" badge (${share.badge.module.toUpperCase()}) with ${share.points_at_award} points.`
    : ''

  return (
    <Box>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }} sx={{ mb: 2 }}>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h5">Gamification</Typography>
          <Typography variant="body2" sx={{ opacity: 0.8, mt: 0.5 }}>
            Individual and team challenges with rewards and shareable badges.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Chip label="Sales" color={module === 'sales' ? 'primary' : 'default'} onClick={() => setModule('sales')} sx={{ cursor: 'pointer' }} />
          <Chip label="Service" color={module === 'service' ? 'primary' : 'default'} onClick={() => setModule('service')} sx={{ cursor: 'pointer' }} />
          <Chip label="Marketing" color={module === 'marketing' ? 'primary' : 'default'} onClick={() => setModule('marketing')} sx={{ cursor: 'pointer' }} />
        </Stack>
      </Stack>

      {!challengesQuery.isLoading && challenges.length === 0 ? (
        <Alert
          severity="info"
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" disabled={bootstrapMutation.isPending} onClick={() => bootstrapMutation.mutate()}>
              Create sample challenges
            </Button>
          }
        >
          No challenges found for this module.
        </Alert>
      ) : null}

      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ pb: 0 }}>
          <Tabs value={tab} onChange={(_: SyntheticEvent, v: typeof tab) => setTab(v)}>
            <Tab value="challenges" label="Challenges" />
            <Tab value="leaderboard" label="Leaderboard" />
            <Tab value="badges" label="Badges" />
          </Tabs>
        </CardContent>
        <Divider />
        <CardContent>
          {tab !== 'badges' ? (
            <TextField
              select
              size="small"
              label="Challenge"
              value={activeChallengeId ?? ''}
              onChange={(e) => setSelectedChallengeId(Number(e.target.value))}
              sx={{ minWidth: 320, mb: 2 }}
            >
              {challenges.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name} · {c.mode}
                </MenuItem>
              ))}
            </TextField>
          ) : null}

          {tab === 'challenges' ? (
            <Stack spacing={2}>
              {selectedChallenge ? (
                <ChallengeCard
                  challenge={selectedChallenge}
                  progress={progressQuery.data ?? null}
                  isLoading={progressQuery.isLoading}
                  onJoin={(teamId) => joinMutation.mutate({ challengeId: selectedChallenge.id, teamId })}
                  isJoining={joinMutation.isPending}
                />
              ) : null}

              <Divider />

              <Typography variant="h6">All Challenges</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                {challenges.map((c) => (
                  <MiniChallengeCard
                    key={c.id}
                    challenge={c}
                    selected={c.id === activeChallengeId}
                    onSelect={() => {
                      setSelectedChallengeId(c.id)
                      setTab('challenges')
                    }}
                  />
                ))}
              </Box>
            </Stack>
          ) : null}

          {tab === 'leaderboard' ? (
            <Box>
              {!selectedChallenge ? <Alert severity="info">Select a challenge.</Alert> : null}
              {leaderboardQuery.data ? (
                <LeaderboardTable mode={leaderboardQuery.data.mode} rows={leaderboardQuery.data.rows} />
              ) : leaderboardQuery.isLoading ? (
                <Typography>Loading…</Typography>
              ) : null}
            </Box>
          ) : null}

          {tab === 'badges' ? (
            <Box>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2, flexWrap: 'wrap' }}>
                <Chip
                  label="Badge catalog"
                  color={badgesView === 'catalog' ? 'primary' : 'default'}
                  onClick={() => setBadgesView('catalog')}
                  sx={{ cursor: 'pointer' }}
                />
                <Chip label="My awards" color={badgesView === 'my' ? 'primary' : 'default'} onClick={() => setBadgesView('my')} sx={{ cursor: 'pointer' }} />
              </Stack>

              {badgesView === 'catalog' ? (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
                  {badgesCatalog.map((b) => (
                    <BadgeCatalogCard key={b.id} badge={b} earned={badges.some((a) => a.badge.id === b.id)} />
                  ))}
                  {!badgesCatalogQuery.isLoading && badgesCatalog.length === 0 ? <Typography>No badges.</Typography> : null}
                </Box>
              ) : (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
                  {badges.map((b) => (
                    <BadgeCard key={b.id} award={b} onShare={() => setShare(b)} />
                  ))}
                  {!badgesQuery.isLoading && badges.length === 0 ? <Typography>No awards yet. Join challenges and earn points.</Typography> : null}
                </Box>
              )}
            </Box>
          ) : null}
        </CardContent>
      </Card>

      {share ? (
        <Dialog open={true} onClose={() => setShare(null)} fullWidth maxWidth="sm">
          <DialogTitle>Share badge</DialogTitle>
          <DialogContent sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              Copy text or download a badge card.
            </Typography>
            <TextField multiline minRows={3} value={shareText} />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShare(null)}>Close</Button>
            <Button
              variant="outlined"
              onClick={async () => {
                await navigator.clipboard.writeText(shareText)
              }}
            >
              Copy
            </Button>
            <Button
              variant="contained"
              onClick={() => {
                const svg = badgeSvg(share.badge.name, share.badge.module, share.badge.color_primary, share.badge.color_secondary)
                downloadSvg(svg, `badge-${share.badge.name.replaceAll(' ', '-')}.svg`)
              }}
            >
              Download
            </Button>
          </DialogActions>
        </Dialog>
      ) : null}
    </Box>
  )
}

function ChallengeCard({
  challenge,
  progress,
  isLoading,
  onJoin,
  isJoining,
}: {
  challenge: GamificationChallenge
  progress: GamificationChallengeProgress | null
  isLoading: boolean
  onJoin: (teamId?: number) => void
  isJoining: boolean
}) {
  const teamsQuery = useQuery({
    queryKey: ['gamification', 'teams'],
    queryFn: async () => (await api.get<Paginated<{ id: number; name: string }>>('/api/gamification/teams/')).data,
    enabled: challenge.mode === 'team',
  })
  const teams = teamsQuery.data?.results ?? []
  const [teamId, setTeamId] = useState<number | ''>('')

  const percent = progress?.percent ?? 0
  const points = progress?.points ?? 0
  const target = challenge.target_points

  return (
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
      <CardContent>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'flex-start' }} justifyContent="space-between">
          <Box sx={{ flexGrow: 1 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap' }}>
              <Typography variant="h6">{challenge.name}</Typography>
              <Chip size="small" icon={challenge.mode === 'team' ? <GroupsOutlined /> : <PersonOutlined />} label={challenge.mode} variant="outlined" />
              {challenge.reward_badge ? <Chip size="small" icon={<EmojiEventsOutlined />} label="Reward badge" color="secondary" /> : null}
            </Stack>
            <Typography variant="body2" sx={{ opacity: 0.8, mt: 0.75, whiteSpace: 'pre-wrap' }}>
              {challenge.description || '—'}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mt: 1 }}>
              {challenge.start_at.slice(0, 10)} → {challenge.end_at.slice(0, 10)} · Target {target} pts
            </Typography>
          </Box>

          <Stack spacing={1.25} sx={{ minWidth: 280 }}>
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
              <Typography variant="subtitle2">Progress</Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>
                {points}/{target}
              </Typography>
            </Stack>
            <LinearProgress variant="determinate" value={percent} sx={{ height: 10, borderRadius: 99 }} />
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
              <Typography variant="caption" sx={{ opacity: 0.7 }}>
                {progress?.events_count ?? 0} events
              </Typography>
              {progress?.badge_awarded ? (
                <Chip size="small" label="Badge unlocked" color="success" />
              ) : (
                <Chip size="small" label={`${percent}%`} variant="outlined" />
              )}
            </Stack>

            {challenge.mode === 'team' ? (
              <TextField size="small" select label="Team" value={teamId} onChange={(e) => setTeamId(Number(e.target.value))}>
                <MenuItem value="" disabled>
                  Select…
                </MenuItem>
                {teams.map((t) => (
                  <MenuItem key={t.id} value={t.id}>
                    {t.name}
                  </MenuItem>
                ))}
              </TextField>
            ) : null}

            <Button
              variant="contained"
              disabled={isJoining || (challenge.mode === 'team' && !teamId)}
              onClick={() => onJoin(challenge.mode === 'team' ? Number(teamId) : undefined)}
            >
              Join challenge
            </Button>

            {isLoading ? <Typography variant="body2">Loading…</Typography> : null}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  )
}

function MiniChallengeCard({ challenge, selected, onSelect }: { challenge: GamificationChallenge; selected: boolean; onSelect: () => void }) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 3, cursor: 'pointer', borderColor: selected ? 'primary.main' : undefined }} onClick={onSelect}>
      <CardContent>
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
          <Typography variant="subtitle1" sx={{ fontWeight: 850 }}>
            {challenge.name}
          </Typography>
          <Chip size="small" label={challenge.mode} variant="outlined" />
        </Stack>
        <Typography variant="body2" sx={{ opacity: 0.75, mt: 0.75 }}>
          Target {challenge.target_points} pts
        </Typography>
      </CardContent>
    </Card>
  )
}

function LeaderboardTable({ mode, rows }: { mode: 'team' | 'individual'; rows: TeamLeaderboardRow[] | IndividualLeaderboardRow[] }) {
  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 1 }}>
        Leaderboard ({mode})
      </Typography>
      <Divider sx={{ mb: 2 }} />
      <Stack spacing={1}>
        {rows.map((r, idx) => (
          <Card key={idx} variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent sx={{ py: 1.25, '&:last-child': { pb: 1.25 } }}>
              <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between">
                <Typography variant="subtitle2" sx={{ fontWeight: 850 }}>
                  #{idx + 1}{' '}
                  {mode === 'team'
                    ? (r as TeamLeaderboardRow).team_name
                    : `${(r as IndividualLeaderboardRow).user.first_name || ''} ${(r as IndividualLeaderboardRow).user.last_name || ''}`.trim() ||
                      (r as IndividualLeaderboardRow).user.username}
                </Typography>
                <Chip size="small" label={`${(r as IndividualLeaderboardRow | TeamLeaderboardRow).points} pts`} color="primary" />
              </Stack>
            </CardContent>
          </Card>
        ))}
        {rows.length === 0 ? <Typography>No data yet.</Typography> : null}
      </Stack>
    </Box>
  )
}

function BadgeCard({ award, onShare }: { award: GamificationBadgeAward; onShare: () => void }) {
  const b = award.badge
  const bg = `linear-gradient(135deg, ${b.color_primary || '#111827'} 0%, ${b.color_secondary || '#6b7280'} 100%)`
  return (
    <Card sx={{ borderRadius: 3, color: '#fff', background: bg }}>
      <CardContent>
        <Stack direction="row" spacing={1.5} alignItems="flex-start" justifyContent="space-between">
          <Box>
            <Typography variant="overline" sx={{ opacity: 0.9 }}>
              {b.module.toUpperCase()}
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 900, mt: 0.25 }}>
              {b.name}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.75 }}>
              {b.description}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.85, display: 'block', mt: 1 }}>
              {award.created_at.slice(0, 10)} · {award.points_at_award} pts
            </Typography>
          </Box>
          <Button size="small" variant="contained" startIcon={<ShareOutlined />} onClick={onShare} sx={{ bgcolor: 'rgba(255,255,255,0.18)' }}>
            Share
          </Button>
        </Stack>
      </CardContent>
    </Card>
  )
}

function BadgeCatalogCard({ badge, earned }: { badge: GamificationBadge; earned: boolean }) {
  const bg = `linear-gradient(135deg, ${badge.color_primary || '#111827'} 0%, ${badge.color_secondary || '#6b7280'} 100%)`
  return (
    <Card sx={{ borderRadius: 3, color: '#fff', background: bg }}>
      <CardContent>
        <Stack direction="row" spacing={1.5} alignItems="flex-start" justifyContent="space-between">
          <Box>
            <Typography variant="overline" sx={{ opacity: 0.9 }}>
              {badge.module.toUpperCase()}
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 900, mt: 0.25 }}>
              {badge.name}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.75 }}>
              {badge.description}
            </Typography>
          </Box>
          {earned ? <Chip size="small" label="Earned" color="success" /> : <Chip size="small" label="Locked" variant="outlined" sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.6)' }} />}
        </Stack>
      </CardContent>
    </Card>
  )
}

function badgeSvg(title: string, module: string, c1: string, c2: string) {
  const safeTitle = title.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  const safeModule = module.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  const grad1 = c1 || '#111827'
  const grad2 = c2 || '#6b7280'
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${grad1}"/>
      <stop offset="100%" stop-color="${grad2}"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="1200" height="630" rx="48" fill="url(#g)"/>
  <text x="80" y="180" font-family="Inter, Arial, sans-serif" font-size="32" fill="rgba(255,255,255,0.85)">${safeModule.toUpperCase()} BADGE</text>
  <text x="80" y="280" font-family="Inter, Arial, sans-serif" font-size="78" font-weight="900" fill="#ffffff">${safeTitle}</text>
  <text x="80" y="360" font-family="Inter, Arial, sans-serif" font-size="30" fill="rgba(255,255,255,0.85)">Engagement Manager</text>
</svg>`
}

function downloadSvg(svg: string, filename: string) {
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
