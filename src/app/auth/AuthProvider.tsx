import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { getSupabaseClient } from '@/data/supabase/client'
import { AuthContext, AuthError, type AuthState } from './authContext'

const SIGN_UP_ERRORS: Record<string, string> = {
  user_already_exists: 'Ya existe una cuenta con ese email.',
  email_exists: 'Ya existe una cuenta con ese email.',
  weak_password: 'La contraseña es demasiado débil. Usa al menos 6 caracteres.',
  email_address_invalid: 'El email no es válido.',
  validation_failed: 'Revisa el email y la contraseña.',
  signup_disabled: 'El registro de nuevos usuarios está desactivado.',
  over_email_send_rate_limit: 'Se han enviado demasiados emails. Inténtalo más tarde.',
  over_request_rate_limit: 'Demasiados intentos. Inténtalo más tarde.',
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const client = getSupabaseClient()
    let active = true

    client.auth.getSession().then(({ data }) => {
      if (active) {
        setSession(data.session)
        setLoading(false)
      }
    })

    const { data } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setLoading(false)
    })

    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthState>(
    () => ({
      session,
      loading,
      async signIn(email, password) {
        const { error } = await getSupabaseClient().auth.signInWithPassword({ email, password })
        if (error) {
          throw new AuthError(
            error.code === 'invalid_credentials'
              ? 'Email o contraseña incorrectos.'
              : 'No se ha podido iniciar sesión. Inténtalo de nuevo.',
          )
        }
      },
      async signUp(email, password) {
        const { data, error } = await getSupabaseClient().auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        })
        if (error) {
          throw new AuthError(
            (error.code && SIGN_UP_ERRORS[error.code]) ??
              'No se ha podido crear la cuenta. Inténtalo de nuevo.',
          )
        }
        // Con confirmación por email activa, Supabase no revela si el email ya existe:
        // devuelve un usuario sin identidades.
        if (data.user && data.user.identities?.length === 0) {
          throw new AuthError(SIGN_UP_ERRORS.user_already_exists)
        }
        return data.session === null
      },
      async signOut() {
        await getSupabaseClient().auth.signOut()
        queryClient.clear()
      },
    }),
    [session, loading, queryClient],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
