import { useState, type FormEvent, type ReactNode } from 'react'
import { useAuth } from '@/app/auth/authContext'
import { Button } from '@/shared/components/Button'
import Topography from '@/shared/components/reactbits/Topography'
import { Field, Input } from '@/shared/components/FormControls'
import { LogoMark } from '@/shared/components/LogoMark'
import { CoverWall } from './CoverWall'
import styles from './LoginPage.module.css'

type Mode = 'signIn' | 'signUp'

const MIN_PASSWORD_LENGTH = 6

const COPY: Record<Mode, { heading: string; submit: string; submitting: string }> = {
  signIn: { heading: 'Entrar', submit: 'Entrar', submitting: 'Entrando…' },
  signUp: { heading: 'Crear cuenta', submit: 'Crear cuenta', submitting: 'Creando cuenta…' },
}

export function LoginPage() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<Mode>('signIn')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)

  const copy = COPY[mode]
  const isSignUp = mode === 'signUp'

  function switchMode(next: Mode) {
    setMode(next)
    setError(null)
    setPassword('')
    setConfirmPassword('')
  }

  function validate(): string | null {
    if (!isSignUp) {
      return null
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`
    }
    if (password !== confirmPassword) {
      return 'Las contraseñas no coinciden.'
    }
    return null
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      if (isSignUp) {
        const needsConfirmation = await signUp(email.trim(), password)
        if (needsConfirmation) {
          setPendingEmail(email.trim())
          setSubmitting(false)
        }
      } else {
        await signIn(email.trim(), password)
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Ha ocurrido un error inesperado.')
      setSubmitting(false)
    }
  }

  if (pendingEmail) {
    return (
      <AuthLayout>
        <div className={styles.card}>
          <h2 className={styles.heading}>Revisa tu correo</h2>
          <p className={styles.text}>
            Te hemos enviado un enlace a <strong>{pendingEmail}</strong>. Ábrelo para activar la cuenta y luego
            entra con tu contraseña.
          </p>
          <Button
            onClick={() => {
              setPendingEmail(null)
              switchMode('signIn')
            }}
          >
            Volver
          </Button>
        </div>
      </AuthLayout>
    )
  }

  const canSubmit =
    !submitting &&
    email.trim() !== '' &&
    password !== '' &&
    (!isSignUp || confirmPassword !== '')

  return (
    <AuthLayout>
      <form className={styles.card} onSubmit={handleSubmit} noValidate>
        <h2 className={styles.heading}>{copy.heading}</h2>

        <Field label="Email" htmlFor="auth-email">
          <Input
            id="auth-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>

        <Field
          label="Contraseña"
          htmlFor="auth-password"
          hint={isSignUp ? `Mínimo ${MIN_PASSWORD_LENGTH} caracteres.` : undefined}
        >
          <Input
            id="auth-password"
            type="password"
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>

        {isSignUp && (
          <Field label="Repite la contraseña" htmlFor="auth-confirm-password">
            <Input
              id="auth-confirm-password"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </Field>
        )}

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        <Button type="submit" disabled={!canSubmit} className={styles.submit}>
          {submitting ? copy.submitting : copy.submit}
        </Button>

        <p className={styles.switch}>
          {isSignUp ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?'}{' '}
          <button
            type="button"
            className={styles.switchButton}
            onClick={() => switchMode(isSignUp ? 'signIn' : 'signUp')}
          >
            {isSignUp ? 'Entra' : 'Regístrate'}
          </button>
        </p>
      </form>
    </AuthLayout>
  )
}

function BrandLogo({ className }: { className?: string }) {
  return (
    <div className={[styles.brand, className].filter(Boolean).join(' ')}>
      <LogoMark size={40} />
      <span className={styles.brandName}>
        MyPlay<span className="brand-accent">Gallery</span>
      </span>
    </div>
  )
}

function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <CoverWall />
        <BrandLogo className={styles.heroBrand} />
        <div className={styles.heroBody}>
          <h1 className={styles.heroTitle}>Tu biblioteca de juegos</h1>
          <p className={styles.heroText}>
            Apunta a qué juegas, cuántas horas le echas y qué te ha parecido.
          </p>
        </div>
      </section>

      <div className={styles.panel}>
        <div className={styles.topography} aria-hidden="true">
          <Topography
            lowColor="#2a1f6e"
            midColor="#6a3fe0"
            highColor="#b39bff"
            bands={2.2}
            thickness={0.012}
            glow={0}
            grain={false}
            contrast={2.2}
            opacity={0.7}
            speed={0.25}
            mouseRadius={0.25}
            mouseStrength={0.3}
          />
        </div>
        <BrandLogo className={styles.brandMobile} />
        {children}
      </div>
    </div>
  )
}
