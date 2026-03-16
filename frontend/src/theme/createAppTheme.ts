import { alpha, createTheme } from '@mui/material/styles'

export function createAppTheme(mode: 'light' | 'dark') {
  const theme = createTheme({
    palette: {
      mode,
      primary: { main: '#7c3aed' },
      secondary: { main: '#06b6d4' },
      background: mode === 'dark' ? { default: '#0b1020', paper: '#0f1733' } : { default: '#f6f7fb', paper: '#ffffff' },
    },
    shape: { borderRadius: 14 },
    typography: {
      fontFamily:
        'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
      h5: { fontWeight: 750 },
      h6: { fontWeight: 720 },
      button: { textTransform: 'none', fontWeight: 650 },
    },
  })

  return createTheme(theme, {
    components: {
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            border: `1px solid ${alpha(theme.palette.text.primary, mode === 'dark' ? 0.08 : 0.06)}`,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            border: `1px solid ${alpha(theme.palette.text.primary, mode === 'dark' ? 0.08 : 0.06)}`,
            boxShadow: mode === 'dark' ? '0 18px 50px rgba(0,0,0,0.35)' : '0 18px 50px rgba(16,24,40,0.10)',
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backdropFilter: 'blur(10px)',
            borderBottom: `1px solid ${alpha(theme.palette.text.primary, mode === 'dark' ? 0.10 : 0.08)}`,
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: { borderRadius: 12 },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { borderRadius: 10 },
        },
      },
    },
  })
}
