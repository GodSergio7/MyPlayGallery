import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react'
import { useAuth } from '@/app/auth/authContext'
import Topography from '@/shared/components/reactbits/Topography'
import { LogoMark } from '@/shared/components/LogoMark'
import { readSteamReturn, STEAM_SIGN_IN_FLOW, steamLoginUrl } from '@/shared/lib/steamOpenId'
import {
  AlertIcon,
  ArrowLeftIcon,
  CheckIcon,
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  MailIcon,
  SteamGlyph,
} from '@/shared/components/icons'
import { CoverWall } from './CoverWall'
import styles from './LoginPage.module.css'

type Mode = 'signIn' | 'signUp'

const MIN_PASSWORD_LENGTH = 6
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const COPY: Record<Mode, { heading: string; text: string; submit: string; submitting: string }> = {
  signIn: {
    heading: 'Entra en tu biblioteca',
    text: 'Con el email y la contraseña de tu cuenta.',
    submit: 'Entrar',
    submitting: 'Entrando…',
  },
  signUp: {
    heading: 'Crea tu biblioteca',
    text: 'Solo necesitas un email. Te mandaremos un enlace para activarla.',
    submit: 'Crear cuenta',
    submitting: 'Creando cuenta…',
  },
}

export function LoginPage() {
  const { signIn, signUp, signInWithSteam } = useAuth()
  const [mode, setMode] = useState<Mode>('signIn')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [capsLock, setCapsLock] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)

  // Vuelta desde Steam (botón "Continuar con Steam"): se lee una sola vez, al cargar la pantalla.
  const [steamReturn] = useState(() =>
    readSteamReturn(new URLSearchParams(window.location.search), STEAM_SIGN_IN_FLOW),
  )
  const [steamPending, setSteamPending] = useState(steamReturn.kind === 'response')
  const [steamNotice] = useState(
    steamReturn.kind === 'cancelled' ? 'Has cancelado el inicio de sesión en Steam.' : null,
  )
  const handledSteamReturn = useRef(false)

  useEffect(() => {
    if (handledSteamReturn.current || steamReturn.kind === 'none') return
    handledSteamReturn.current = true
    // Quita los parámetros de Steam de la URL (no deben quedarse en el historial).
    window.history.replaceState(null, '', window.location.pathname)

    if (steamReturn.kind !== 'response') return
    // Si va bien, la sesión cambia y la app sustituye esta pantalla; solo hay que tratar el error.
    signInWithSteam(steamReturn.params).catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : 'No se ha podido entrar con Steam.')
      setSteamPending(false)
    })
  }, [steamReturn, signInWithSteam])

  const copy = COPY[mode]
  const isSignUp = mode === 'signUp'
  const longEnough = password.length >= MIN_PASSWORD_LENGTH
  const passwordsMatch = confirmPassword !== '' && password === confirmPassword

  function switchMode(next: Mode) {
    if (next === mode) return
    setMode(next)
    setError(null)
    setPassword('')
    setConfirmPassword('')
    setShowPassword(false)
  }

  // getModifierState solo existe en eventos de teclado: el aviso aparece al teclear.
  function checkCapsLock(event: KeyboardEvent<HTMLInputElement>) {
    setCapsLock(event.getModifierState('CapsLock'))
  }

  function validate(): string | null {
    if (!EMAIL_PATTERN.test(email.trim())) {
      return 'Revisa el email: parece que le falta algo.'
    }
    if (isSignUp && !longEnough) {
      return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`
    }
    if (isSignUp && !passwordsMatch) {
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

  if (steamPending) {
    return (
      <AuthLayout>
        <div className={styles.card} role="status" aria-live="polite">
          <span className={styles.steamBadge} aria-hidden="true">
            <SteamGlyph width={28} height={28} style={{ color: '#fff' }} />
          </span>
          <div className={styles.intro}>
            <h2 className={styles.heading}>Entrando con Steam…</h2>
            <p className={styles.text}>Estamos comprobando tu cuenta con Steam. Solo tarda un momento.</p>
          </div>
          <span className={styles.spinnerLarge} aria-hidden="true" />
        </div>
      </AuthLayout>
    )
  }

  if (pendingEmail) {
    return (
      <AuthLayout>
        <div className={styles.card}>
          <span className={styles.mailBadge} aria-hidden="true">
            <MailIcon width={26} height={26} />
          </span>
          <div className={styles.intro}>
            <h2 className={styles.heading}>Revisa tu correo</h2>
            <p className={styles.text}>
              Te hemos enviado un enlace a <strong>{pendingEmail}</strong>. Ábrelo para activar la cuenta y
              después entra con tu contraseña.
            </p>
          </div>
          <p className={styles.tip}>¿No te llega? Mira en la carpeta de spam; puede tardar un par de minutos.</p>
          <button
            type="button"
            className={styles.submit}
            onClick={() => {
              setPendingEmail(null)
              switchMode('signIn')
            }}
          >
            <ArrowLeftIcon width={18} height={18} />
            Volver a entrar
          </button>
        </div>
      </AuthLayout>
    )
  }

  const canSubmit =
    !submitting &&
    email.trim() !== '' &&
    password !== '' &&
    (!isSignUp || (longEnough && passwordsMatch))

  return (
    <AuthLayout>
      <form className={styles.card} onSubmit={handleSubmit} noValidate aria-labelledby="auth-heading">
        <div className={styles.tabs} role="group" aria-label="Tipo de acceso" data-mode={mode}>
          <span className={styles.tabIndicator} aria-hidden="true" />
          <button
            type="button"
            className={styles.tab}
            aria-pressed={!isSignUp}
            onClick={() => switchMode('signIn')}
          >
            Entrar
          </button>
          <button
            type="button"
            className={styles.tab}
            aria-pressed={isSignUp}
            onClick={() => switchMode('signUp')}
          >
            Crear cuenta
          </button>
        </div>

        <div className={styles.intro}>
          <h2 id="auth-heading" className={styles.heading}>
            {copy.heading}
          </h2>
          <p className={styles.text}>{copy.text}</p>
        </div>

        <div className={styles.fields}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="auth-email">
              Email
            </label>
            <div className={styles.inputWrap}>
              <MailIcon className={styles.inputIcon} width={18} height={18} />
              <input
                id="auth-email"
                className={styles.input}
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="tu@email.com"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="auth-password">
              Contraseña
            </label>
            <div className={styles.inputWrap}>
              <LockIcon className={styles.inputIcon} width={18} height={18} />
              <input
                id="auth-password"
                className={`${styles.input} ${styles.inputWithAction}`}
                type={showPassword ? 'text' : 'password'}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onKeyUp={checkCapsLock}
                onKeyDown={checkCapsLock}
                onBlur={() => setCapsLock(false)}
                aria-describedby={isSignUp ? 'auth-rules' : undefined}
              />
              <button
                type="button"
                className={styles.inputAction}
                onClick={() => setShowPassword((shown) => !shown)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOffIcon width={18} height={18} /> : <EyeIcon width={18} height={18} />}
              </button>
            </div>
            {capsLock && (
              <p className={styles.capsLock} role="status">
                <AlertIcon width={14} height={14} aria-hidden="true" />
                Tienes activadas las mayúsculas
              </p>
            )}
          </div>

          {isSignUp && (
            <div className={styles.field}>
              <label className={styles.label} htmlFor="auth-confirm-password">
                Repite la contraseña
              </label>
              <div className={styles.inputWrap}>
                <LockIcon className={styles.inputIcon} width={18} height={18} />
                <input
                  id="auth-confirm-password"
                  className={styles.input}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  onKeyUp={checkCapsLock}
                  onKeyDown={checkCapsLock}
                  onBlur={() => setCapsLock(false)}
                  aria-describedby="auth-rules"
                />
              </div>
            </div>
          )}

          {isSignUp && (
            <ul id="auth-rules" className={styles.rules} aria-label="Requisitos de la contraseña">
              <Rule met={longEnough}>Al menos {MIN_PASSWORD_LENGTH} caracteres</Rule>
              <Rule met={passwordsMatch}>Las dos contraseñas coinciden</Rule>
            </ul>
          )}
        </div>

        {error && (
          <p className={styles.error} role="alert">
            <AlertIcon width={18} height={18} aria-hidden="true" />
            {error}
          </p>
        )}
        {steamNotice && !error && (
          <p className={styles.tip} role="status">
            {steamNotice}
          </p>
        )}

        <button type="submit" className={styles.submit} disabled={!canSubmit} aria-busy={submitting}>
          {submitting && <span className={styles.spinner} aria-hidden="true" />}
          {submitting ? copy.submitting : copy.submit}
        </button>

        <div className={styles.divider} aria-hidden="true">
          <span>o</span>
        </div>

        <button
          type="button"
          className={styles.steamButton}
          onClick={() => window.location.assign(steamLoginUrl(STEAM_SIGN_IN_FLOW))}
        >
          <SteamGlyph width={20} height={20} />
          Continuar con Steam
        </button>
        <p className={styles.steamNote}>
          {isSignUp
            ? 'Con Steam no necesitas email ni contraseña.'
            : 'Si es tu primera vez, se crea tu cuenta al momento.'}
        </p>
      </form>
    </AuthLayout>
  )
}

function Rule({ met, children }: { met: boolean; children: ReactNode }) {
  return (
    <li className={met ? `${styles.rule} ${styles.ruleMet}` : styles.rule}>
      <span className={styles.ruleMark} aria-hidden="true">
        {met && <CheckIcon width={12} height={12} strokeWidth={2.6} />}
      </span>
      {children}
      <span className="visually-hidden">{met ? ' (cumplido)' : ' (pendiente)'}</span>
    </li>
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
