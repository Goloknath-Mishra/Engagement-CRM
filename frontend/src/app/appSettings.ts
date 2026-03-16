export type ThemeMode = 'light' | 'dark'

export type AppSettings = {
  themeMode: ThemeMode
}

export const defaultSettings: AppSettings = {
  themeMode: 'dark',
}
