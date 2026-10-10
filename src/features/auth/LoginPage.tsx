import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react'
import { AuthError, useAuth } from '@/app/auth/authContext'
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle'
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
  const { signIn, signUp, signInWithSteam, resendConfirmation } = useAuth()
  const [mode, setMode] = useState<Mode>('signIn')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [capsLock, setCapsLock] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)
  const [unconfirmed, setUnconfirmed] = useState(false)
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent'>('idle')
  // Enlace de confirmación caducado o ya usado: Supabase vuelve con #error=...&error_code=otp_expired (T-24).
  const [linkError] = useState(() => readAuthLinkError(window.location.hash))
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])

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
  useDocumentTitle(pendingEmail ? 'Revisa tu correo' : copy.submit)

  useEffect(() => {
    // Quita el #error=... de la URL una vez leído
    if (linkError) window.history.replaceState(null, '', window.location.pathname + window.location.search)
  }, [linkError])
  const longEnough = password.length >= MIN_PASSWORD_LENGTH
  const passwordsMatch = confirmPassword !== '' && password === confirmPassword

  function switchMode(next: Mode) {
    if (next === mode) return
    setMode(next)
    setError(null)
    setUnconfirmed(false)
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
      setUnconfirmed(cause instanceof AuthError && cause.code === 'email_not_confirmed')
      setResendState('idle')
      setSubmitting(false)
    }
  }

  async function handleResend() {
    setResendState('sending')
    try {
      await resendConfirmation(email.trim())
      setResendState('sent')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se ha podido reenviar el correo.')
      setResendState('idle')
    }
  }

  // Pestañas: las flechas pasan de una a otra, como en cualquier grupo de pestañas (T-31).
  function handleTabKey(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight' && event.key !== 'Home' && event.key !== 'End') return
    event.preventDefault()
    const next: Mode =
      event.key === 'Home' ? 'signIn' : event.key === 'End' ? 'signUp' : mode === 'signIn' ? 'signUp' : 'signIn'
    switchMode(next)
    tabRefs.current[next === 'signIn' ? 0 : 1]?.focus()
  }

  if (steamPending) {
    return (
      <AuthLayout>
        <div className={styles.card} role="status" aria-live="polite">
          <span className={styles.steamBadge} aria-hidden="true">
            <SteamGlyph width={28} height={28} style={{ color: '#fff' }} />
          </span>
          <div className={styles.intro}>
            <h1 className={styles.heading}>Entrando con Steam…</h1>
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
            <h1 className={styles.heading}>Revisa tu correo</h1>
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
        <div className={styles.tabs} role="tablist" aria-label="Tipo de acceso" data-mode={mode}>
          <span className={styles.tabIndicator} aria-hidden="true" />
          <button
            ref={(element) => {
              tabRefs.current[0] = element
            }}
            type="button"
            role="tab"
            className={styles.tab}
            aria-selected={!isSignUp}
            tabIndex={!isSignUp ? 0 : -1}
            onClick={() => switchMode('signIn')}
            onKeyDown={handleTabKey}
          >
            Entrar
          </button>
          <button
            ref={(element) => {
              tabRefs.current[1] = element
            }}
            type="button"
            role="tab"
            className={styles.tab}
            aria-selected={isSignUp}
            tabIndex={isSignUp ? 0 : -1}
            onClick={() => switchMode('signUp')}
            onKeyDown={handleTabKey}
          >
            Crear cuenta
          </button>
        </div>

        <div className={styles.intro}>
          <h1 id="auth-heading" className={styles.heading}>
            {copy.heading}
          </h1>
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

        {linkError && !error && (
          <p className={styles.tip} role="status">
            {linkError}
          </p>
        )}
        {error && (
          <p className={styles.error} role="alert">
            <AlertIcon width={18} height={18} aria-hidden="true" />
            {error}
          </p>
        )}
        {unconfirmed && (
          <button
            type="button"
            className={styles.resend}
            onClick={handleResend}
            disabled={resendState !== 'idle' || email.trim() === ''}
          >
            {resendState === 'sent'
              ? 'Correo reenviado: revisa tu bandeja de entrada'
              : resendState === 'sending'
                ? 'Reenviando…'
                : 'Reenviar el correo de confirmación'}
          </button>
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
          <p className={styles.heroTitle}>Tu biblioteca de juegos</p>
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

/** Mensaje para el error con el que vuelve Supabase de un enlace del correo (#error=...). */
function readAuthLinkError(hash: string): string | null {
  if (!hash.includes('error')) return null
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  const code = params.get('error_code')
  if (!params.get('error') && !code) return null
  if (code === 'otp_expired') {
    return 'El enlace del correo ha caducado o ya se usó. Si ya confirmaste tu cuenta, entra con tu email y contraseña; si no, intenta entrar y pulsa «Reenviar el correo de confirmación».'
  }
  return 'No se ha podido completar el enlace del correo. Vuelve a intentarlo.'
}
