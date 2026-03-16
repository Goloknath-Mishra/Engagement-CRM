import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { getAccessToken, getRefreshToken, setTokens } from '../auth/tokenStorage'

const defaultBaseURL = `${window.location.protocol}//${window.location.hostname}:8000`
const baseURL = import.meta.env.VITE_API_BASE_URL ?? defaultBaseURL

export const api = axios.create({
  baseURL,
})

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken()
  if (token) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (resp) => resp,
  async (err: AxiosError) => {
    const original = err.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined
    if (!original) throw err

    const status = err.response?.status
    if (status !== 401 || original._retry) throw err

    const refresh = getRefreshToken()
    if (!refresh) throw err

    original._retry = true
    const refreshResp = await axios.post<{ access: string }>(
      `${baseURL}/api/auth/token/refresh/`,
      { refresh },
      { headers: { 'Content-Type': 'application/json' } },
    )
    const newAccess = refreshResp.data.access
    const existing = getRefreshToken()
    if (!existing) throw err
    setTokens({ access: newAccess, refresh: existing })

    original.headers = original.headers ?? {}
    original.headers.Authorization = `Bearer ${newAccess}`
    return api.request(original)
  },
)
