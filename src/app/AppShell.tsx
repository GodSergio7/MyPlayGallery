import { useMemo } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { AppBackground } from '@/shared/components/AppBackground'
import CardNav, { type CardNavItem } from '@/shared/components/reactbits/CardNav'
import { LogoMark } from '@/shared/components/LogoMark'
import { useAuth } from './auth/authContext'
import styles from './AppShell.module.css'

const CARD_BACKGROUND = '#1c1a3a'

export function AppShell() {
  const { session, signOut } = useAuth()
  const email = session?.user.email

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
        description: email,
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
          cta={{ label: 'Añadir juego', to: '/search' }}
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
