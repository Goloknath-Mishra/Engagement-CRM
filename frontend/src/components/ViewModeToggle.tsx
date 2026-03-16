import { ToggleButton, ToggleButtonGroup } from '@mui/material'

export type ViewMode = 'list' | 'kanban'

/** List/kanban view mode toggle used by module list pages. */
export function ViewModeToggle({ value, onChange }: { value: ViewMode; onChange: (next: ViewMode) => void }) {
  return (
    <ToggleButtonGroup
      exclusive
      value={value}
      onChange={(_, next: ViewMode | null) => {
        if (!next) return
        onChange(next)
      }}
    >
      <ToggleButton value="list">List</ToggleButton>
      <ToggleButton value="kanban">Kanban</ToggleButton>
    </ToggleButtonGroup>
  )
}
