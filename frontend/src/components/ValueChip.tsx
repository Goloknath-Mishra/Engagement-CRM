import { Chip } from '@mui/material'

type ChipColor = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'

export type ValueChipKind =
  | 'campaignStatus'
  | 'leadStatus'
  | 'caseStatus'
  | 'casePriority'
  | 'incidentStatus'
  | 'incidentSeverity'
  | 'opportunityStage'

export function ValueChip({ kind, value }: { kind: ValueChipKind; value: string }) {
  const { label, color, variant } = getChipPresentation(kind, value)
  return <Chip size="small" label={label} color={color} variant={variant} />
}

function getChipPresentation(kind: ValueChipKind, value: string): { label: string; color: ChipColor; variant: 'filled' | 'outlined' } {
  const v = value || ''
  const label = v.replaceAll('_', ' ')

  if (kind === 'campaignStatus') {
    if (v === 'active') return { label, color: 'success', variant: 'filled' }
    if (v === 'completed') return { label, color: 'secondary', variant: 'outlined' }
    if (v === 'cancelled') return { label, color: 'error', variant: 'outlined' }
    return { label, color: 'warning', variant: 'filled' }
  }

  if (kind === 'leadStatus') {
    if (v === 'qualified') return { label, color: 'success', variant: 'filled' }
    if (v === 'working') return { label, color: 'primary', variant: 'filled' }
    if (v === 'converted') return { label, color: 'secondary', variant: 'filled' }
    if (v === 'disqualified') return { label, color: 'error', variant: 'outlined' }
    return { label, color: 'default', variant: 'outlined' }
  }

  if (kind === 'caseStatus') {
    if (v === 'new') return { label, color: 'info', variant: 'outlined' }
    if (v === 'in_progress') return { label, color: 'warning', variant: 'filled' }
    if (v === 'waiting_on_customer') return { label, color: 'secondary', variant: 'outlined' }
    if (v === 'closed') return { label, color: 'success', variant: 'filled' }
    return { label, color: 'default', variant: 'outlined' }
  }

  if (kind === 'casePriority') {
    if (v === 'urgent') return { label, color: 'error', variant: 'filled' }
    if (v === 'high') return { label, color: 'warning', variant: 'filled' }
    if (v === 'medium') return { label, color: 'primary', variant: 'outlined' }
    if (v === 'low') return { label, color: 'default', variant: 'outlined' }
    return { label, color: 'default', variant: 'outlined' }
  }

  if (kind === 'incidentStatus') {
    if (v === 'open') return { label, color: 'error', variant: 'outlined' }
    if (v === 'investigating') return { label, color: 'warning', variant: 'filled' }
    if (v === 'mitigating') return { label, color: 'primary', variant: 'filled' }
    if (v === 'resolved') return { label, color: 'success', variant: 'filled' }
    return { label, color: 'default', variant: 'outlined' }
  }

  if (kind === 'incidentSeverity') {
    if (v === 'sev1') return { label: 'sev 1', color: 'error', variant: 'filled' }
    if (v === 'sev2') return { label: 'sev 2', color: 'warning', variant: 'filled' }
    if (v === 'sev3') return { label: 'sev 3', color: 'primary', variant: 'outlined' }
    if (v === 'sev4') return { label: 'sev 4', color: 'default', variant: 'outlined' }
    return { label, color: 'default', variant: 'outlined' }
  }

  if (kind === 'opportunityStage') {
    if (v === 'prospecting') return { label, color: 'info', variant: 'outlined' }
    if (v === 'qualification') return { label, color: 'primary', variant: 'filled' }
    if (v === 'proposal') return { label, color: 'secondary', variant: 'filled' }
    if (v === 'negotiation') return { label, color: 'warning', variant: 'filled' }
    if (v === 'closed_won') return { label, color: 'success', variant: 'filled' }
    if (v === 'closed_lost') return { label, color: 'error', variant: 'outlined' }
    return { label, color: 'default', variant: 'outlined' }
  }

  return { label, color: 'default', variant: 'outlined' }
}
