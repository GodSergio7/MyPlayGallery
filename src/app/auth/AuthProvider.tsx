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

const STEAM_SIGN_IN_ERRORS: Record<string, string> = {
  invalid_steam_response: 'Steam no ha confirmado el inicio de sesión. Vuelve a intentarlo.',
  upstream_error: 'No se ha podido contactar con Steam. Inténtalo dentro de un rato.',
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
      async signInWithSteam(params) {
        const client = getSupabaseClient()
        // 1. La Edge Function verifica la respuesta con Steam y devuelve un token de acceso de un solo uso.
        const { data, error, response } = await client.functions.invoke<{ tokenHash?: unknown }>('steam-login', {
          method: 'POST',
          body: { params },
        })
        if (error || typeof data?.tokenHash !== 'string') {
          const body: unknown = await response?.json().catch(() => null)
          const code =
            typeof body === 'object' && body !== null
              ? (body as { error?: { code?: unknown } }).error?.code
              : undefined
          throw new AuthError(
            (typeof code === 'string' && STEAM_SIGN_IN_ERRORS[code]) ||
              'No se ha podido entrar con Steam. Inténtalo de nuevo.',
          )
        }
        // 2. Se canjea el token por la sesión (onAuthStateChange la recoge).
        const { error: otpError } = await client.auth.verifyOtp({ token_hash: data.tokenHash, type: 'magiclink' })
        if (otpError) {
          throw new AuthError('No se ha podido entrar con Steam. Inténtalo de nuevo.')
        }
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
