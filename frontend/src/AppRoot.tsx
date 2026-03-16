import { CssBaseline } from '@mui/material'
import { ThemeProvider } from '@mui/material/styles'
import { useMemo } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { useAppSettings } from './app/useAppSettings'
import { AuthProvider } from './auth/AuthProvider'
import App from './App'
import { createAppTheme } from './theme/createAppTheme'

export function AppRoot() {
  const { settings } = useAppSettings()
  const theme = useMemo(() => createAppTheme(settings.themeMode), [settings.themeMode])
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}
