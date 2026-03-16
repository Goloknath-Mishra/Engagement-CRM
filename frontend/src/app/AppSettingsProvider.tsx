import { useMemo, useState, type ReactNode } from 'react'
import { AppSettingsContext, type AppSettingsContextValue } from './appSettingsContext'
import { type AppSettings, defaultSettings } from './appSettings'
import { loadJson, saveJson } from './storage'

const STORAGE_KEY = 'crm.appSettings'

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => {
    const raw = loadJson<Record<string, unknown>>(STORAGE_KEY, defaultSettings as unknown as Record<string, unknown>)
    const themeMode = raw.themeMode === 'light' || raw.themeMode === 'dark' ? raw.themeMode : defaultSettings.themeMode
    return { themeMode }
  })

  const value = useMemo<AppSettingsContextValue>(() => {
    return {
      settings,
      setThemeMode: (mode) => {
        const next = { ...settings, themeMode: mode }
        setSettings(next)
        saveJson(STORAGE_KEY, next)
      },
      resetSettings: () => {
        setSettings(defaultSettings)
        saveJson(STORAGE_KEY, defaultSettings)
      },
    }
  }, [settings])

  return <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>
}
