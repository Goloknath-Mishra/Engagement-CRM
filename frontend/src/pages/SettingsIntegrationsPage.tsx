import { Box, Card, CardContent, Chip, Divider, Stack, Typography } from '@mui/material'

/** Integrations settings page (placeholder for connectors and external system sync). */
export function SettingsIntegrationsPage() {
  return (
    <Box>
      <Typography variant="h5">Integrations</Typography>
      <Typography variant="body2" sx={{ opacity: 0.8, mt: 0.5 }}>
        Seamless connections to external systems
      </Typography>

      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
            <Chip label="LinkedIn Sales Navigator" color="secondary" />
            <Chip label="Email/SMS providers" variant="outlined" />
            <Chip label="Data enrichment" variant="outlined" />
            <Chip label="Power Platform-style automation" variant="outlined" />
          </Stack>
          <Divider sx={{ my: 2 }} />
          <Typography variant="body2" sx={{ opacity: 0.85 }}>
            Highlights:
            {'\n'}- LinkedIn decision-maker enrichment into account hierarchy
            {'\n'}- External data enrichment for CDP profiles
            {'\n'}- Routing and workflow automation integrations
          </Typography>
        </CardContent>
      </Card>
    </Box>
  )
}
