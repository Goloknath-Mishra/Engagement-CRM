import { Box, Typography } from '@mui/material'
import { useMemo } from 'react'

/** Simple gauge visualization for progress/threshold style metrics. */
export function MeterGauge({
  value,
  min = 0,
  max = 100,
  label,
  sublabel,
}: {
  value: number
  min?: number
  max?: number
  label: string
  sublabel?: string
}) {
  const pct = useMemo(() => {
    const clamped = Math.min(max, Math.max(min, value))
    return ((clamped - min) / (max - min)) * 100
  }, [max, min, value])

  const stroke = 12
  const r = 44
  const c = 2 * Math.PI * r
  const dash = (c * pct) / 100

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 2, alignItems: 'center' }}>
      <Box sx={{ width: 120, height: 120, display: 'grid', placeItems: 'center' }}>
        <svg width="120" height="120" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={r} stroke="rgba(255,255,255,0.10)" strokeWidth={stroke} fill="none" />
          <circle
            cx="60"
            cy="60"
            r={r}
            stroke="url(#grad)"
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${c - dash}`}
            transform="rotate(-90 60 60)"
          />
          <defs>
            <linearGradient id="grad" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#7c3aed" />
            </linearGradient>
          </defs>
        </svg>
        <Box sx={{ position: 'absolute', textAlign: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 900 }}>
            {Math.round(pct)}%
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.75 }}>
            {label}
          </Typography>
        </Box>
      </Box>
      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
          {label}
        </Typography>
        {sublabel ? (
          <Typography variant="body2" sx={{ opacity: 0.8, mt: 0.5 }}>
            {sublabel}
          </Typography>
        ) : null}
      </Box>
    </Box>
  )
}
