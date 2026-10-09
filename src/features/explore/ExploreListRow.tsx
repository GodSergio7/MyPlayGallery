import { Link, useLocation } from 'react-router-dom'
import type { Game } from '@/shared/types/domain'
import { CoverImage } from '@/shared/components/CoverImage'
import { StarIcon } from '@/shared/components/icons'
import styles from './ExploreListRow.module.css'

interface ExploreListRowProps {
  game: Game
  inLibrary: boolean
}

/** Fila del catálogo en vista de lista: portada, título, año, plataformas y nota. */
export function ExploreListRow({ game, inLibrary }: ExploreListRowProps) {
  const location = useLocation()
  const year = game.released ? game.released.slice(0, 4) : null
  const platforms = game.platforms.map((platform) => platform.name)

  return (
    <Link
      to={`/explore/${game.externalId}`}
      // La ficha usa esta ruta para el enlace de volver (conserva búsqueda y filtros).
      state={{ from: location.pathname + location.search }}
      className={styles.row}
      aria-label={`Ver ${game.title}`}
    >
      <CoverImage src={game.coverUrl} title={game.title} className={styles.cover} />

      <span className={styles.main}>
        <span className={styles.title}>{game.title}</span>
        <span className={styles.meta}>
          {year && <span className={styles.metaYear}>{year}</span>}
          {platforms.length > 0 && (
            <span className={styles.platforms}>
              {platforms.slice(0, 3).join(' · ')}
              {platforms.length > 3 && ` +${platforms.length - 3}`}
            </span>
          )}
        </span>
        {inLibrary && <span className={styles.inLibrary}>En tu biblioteca</span>}
      </span>

      <span className={styles.year}>{year ?? '—'}</span>
      <span className={styles.rating}>
        {game.rating !== null ? (
          <>
            <StarIcon width={13} height={13} aria-hidden="true" />
            {game.rating}
          </>
        ) : (
          <span className={styles.noRating}>—</span>
        )}
      </span>
    </Link>
  )
}
