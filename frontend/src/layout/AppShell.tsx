import AnalyticsOutlinedIcon from '@mui/icons-material/AnalyticsOutlined'
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined'
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined'
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined'
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined'
import EmojiEventsOutlinedIcon from '@mui/icons-material/EmojiEventsOutlined'
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined'
import LibraryBooksOutlinedIcon from '@mui/icons-material/LibraryBooksOutlined'
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined'
import MenuIcon from '@mui/icons-material/Menu'
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined'
import SearchIcon from '@mui/icons-material/Search'
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined'
import SupportAgentOutlinedIcon from '@mui/icons-material/SupportAgentOutlined'
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined'
import {
  AppBar,
  Avatar,
  Box,
  Chip,
  Drawer,
  IconButton,
  InputBase,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import { useMemo, useState, type ReactNode } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAppSettings } from '../app/useAppSettings'
import { useAuth } from '../auth/useAuth'

const drawerWidth = 284

type NavItem = { label: string; path: string; icon: ReactNode }
type NavGroup = { title: string; items: NavItem[] }

/** Main authenticated layout: navigation drawer, top bar, theme toggle, and outlet routing. */
export function AppShell() {
  const { user, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { settings, setThemeMode } = useAppSettings()
  const [query, setQuery] = useState('')

  const groups = useMemo<NavGroup[]>(() => {
    const adminItems: NavItem[] = user?.is_staff ? [{ label: 'Users', path: '/admin/users', icon: <GroupOutlinedIcon fontSize="small" /> }] : []
    return [
      {
        title: 'Overview',
        items: [
          { label: 'Dashboard', path: '/', icon: <DashboardOutlinedIcon fontSize="small" /> },
          { label: 'Gamification', path: '/gamification', icon: <EmojiEventsOutlinedIcon fontSize="small" /> },
        ],
      },
      {
        title: 'Sales',
        items: [
          { label: 'Campaigns', path: '/campaigns', icon: <CampaignOutlinedIcon fontSize="small" /> },
          { label: 'Leads', path: '/leads', icon: <AutoAwesomeOutlinedIcon fontSize="small" /> },
          { label: 'Opportunities', path: '/opportunities', icon: <TrendingUpOutlinedIcon fontSize="small" /> },
          { label: 'Accounts', path: '/accounts', icon: <TrendingUpOutlinedIcon fontSize="small" /> },
          { label: 'Contacts', path: '/contacts', icon: <GroupOutlinedIcon fontSize="small" /> },
        ],
      },
      {
        title: 'Customer Service',
        items: [
          { label: 'Cases', path: '/cases', icon: <SupportAgentOutlinedIcon fontSize="small" /> },
          { label: 'Incidents (War Room)', path: '/incidents', icon: <ReportProblemOutlinedIcon fontSize="small" /> },
        ],
      },
      {
        title: 'Product',
        items: [{ label: 'Catalog', path: '/products', icon: <ShoppingBagOutlinedIcon fontSize="small" /> }],
      },
      {
        title: 'Tools',
        items: [
          { label: 'Knowledge Articles', path: '/knowledge', icon: <LibraryBooksOutlinedIcon fontSize="small" /> },
          { label: 'Templates', path: '/templates', icon: <AutoAwesomeOutlinedIcon fontSize="small" /> },
          { label: 'Reports', path: '/reports', icon: <AnalyticsOutlinedIcon fontSize="small" /> },
        ],
      },
      ...(adminItems.length
        ? [
            {
              title: 'Admin',
              items: adminItems,
            },
          ]
        : []),
      {
        title: 'Settings',
        items: [
          { label: 'Audit & RBAC', path: '/settings/governance', icon: <AnalyticsOutlinedIcon fontSize="small" /> },
          { label: 'Platform APIs', path: '/settings/platform', icon: <AutoAwesomeOutlinedIcon fontSize="small" /> },
          { label: 'Integrations', path: '/settings/integrations', icon: <TrendingUpOutlinedIcon fontSize="small" /> },
        ],
      },
    ]
  }, [user?.is_staff])

  const drawer = (
    <Box sx={{ width: drawerWidth, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar sx={{ gap: 1.25 }}>
        <Box
          sx={{
            width: 34,
            height: 34,
            borderRadius: 2.5,
            background: (t) => `linear-gradient(135deg, ${t.palette.primary.main}, ${t.palette.secondary.main})`,
          }}
        />
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, letterSpacing: -0.4 }}>
            Engagement CRM
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.75 }}>
            {user ? `${user.first_name || user.username}` : 'Signed out'}
          </Typography>
        </Box>
      </Toolbar>

      <Box sx={{ px: 2, pb: 1 }}>
        <Box
          sx={(t) => ({
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 1.5,
            py: 1,
            borderRadius: 3,
            backgroundColor: alpha(t.palette.text.primary, t.palette.mode === 'dark' ? 0.06 : 0.04),
            border: `1px solid ${alpha(t.palette.text.primary, t.palette.mode === 'dark' ? 0.10 : 0.08)}`,
          })}
        >
          <SearchIcon />
          <InputBase
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search modules…"
            sx={{ width: '100%' }}
          />
        </Box>
      </Box>

      <Box sx={{ overflow: 'auto', px: 1.25, pb: 2 }}>
        {groups.map((g) => {
          const visible = g.items.filter((it) => it.label.toLowerCase().includes(query.trim().toLowerCase()))
          if (query.trim() && visible.length === 0) return null
          return (
            <Box key={g.title} sx={{ mb: 1.25 }}>
              <Typography variant="caption" sx={{ px: 1.25, opacity: 0.75 }}>
                {g.title}
              </Typography>
              <List dense disablePadding>
                {(query.trim() ? visible : g.items).map((it) => {
                  const selected = it.path === '/' ? location.pathname === '/' : location.pathname.startsWith(it.path)
                  return (
                    <ListItemButton
                      key={it.path}
                      selected={selected}
                      onClick={() => {
                        navigate(it.path)
                        setMobileOpen(false)
                      }}
                      sx={{ borderRadius: 2, mx: 0.75, my: 0.25 }}
                    >
                      <ListItemIcon sx={{ minWidth: 36 }}>{it.icon}</ListItemIcon>
                      <ListItemText primary={it.label} />
                    </ListItemButton>
                  )
                })}
              </List>
            </Box>
          )
        })}
      </Box>

      <Box sx={{ p: 2, pt: 0 }}>
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
          <Chip
            size="small"
            label={settings.themeMode === 'dark' ? 'Dark' : 'Light'}
            variant="outlined"
            onClick={() => setThemeMode(settings.themeMode === 'dark' ? 'light' : 'dark')}
          />
          <Stack direction="row" spacing={1} alignItems="center">
            <Tooltip title={settings.themeMode === 'dark' ? 'Switch to light' : 'Switch to dark'}>
              <IconButton onClick={() => setThemeMode(settings.themeMode === 'dark' ? 'light' : 'dark')}>
                {settings.themeMode === 'dark' ? <LightModeOutlinedIcon fontSize="small" /> : <DarkModeOutlinedIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
            <Tooltip title="Logout">
              <IconButton
                onClick={() => {
                  logout()
                  navigate('/login')
                }}
              >
                <Avatar sx={{ width: 28, height: 28 }}>{user?.first_name?.[0] || user?.username?.[0] || 'U'}</Avatar>
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </Box>
    </Box>
  )

  return (
    <Box
      sx={(t) => ({
        minHeight: '100vh',
        display: 'flex',
        background:
          t.palette.mode === 'dark'
            ? 'radial-gradient(1000px 600px at 20% -10%, rgba(124,58,237,0.35), transparent 55%), radial-gradient(1000px 600px at 90% 0%, rgba(6,182,212,0.22), transparent 55%), linear-gradient(180deg, #0b1020 0%, #070a14 60%)'
            : 'radial-gradient(900px 500px at 20% 0%, rgba(124,58,237,0.18), transparent 50%), radial-gradient(900px 500px at 90% 0%, rgba(6,182,212,0.16), transparent 50%), linear-gradient(180deg, #f6f7fb 0%, #eef0f7 60%)',
      })}
    >
      <AppBar
        position="fixed"
        color="transparent"
        elevation={0}
        sx={(t) => ({
          zIndex: t.zIndex.drawer + 1,
          backgroundColor: alpha(t.palette.background.default, t.palette.mode === 'dark' ? 0.65 : 0.75),
        })}
      >
        <Toolbar sx={{ gap: 1.5 }}>
          <IconButton edge="start" onClick={() => setMobileOpen(true)} sx={{ display: { sm: 'none' } }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="subtitle1" sx={{ flexGrow: 1, fontWeight: 800, letterSpacing: -0.3 }}>
            {location.pathname === '/' ? 'Dashboard' : location.pathname.replaceAll('/', ' / ')}
          </Typography>
          <Tooltip title={settings.themeMode === 'dark' ? 'Switch to light' : 'Switch to dark'}>
            <IconButton onClick={() => setThemeMode(settings.themeMode === 'dark' ? 'light' : 'dark')}>
              {settings.themeMode === 'dark' ? <LightModeOutlinedIcon /> : <DarkModeOutlinedIcon />}
            </IconButton>
          </Tooltip>
          <Avatar sx={{ width: 30, height: 30 }}>{user?.first_name?.[0] || user?.username?.[0] || 'U'}</Avatar>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ display: { xs: 'block', sm: 'none' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth } }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{ display: { xs: 'none', sm: 'block' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth } }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box component="main" sx={{ flexGrow: 1, px: { xs: 2, sm: 3 }, py: 3 }}>
        <Toolbar />
        <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  )
}
