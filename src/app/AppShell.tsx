import { NavLink, Outlet } from 'react-router-dom'
import {
  HomeIcon,
  LibraryIcon,
  LogOutIcon,
  Ps5ControllerIcon,
  SearchIcon,
} from '@/shared/components/icons'
import { useAuth } from './auth/authContext'
import styles from './AppShell.module.css'

const NAV_ITEMS = [
  { to: '/', label: 'Inicio', icon: HomeIcon, end: true },
  { to: '/library', label: 'Biblioteca', icon: LibraryIcon, end: false },
  { to: '/search', label: 'Buscar', icon: SearchIcon, end: false },
]

function navLinkClass({ isActive }: { isActive: boolean }): string {
  return isActive ? `${styles.link} ${styles.linkActive}` : styles.link
}

export function AppShell() {
  const { signOut } = useAuth()

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.inner}>
          <NavLink to="/" className={styles.brand} aria-label="MyPlayGallery, inicio">
            <span className={styles.brandMark} aria-hidden="true">
              <Ps5ControllerIcon width={30} height={30} />
            </span>
            <span className={styles.brandName}>MyPlayGallery</span>
          </NavLink>

          <nav className={styles.nav} aria-label="Navegación principal">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={navLinkClass}
                >
                  <Icon width={18} height={18} />
                  {item.label}
                </NavLink>
              )
            })}
          </nav>

          <NavLink to="/search" className={styles.searchShortcut} aria-label="Buscar juegos">
            <SearchIcon />
          </NavLink>

          <button
            type="button"
            className={styles.signOut}
            onClick={() => void signOut()}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
          >
            <LogOutIcon />
          </button>
        </div>
      </header>

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

      <nav className={styles.bottomNav} aria-label="Navegación principal móvil">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                isActive
                  ? `${styles.bottomLink} ${styles.bottomLinkActive}`
                  : styles.bottomLink
              }
            >
              <Icon />
              {item.label}
            </NavLink>
          )
        })}
      </nav>
    </div>
  )
}
