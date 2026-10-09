import { Link } from 'react-router-dom'
import type { Game, LibraryEntry } from '@/shared/types/domain'
import { formatHours } from '@/shared/lib/format'
import { CoverImage } from './CoverImage'
import { Score, StatusBadge } from './Badges'
import styles from './LibraryCard.module.css'

interface LibraryCardProps {
  entry: LibraryEntry
  game: Game | undefined
}

export function LibraryCard({ entry, game }: LibraryCardProps) {
  const title = game?.title ?? 'Juego desconocido'

  return (
    <Link
      to={`/library/${entry.id}`}
      className={styles.card}
      aria-label={`${title}, ${entry.platformName}`}
    >
      <CoverImage src={game?.coverUrl ?? null} title={title} />
      <div className={styles.body}>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.meta}>
          <span className={styles.platform}>{entry.platformName}</span>
          {entry.hoursPlayed !== null && (
            <span className={styles.hours}>{formatHours(entry.hoursPlayed)}</span>
          )}
        </p>
        <div className={styles.footer}>
          <StatusBadge status={entry.status} />
          {entry.score !== null && (
            <span className={styles.score}>
              <Score value={entry.score} />
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
