import { useMemo } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { AppBackground } from '@/shared/components/AppBackground'
import CardNav, { type CardNavItem } from '@/shared/components/reactbits/CardNav'
import { useAuth } from './auth/authContext'
import styles from './AppShell.module.css'

// Tarjetas del menú: tonos oscuros del degradado de marca (rosa → violeta → azul)
// para que el texto blanco tenga buen contraste.
const CARD_BACKGROUNDS = [
  'linear-gradient(160deg, #5a1a4a 0%, #3a1238 100%)',
  'linear-gradient(160deg, #3d1f7a 0%, #26145a 100%)',
  'linear-gradient(160deg, #1f2f86 0%, #141f5c 100%)',
]

export function AppShell() {
  const { session, signOut } = useAuth()
  const email = session?.user.email

  const items = useMemo<CardNavItem[]>(
    () => [
      {
        label: 'Mi colección',
        background: CARD_BACKGROUNDS[0],
        textColor: '#fff',
        description: 'Tu biblioteca y estadísticas',
        links: [
          { label: 'Inicio', to: '/', end: true },
          { label: 'Biblioteca', to: '/library' },
        ],
      },
      {
        label: 'Descubrir',
        background: CARD_BACKGROUNDS[1],
        textColor: '#fff',
        description: 'Todo el catálogo de IGDB',
        links: [{ label: 'Buscar juegos', to: '/search' }],
      },
      {
        label: 'Cuenta',
        background: CARD_BACKGROUNDS[2],
        textColor: '#fff',
        description: email,
        links: [{ label: 'Cerrar sesión', onClick: () => void signOut() }],
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
          cta={{ label: 'Buscar juegos', to: '/search' }}
          logo={
            <NavLink to="/" className={styles.brand} aria-label="MyPlayGallery, inicio">
              <span className={styles.brandName}>
                MyPlay<span className="text-gradient">Gallery</span>
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
