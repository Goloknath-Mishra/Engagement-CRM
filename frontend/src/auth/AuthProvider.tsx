import { useMemo, useState, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/apiClient'
import { AuthContext, type User } from './authContext'
import { getTokens, setTokens, type Tokens } from './tokenStorage'

/** Authentication provider: manages tokens, user session, and login/logout actions. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const [tokens, setTokensState] = useState<Tokens | null>(() => getTokens())

  const meQuery = useQuery({
    queryKey: ['me', tokens?.access ?? null],
    queryFn: async () => (await api.get<User>('/api/users/me/')).data,
    enabled: !!tokens?.access,
    retry: false,
  })

  const isAuthenticated = !!tokens?.access
  const user = meQuery.data ?? null

  const value = useMemo(() => {
    return {
      user,
      tokens,
      isAuthenticated,
      login: async (username: string, password: string) => {
        const resp = await api.post<Tokens>('/api/auth/token/', { username, password })
        setTokens(resp.data)
        setTokensState(resp.data)
        await qc.invalidateQueries({ queryKey: ['me'] })
      },
      logout: () => {
        setTokens(null)
        setTokensState(null)
        qc.removeQueries({ queryKey: ['me'] })
      },
    }
  }, [isAuthenticated, qc, tokens, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
