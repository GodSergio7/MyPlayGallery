import { useState, type FormEvent } from 'react'
import { useAuth } from '@/app/auth/authContext'
import { Button } from '@/shared/components/Button'
import { Field, Input } from '@/shared/components/FormControls'
import { Ps5ControllerIcon } from '@/shared/components/icons'
import styles from './LoginPage.module.css'

type Mode = 'signIn' | 'signUp'

const MIN_PASSWORD_LENGTH = 6

const COPY: Record<Mode, { subtitle: string; submit: string; submitting: string }> = {
  signIn: {
    subtitle: 'Inicia sesión para ver tu biblioteca.',
    submit: 'Iniciar sesión',
    submitting: 'Entrando…',
  },
  signUp: {
    subtitle: 'Crea una cuenta para empezar tu biblioteca.',
    submit: 'Crear cuenta',
    submitting: 'Creando cuenta…',
  },
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
      <div className={styles.page}>
        <div className={styles.card}>
          <Brand />
          <h2 className={styles.heading}>Revisa tu email</h2>
          <p className={styles.subtitle}>
            Te hemos enviado un enlace de confirmación a <strong>{pendingEmail}</strong>. Ábrelo
            para activar tu cuenta y después inicia sesión.
          </p>
          <Button
            onClick={() => {
              setPendingEmail(null)
              switchMode('signIn')
            }}
          >
            Ir a iniciar sesión
          </Button>
        </div>
      </div>
    )
  }

  const canSubmit =
    !submitting &&
    email.trim() !== '' &&
    password !== '' &&
    (!isSignUp || confirmPassword !== '')

  return (
    <div className={styles.page}>
      <form className={styles.card} onSubmit={handleSubmit} noValidate>
        <Brand />
        <p className={styles.subtitle}>{copy.subtitle}</p>

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

        <Button type="submit" disabled={!canSubmit}>
          {submitting ? copy.submitting : copy.submit}
        </Button>

        <p className={styles.switch}>
          {isSignUp ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?'}{' '}
          <button
            type="button"
            className={styles.switchButton}
            onClick={() => switchMode(isSignUp ? 'signIn' : 'signUp')}
          >
            {isSignUp ? 'Inicia sesión' : 'Regístrate'}
          </button>
        </p>
      </form>
    </div>
  )
}

function Brand() {
  return (
    <div className={styles.brand}>
      <span className={styles.brandMark} aria-hidden="true">
        <Ps5ControllerIcon width={30} height={30} />
      </span>
      <h1 className={styles.title}>MyPlayGallery</h1>
    </div>
  )
}
