import { createContext } from 'react'
import type { Tokens } from './tokenStorage'

export type User = {
  id: number
  username: string
  first_name: string
  last_name: string
  email: string
  is_staff: boolean
  is_active: boolean
  groups: string[]
}

export type AuthContextValue = {
  user: User | null
  tokens: Tokens | null
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
