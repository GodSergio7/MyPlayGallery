import { createContext, useContext } from 'react'
import type { Session } from '@supabase/supabase-js'

export interface AuthState {
  session: Session | null
  loading: boolean
  signIn(email: string, password: string): Promise<void>
  /** Devuelve `true` si hay que confirmar el email antes de poder entrar. */
  signUp(email: string, password: string): Promise<boolean>
  /** Entra con la respuesta de Steam (parámetros openid.*). Si la cuenta de Steam es nueva, crea el usuario. */
  signInWithSteam(params: Record<string, string>): Promise<void>
  signOut(): Promise<void>
}

export class AuthError extends Error {}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const value = useContext(AuthContext)
  if (!value) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  }
  return value
}
