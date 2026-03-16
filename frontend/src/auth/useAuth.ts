import { useContext } from 'react'
import { AuthContext } from './authContext'

/** Hook to access the current authenticated user/session actions. */
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
