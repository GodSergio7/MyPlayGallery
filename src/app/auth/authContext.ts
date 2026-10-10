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
  /** Vuelve a enviar el correo de confirmación del registro. */
  resendConfirmation(email: string): Promise<void>
  signOut(): Promise<void>
}

export class AuthError extends Error {
  /** Código de Supabase cuando importa en la interfaz (p. ej. 'email_not_confirmed'). */
  readonly code: string | undefined

  constructor(message: string, code?: string) {
    super(message)
    this.name = 'AuthError'
    this.code = code
  }
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const value = useContext(AuthContext)
  if (!value) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  }
  return value
}
