import { Box, Card, CardContent, Chip, Divider, Stack, Typography } from '@mui/material'

/** Platform settings page (placeholder for API keys, webhooks, and system configuration). */
export function SettingsPlatformPage() {
  return (
    <Box>
      <Typography variant="h5">Platform APIs</Typography>
      <Typography variant="body2" sx={{ opacity: 0.8, mt: 0.5 }}>
        Extensibility via APIs and automation hooks
      </Typography>

      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
            <Chip label="REST APIs" color="secondary" />
            <Chip label="Webhooks" variant="outlined" />
            <Chip label="Automation" variant="outlined" />
          </Stack>
          <Divider sx={{ my: 2 }} />
          <Typography variant="body2" sx={{ opacity: 0.85 }}>
            Highlights:
            {'\n'}- Unified APIs for leads, opportunities, cases, campaigns, products
            {'\n'}- Event hooks for “case created”, “lead converted”, “journey triggered”
            {'\n'}- Integration pattern for Power Platform-style workflows
          </Typography>
        </CardContent>
      </Card>
    </Box>
  )
}
