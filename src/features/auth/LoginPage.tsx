import { useState, type FormEvent, type ReactNode } from 'react'
import { useAuth } from '@/app/auth/authContext'
import { Button } from '@/shared/components/Button'
import { AppBackground } from '@/shared/components/AppBackground'
import { Field, Input } from '@/shared/components/FormControls'
import BlurText from '@/shared/components/reactbits/BlurText'
import {
  Ps5ControllerIcon,
  SearchIcon,
  StarIcon,
  TrophyIcon,
} from '@/shared/components/icons'
import styles from './LoginPage.module.css'

type Mode = 'signIn' | 'signUp'

const MIN_PASSWORD_LENGTH = 6

const COPY: Record<
  Mode,
  { heading: string; subtitle: string; submit: string; submitting: string }
> = {
  signIn: {
    heading: 'Bienvenido de nuevo',
    subtitle: 'Inicia sesión para ver tu biblioteca.',
    submit: 'Iniciar sesión',
    submitting: 'Entrando…',
  },
  signUp: {
    heading: 'Crea tu cuenta',
    subtitle: 'Regístrate gratis y empieza tu biblioteca.',
    submit: 'Crear cuenta',
    submitting: 'Creando cuenta…',
  },
}

function cx(...classes: Array<string | false | undefined>): string {
  return classes.filter(Boolean).join(' ')
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
          <span className={styles.mailIcon} aria-hidden="true">
            ✉
          </span>
          <div className={styles.intro}>
            <h2 className={styles.heading}>Revisa tu email</h2>
            <p className={styles.subtitle}>
              Te hemos enviado un enlace de confirmación a <strong>{pendingEmail}</strong>.
              Ábrelo para activar tu cuenta y después inicia sesión.
            </p>
          </div>
          <Button
            onClick={() => {
              setPendingEmail(null)
              switchMode('signIn')
            }}
          >
            Ir a iniciar sesión
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
        <div className={styles.tabs} role="tablist" aria-label="Acceso">
          <button
            type="button"
            role="tab"
            aria-selected={!isSignUp}
            className={cx(styles.tab, !isSignUp && styles.tabActive)}
            onClick={() => switchMode('signIn')}
          >
            Iniciar sesión
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={isSignUp}
            className={cx(styles.tab, isSignUp && styles.tabActive)}
            onClick={() => switchMode('signUp')}
          >
            Crear cuenta
          </button>
        </div>

        <div className={styles.intro}>
          <h2 className={styles.heading}>
            <BlurText key={mode} text={copy.heading} delay={80} direction="bottom" />
          </h2>
          <p className={styles.subtitle}>{copy.subtitle}</p>
        </div>

        <Field label="Email" htmlFor="auth-email">
          <Input
            id="auth-email"
            type="email"
            autoComplete="email"
            placeholder="tu@email.com"
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
            placeholder="••••••••"
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
              placeholder="••••••••"
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
            {isSignUp ? 'Inicia sesión' : 'Regístrate'}
          </button>
        </p>
      </form>
    </AuthLayout>
  )
}

function BrandLogo({ className }: { className?: string }) {
  return (
    <div className={cx(styles.brand, className)}>
      <span className={styles.brandMark} aria-hidden="true">
        <Ps5ControllerIcon width={28} height={28} />
      </span>
      <span className={styles.brandName}>
        MyPlay<span className="text-gradient">Gallery</span>
      </span>
    </div>
  )
}

function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.page}>
      <section className={styles.hero} aria-hidden="true">
        <BrandLogo />

        <div className={styles.heroArt}>
          <span className={styles.heroTile}>
            <Ps5ControllerIcon width={128} height={128} strokeWidth={1.3} />
          </span>
          <div className={styles.toast}>
            <span className={styles.toastIcon}>
              <TrophyIcon width={18} height={18} />
            </span>
            <div>
              <p className={styles.toastTitle}>¡Platino conseguido!</p>
              <p className={styles.toastText}>Elden Ring · hace 2 min</p>
            </div>
          </div>
        </div>

        <h1 className={styles.heroTitle}>
          Tu colección de videojuegos, <span className="text-gradient">a otro nivel</span>
        </h1>

        <ul className={styles.features}>
          <li>
            <SearchIcon width={18} height={18} /> Busca en todo el catálogo de IGDB
          </li>
          <li>
            <StarIcon width={18} height={18} /> Puntúa, reseña y registra tus horas
          </li>
          <li>
            <TrophyIcon width={18} height={18} /> Lleva la cuenta de tus platinos y 100%
          </li>
        </ul>
      </section>

      <div className={styles.panel}>
        <AppBackground variant="panel" className={styles.ball} />
        <BrandLogo className={styles.brandMobile} />
        {children}
      </div>
    </div>
  )
}
