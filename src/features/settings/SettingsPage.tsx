import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '@/app/auth/authContext'
import { errorMessage } from '@/data/errors'
import type { PlatformConnection } from '@/data/supabase/connectionsRepository'
import { Button } from '@/shared/components/Button'
import { PageHeader } from '@/shared/components/PageHeader'
import { AlertIcon, CheckIcon } from '@/shared/components/icons'
import { formatDate } from '@/shared/lib/format'
import { useConnectSteam, useConnections, useDisconnect } from './hooks/useConnections'
import { readSteamReturn, steamLoginUrl } from './steam'
import styles from './SettingsPage.module.css'

type Notice = { tone: 'success' | 'error' | 'info'; text: string }

export function SettingsPage() {
  const { session, signOut } = useAuth()

  return (
    <>
      <PageHeader title="Ajustes" />

      <div className={styles.sections}>
        <Section id="ajustes-cuenta" title="Cuenta" description="El email con el que entras en MyPlayGallery.">
          <div className={styles.row}>
            <div className={styles.rowText}>
              <span className={styles.rowLabel}>Email</span>
              <span className={styles.rowValue}>{session?.user.email ?? '—'}</span>
            </div>
            <Button variant="secondary" size="sm" onClick={() => void signOut()}>
              Cerrar sesión
            </Button>
          </div>
        </Section>

        <Section
          id="ajustes-conexiones"
          title="Cuentas conectadas"
          description="Conecta tus tiendas para traer a tu biblioteca los juegos que tienes y las horas que llevas."
        >
          <SteamConnection />
          <p className={styles.unavailable}>
            Epic Games Store, GOG, PlayStation, Xbox y Nintendo no ofrecen una forma oficial de leer tu
            biblioteca, así que de momento no se pueden conectar. Si alguna la abre, aparecerá aquí.
          </p>
        </Section>
      </div>
    </>
  )
}

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section className={styles.section} aria-labelledby={id}>
      <div className={styles.sectionIntro}>
        <h2 id={id} className={styles.sectionTitle}>
          {title}
        </h2>
        <p className={styles.sectionText}>{description}</p>
      </div>
      <div className={styles.card}>{children}</div>
    </section>
  )
}

// ---------------------------------------------------------------- Steam

function SteamConnection() {
  const [searchParams, setSearchParams] = useSearchParams()
  const connections = useConnections()
  const connect = useConnectSteam()
  const disconnect = useDisconnect()
  // La vuelta desde Steam se lee una sola vez, al llegar a la página.
  const [steamReturn] = useState(() => readSteamReturn(searchParams))
  const [notice, setNotice] = useState<Notice | null>(() =>
    steamReturn.kind === 'cancelled' ? { tone: 'info', text: 'Has cancelado el inicio de sesión en Steam.' } : null,
  )
  const handledReturn = useRef(false)

  // Se limpia la URL y, si Steam devolvió una respuesta, se verifica (una sola vez).
  useEffect(() => {
    if (handledReturn.current || steamReturn.kind === 'none') return
    handledReturn.current = true
    setSearchParams(new URLSearchParams(), { replace: true })

    if (steamReturn.kind !== 'response') return

    connect.mutate(steamReturn.params, {
      onSuccess: () =>
        setNotice({
          tone: 'success',
          text: 'Steam conectado. La importación de juegos llegará en la próxima actualización.',
        }),
      onError: (error) => setNotice({ tone: 'error', text: errorMessage(error) }),
    })
  }, [steamReturn, setSearchParams, connect])

  const steam = connections.data?.find((item) => item.provider === 'steam')
  const busy = connect.isPending || disconnect.isPending

  function handleDisconnect() {
    setNotice(null)
    disconnect.mutate('steam', {
      onError: (error) => setNotice({ tone: 'error', text: errorMessage(error) }),
    })
  }

  let action: ReactNode
  if (connect.isPending) {
    action = (
      <Button size="sm" disabled>
        Comprobando…
      </Button>
    )
  } else if (steam) {
    action = (
      <Button variant="ghost" size="sm" onClick={handleDisconnect} disabled={busy}>
        {disconnect.isPending ? 'Desconectando…' : 'Desconectar'}
      </Button>
    )
  } else {
    action = (
      <Button
        size="sm"
        onClick={() => window.location.assign(steamLoginUrl())}
        disabled={busy || connections.isLoading || connections.isError}
      >
        Conectar
      </Button>
    )
  }

  return (
    <div className={styles.connection}>
      <div className={styles.row}>
        <SteamMark />
        <div className={styles.rowText}>
          <span className={styles.rowTitle}>Steam</span>
          {connections.isError ? (
            <span className={styles.rowHint}>No se ha podido comprobar si tienes Steam conectado.</span>
          ) : steam ? (
            <ConnectedAccount connection={steam} />
          ) : (
            <span className={styles.rowHint}>Tus juegos y las horas que llevas en cada uno.</span>
          )}
        </div>
        <div className={styles.rowAction}>{action}</div>
      </div>

      {notice && (
        <p className={`${styles.notice} ${styles[notice.tone]}`} role={notice.tone === 'error' ? 'alert' : 'status'}>
          {notice.tone === 'success' ? (
            <CheckIcon width={16} height={16} aria-hidden="true" />
          ) : (
            <AlertIcon width={16} height={16} aria-hidden="true" />
          )}
          {notice.text}
        </p>
      )}
    </div>
  )
}

function ConnectedAccount({ connection }: { connection: PlatformConnection }) {
  return (
    <>
      <span className={styles.account}>
        {connection.avatarUrl && (
          <img src={connection.avatarUrl} alt="" className={styles.avatar} width={20} height={20} />
        )}
        <a
          href={`https://steamcommunity.com/profiles/${connection.externalId}`}
          target="_blank"
          rel="noreferrer"
          className={styles.accountName}
        >
          {connection.displayName ?? 'Tu cuenta de Steam'}
        </a>
      </span>
      <span className={styles.accountMeta}>Conectada el {formatDate(connection.connectedAt)}</span>
    </>
  )
}

/** Marca de Steam simplificada (círculo con la válvula), en blanco sobre su azul oscuro. */
function SteamMark() {
  return (
    <span className={styles.mark} aria-hidden="true">
      <svg viewBox="0 0 24 24" width="22" height="22">
        <circle cx="12" cy="12" r="10" fill="#fff" />
        <circle cx="15.2" cy="9.2" r="3" fill="none" stroke="#1b2838" strokeWidth="1.7" />
        <circle cx="8.6" cy="15.2" r="2.1" fill="#1b2838" />
        <path d="M10.2 14 13.2 11" stroke="#1b2838" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    </span>
  )
}
