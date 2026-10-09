import { Link, useLocation } from 'react-router-dom'
import type { Game } from '@/shared/types/domain'
import { formatDate } from '@/shared/lib/format'
import { CoverImage } from './CoverImage'
import { PlatformBadge } from './Badges'
import { StarIcon } from './icons'
import styles from './GameCard.module.css'

interface GameCardProps {
  game: Game
  /** Marca el juego como ya añadido a la biblioteca del usuario. */
  inLibrary?: boolean
  /** Destino al pulsar. Por defecto, la página para añadirlo a la biblioteca. */
  to?: string
}

export function GameCard({ game, inLibrary = false, to }: GameCardProps) {
  const location = useLocation()

  return (
    <Link
      to={to ?? `/game/${game.externalId}`}
      // La página de destino usa esta ruta para el enlace de volver (conserva búsqueda y filtros).
      state={{ from: location.pathname + location.search }}
      className={styles.card}
      aria-label={`Ver ${game.title}`}
    >
      <CoverImage src={game.coverUrl} title={game.title} tilt />
      <div className={styles.body}>
        <h3 className={styles.title}>{game.title}</h3>
        <div className={styles.metaRow}>
          <p className={styles.meta}>{formatDate(game.released)}</p>
          {game.rating !== null && (
            <span className={styles.rating} title="Nota media en IGDB">
              <StarIcon width={13} height={13} aria-hidden="true" />
              {game.rating}
            </span>
          )}
        </div>
        {inLibrary && <span className={styles.inLibrary}>En tu biblioteca</span>}
        {game.platforms.length > 0 && (
          <ul className={styles.platforms}>
            {game.platforms.slice(0, 3).map((platform) => (
              <li key={platform.id}>
                <PlatformBadge name={platform.name} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </Link>
  )
}
