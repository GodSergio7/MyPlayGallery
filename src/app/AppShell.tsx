import { useMemo } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { AppBackground } from '@/shared/components/AppBackground'
import CardNav, { type CardNavItem } from '@/shared/components/reactbits/CardNav'
import { LogoMark } from '@/shared/components/LogoMark'
import { PlusIcon } from '@/shared/components/icons'
import { useConnections } from '@/features/settings/hooks/useConnections'
import { isSteamOnlyEmail } from '@/shared/lib/steamOpenId'
import { useAuth } from './auth/authContext'
import styles from './AppShell.module.css'

const CARD_BACKGROUND = '#1c1a3a'

export function AppShell() {
  const { session, signOut } = useAuth()
  // Las cuentas creadas con Steam tienen un email interno: ni se muestra ni sirve de nombre.
  const rawEmail = session?.user.email
  const email = isSteamOnlyEmail(rawEmail) ? undefined : rawEmail

  const items = useMemo<CardNavItem[]>(
    () => [
      {
        label: 'Biblioteca',
        background: CARD_BACKGROUND,
        textColor: '#fff',
        links: [
          { label: 'Inicio', to: '/', end: true },
          { label: 'Mis juegos', to: '/library' },
        ],
      },
      {
        label: 'Juegos',
        background: CARD_BACKGROUND,
        textColor: '#fff',
        links: [
          { label: 'Explorar', to: '/explore' },
          { label: 'Añadir juego', to: '/search' },
        ],
      },
      {
        label: 'Cuenta',
        background: CARD_BACKGROUND,
        textColor: '#fff',
        description: email ?? 'Cuenta de Steam',
        links: [
          { label: 'Ajustes', to: '/settings' },
          { label: 'Cerrar sesión', onClick: () => void signOut() },
        ],
      },
    ],
    [email, signOut],
  )

  return (
    <div className={styles.shell}>
      <AppBackground />

      <div className={styles.navBar}>
        <CardNav
          items={items}
          actions={
            <>
              <Link to="/search" className={styles.addButton} aria-label="Añadir juego" title="Añadir juego">
                <PlusIcon width={20} height={20} strokeWidth={2.2} />
              </Link>
              <UserLink email={email} />
            </>
          }
          logo={
            <NavLink to="/" className={styles.brand} aria-label="MyPlayGallery, inicio">
              <LogoMark size={28} />
              <span className={styles.brandName}>
                MyPlay<span className="brand-accent">Gallery</span>
              </span>
            </NavLink>
          }
        />
      </div>

      <main className={styles.main}>
        <div className={styles.container}>
          <Outlet />
        </div>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <span>MyPlayGallery</span>
          <span>Datos de juegos por IGDB</span>
        </div>
      </footer>
    </div>
  )
}

/**
 * Avatar y nombre del usuario, enlazados a su perfil.
 * Con Steam conectado, el nombre y el avatar son los de Steam; si no, la parte del email
 * antes de la @ y su inicial.
 */
function UserLink({ email }: { email: string | undefined }) {
  const connections = useConnections()
  const steam = connections.data?.find((item) => item.provider === 'steam')
  const steamAvatar = steam?.avatarUrl ?? null
  const name = steam?.displayName ?? (email ? email.split('@')[0] : 'Perfil')

  return (
    <Link to="/profile" className={styles.user} aria-label={`Tu perfil (${name})`} title="Tu perfil">
      {steamAvatar ? (
        <img src={steamAvatar} alt="" className={styles.avatar} width={32} height={32} />
      ) : (
        <span className={styles.avatar} aria-hidden="true">
          {name.charAt(0).toUpperCase()}
        </span>
      )}
      <span className={styles.userName}>{name}</span>
    </Link>
  )
}
