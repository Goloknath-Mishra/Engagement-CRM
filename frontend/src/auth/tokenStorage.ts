export type Tokens = { access: string; refresh: string }

const STORAGE_KEY = 'crm.tokens'

export function getTokens(): Tokens | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Tokens
    if (!parsed?.access || !parsed?.refresh) return null
    return parsed
  } catch {
    return null
  }
}

export function setTokens(tokens: Tokens | null) {
  if (!tokens) {
    localStorage.removeItem(STORAGE_KEY)
    return
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens))
}

export function getAccessToken() {
  return getTokens()?.access ?? null
}

export function getRefreshToken() {
  return getTokens()?.refresh ?? null
}
