import { createContext } from 'react'
import type { AppSettings } from './appSettings'

export type AppSettingsContextValue = {
  settings: AppSettings
  setThemeMode: (mode: AppSettings['themeMode']) => void
  resetSettings: () => void
}

export const AppSettingsContext = createContext<AppSettingsContextValue | undefined>(undefined)
