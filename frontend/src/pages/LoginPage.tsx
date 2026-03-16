import { Alert, Box, Button, Card, CardContent, Container, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Stack, TextField, Typography } from '@mui/material'
import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { api } from '../api/apiClient'
import { useAuth } from '../auth/useAuth'

/** Authentication entry point with username/password login and forgot-password flow. */
export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [resetValue, setResetValue] = useState('')
  const [resetStatus, setResetStatus] = useState<'idle' | 'sending' | 'sent'>('idle')

  const from = (location.state as { from?: string } | null)?.from ?? '/'

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await login(username, password)
      navigate(from, { replace: true })
    } catch {
      setError('Invalid credentials or server unavailable.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Container maxWidth="sm">
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', py: 6 }}>
        <Card sx={{ width: '100%', maxWidth: 560 }}>
          <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="h4" sx={{ letterSpacing: -0.6 }}>
                    Engagement CRM
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8, mt: 0.5 }}>
                    Sign in to access Sales and Customer Service modules
                  </Typography>
                </Box>
              </Box>

              {error ? (
                <Alert severity="error" onClose={() => setError(null)}>
                  {error}
                </Alert>
              ) : null}

              <Divider />

              <Box component="form" onSubmit={onSubmit}>
                <Stack spacing={2}>
                  <TextField
                    label="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoFocus
                  />
                  <TextField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                  <Button variant="contained" type="submit" disabled={busy || !username || !password}>
                    {busy ? 'Signing in…' : 'Sign in'}
                  </Button>
                  <Button
                    variant="text"
                    onClick={() => {
                      setResetOpen(true)
                      setResetStatus('idle')
                      setResetValue('')
                    }}
                    sx={{ alignSelf: 'flex-start' }}
                  >
                    Forgot password?
                  </Button>
                  <Typography variant="caption" sx={{ opacity: 0.75 }}>
                    API login expects a running backend at http://localhost:8000
                  </Typography>
                </Stack>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Box>
      <Dialog open={resetOpen} onClose={() => setResetOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Reset password</DialogTitle>
        <DialogContent sx={{ mt: 1 }}>
          <Stack spacing={2}>
            {resetStatus === 'sent' ? <Alert severity="success">If the account exists, reset instructions have been sent.</Alert> : null}
            <TextField
              label="Email or username"
              value={resetValue}
              onChange={(e) => setResetValue(e.target.value)}
              disabled={resetStatus === 'sending'}
              autoFocus
            />
            <Typography variant="caption" sx={{ opacity: 0.75 }}>
              This sends a reset request to the server. Your admin can also reset passwords from User Management.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetOpen(false)}>Close</Button>
          <Button
            variant="contained"
            disabled={!resetValue.trim() || resetStatus === 'sending'}
            onClick={async () => {
              setResetStatus('sending')
              try {
                const value = resetValue.trim()
                const payload = value.includes('@') ? { email: value } : { username: value }
                await api.post('/api/auth/password-reset/', payload)
                setResetStatus('sent')
              } catch {
                setResetStatus('sent')
              }
            }}
          >
            Send reset link
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
