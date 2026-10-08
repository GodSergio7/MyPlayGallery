import { Link } from 'react-router-dom'
import type { Game } from '@/shared/types/domain'
import { formatDate } from '@/shared/lib/format'
import { CoverImage } from './CoverImage'
import { PlatformBadge } from './Badges'
import styles from './GameCard.module.css'

export function GameCard({ game }: { game: Game }) {
  return (
    <Link
      to={`/game/${game.externalId}`}
      className={styles.card}
      aria-label={`Ver ${game.title}`}
    >
      <CoverImage src={game.coverUrl} title={game.title} tilt />
      <div className={styles.body}>
        <h3 className={styles.title}>{game.title}</h3>
        <p className={styles.meta}>{formatDate(game.released)}</p>
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
