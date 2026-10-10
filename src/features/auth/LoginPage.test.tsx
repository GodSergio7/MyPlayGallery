// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthContext, AuthError, type AuthState } from '@/app/auth/authContext'
import { LoginPage } from './LoginPage'

// El fondo WebGL no se puede dibujar en jsdom
vi.mock('@/shared/components/reactbits/Topography', () => ({ default: () => null }))

function renderLogin(overrides: Partial<AuthState> = {}) {
  const auth: AuthState = {
    session: null,
    loading: false,
    signIn: vi.fn().mockResolvedValue(undefined),
    signUp: vi.fn().mockResolvedValue(true),
    signInWithSteam: vi.fn().mockResolvedValue(undefined),
    resendConfirmation: vi.fn().mockResolvedValue(undefined),
    signOut: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
  render(
    <AuthContext.Provider value={auth}>
      <LoginPage />
    </AuthContext.Provider>,
  )
  return auth
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  window.history.replaceState(null, '', '/')
})

describe('LoginPage', () => {
  it('entra con email y contraseña', async () => {
    const user = userEvent.setup()
    const auth = renderLogin()

    await user.type(screen.getByLabelText('Email'), 'jugador@ejemplo.com')
    await user.type(screen.getByLabelText('Contraseña'), 'secreto1')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(auth.signIn).toHaveBeenCalledWith('jugador@ejemplo.com', 'secreto1')
  })

  it('avisa si el email no tiene buena pinta, sin llamar a Supabase', async () => {
    const user = userEvent.setup()
    const auth = renderLogin()

    await user.type(screen.getByLabelText('Email'), 'jugador')
    await user.type(screen.getByLabelText('Contraseña'), 'secreto1')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(screen.getByRole('alert').textContent).toMatch(/revisa el email/i)
    expect(auth.signIn).not.toHaveBeenCalled()
  })

  it('las pestañas se manejan con las flechas (T-31)', async () => {
    const user = userEvent.setup()
    renderLogin()

    const signInTab = screen.getByRole('tab', { name: 'Entrar' })
    expect(signInTab.getAttribute('aria-selected')).toBe('true')
    signInTab.focus()
    await user.keyboard('{ArrowRight}')

    const signUpTab = screen.getByRole('tab', { name: 'Crear cuenta' })
    expect(signUpTab.getAttribute('aria-selected')).toBe('true')
    expect(document.activeElement).toBe(signUpTab)
    expect(screen.getByRole('heading', { level: 1, name: 'Crea tu biblioteca' })).toBeTruthy()
  })

  it('registro: no deja crear la cuenta hasta cumplir los requisitos y luego pide revisar el correo', async () => {
    const user = userEvent.setup()
    const auth = renderLogin()

    await user.click(screen.getByRole('tab', { name: 'Crear cuenta' }))
    await user.type(screen.getByLabelText('Email'), 'nuevo@ejemplo.com')
    await user.type(screen.getByLabelText('Contraseña'), 'abc')
    await user.type(screen.getByLabelText('Repite la contraseña'), 'abc')
    expect((screen.getByRole('button', { name: 'Crear cuenta' }) as HTMLButtonElement).disabled).toBe(true)

    await user.type(screen.getByLabelText('Contraseña'), 'def')
    await user.type(screen.getByLabelText('Repite la contraseña'), 'def')
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(auth.signUp).toHaveBeenCalledWith('nuevo@ejemplo.com', 'abcdef')
    expect(await screen.findByRole('heading', { name: 'Revisa tu correo' })).toBeTruthy()
  })

  it('email sin confirmar: lo explica y deja reenviar el correo (T-24)', async () => {
    const user = userEvent.setup()
    const auth = renderLogin({
      signIn: vi.fn().mockRejectedValue(new AuthError('Todavía no has confirmado tu email.', 'email_not_confirmed')),
    })

    await user.type(screen.getByLabelText('Email'), 'jugador@ejemplo.com')
    await user.type(screen.getByLabelText('Contraseña'), 'secreto1')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))
    await user.click(await screen.findByRole('button', { name: /reenviar el correo/i }))

    expect(auth.resendConfirmation).toHaveBeenCalledWith('jugador@ejemplo.com')
    expect(await screen.findByRole('button', { name: /correo reenviado/i })).toBeTruthy()
  })

  it('enlace del correo caducado: muestra el aviso y limpia la URL (T-24)', () => {
    window.history.replaceState(null, '', '/#error=access_denied&error_code=otp_expired')
    renderLogin()

    expect(screen.getByText(/el enlace del correo ha caducado/i)).toBeTruthy()
    expect(window.location.hash).toBe('')
  })
})
