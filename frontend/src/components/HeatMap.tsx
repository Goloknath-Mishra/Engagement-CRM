import { Box, Tooltip, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'

/** Lightweight SVG heat map grid for compact visual summaries. */
export function HeatMap({
  title,
  xLabels,
  yLabels,
  values,
}: {
  title: string
  xLabels: string[]
  yLabels: string[]
  values: number[][]
}) {
  const flat = values.flat()
  const max = Math.max(1, ...flat)

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
        {title}
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: `100px repeat(${xLabels.length}, 1fr)`, gap: 0.75, alignItems: 'center' }}>
        <Box />
        {xLabels.map((x) => (
          <Typography key={x} variant="caption" sx={{ opacity: 0.75, textAlign: 'center' }}>
            {x}
          </Typography>
        ))}
        {yLabels.map((y, yi) => (
          <Box key={y} sx={{ display: 'contents' }}>
            <Typography variant="caption" sx={{ opacity: 0.75 }}>
              {y}
            </Typography>
            {xLabels.map((_, xi) => {
              const v = values[yi]?.[xi] ?? 0
              const p = v / max
              return (
                <Tooltip key={`${y}-${xi}`} title={`${y} · ${xLabels[xi]}: ${v}`}>
                  <Box
                    sx={(t) => ({
                      height: 20,
                      borderRadius: 1.5,
                      border: `1px solid ${alpha(t.palette.text.primary, t.palette.mode === 'dark' ? 0.10 : 0.08)}`,
                      background: `linear-gradient(135deg, rgba(6,182,212,${0.18 + 0.45 * p}), rgba(124,58,237,${
                        0.12 + 0.55 * p
                      }))`,
                    })}
                  />
                </Tooltip>
              )
            })}
          </Box>
        ))}
      </Box>
    </Box>
  )
}
