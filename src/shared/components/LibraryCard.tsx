import { Link } from 'react-router-dom'
import type { Game, LibraryEntry } from '@/shared/types/domain'
import { formatHours } from '@/shared/lib/format'
import { CoverImage } from './CoverImage'
import { PlatformBadge, Score, StatusBadge } from './Badges'
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
      <CoverImage src={game?.coverUrl ?? null} title={title} tilt />
      <div className={styles.body}>
        <h3 className={styles.title}>{title}</h3>
        <PlatformBadge name={entry.platformName} />
        <div className={styles.footer}>
          <StatusBadge status={entry.status} />
          <div className={styles.stats}>
            {entry.score !== null && <Score value={entry.score} />}
            {entry.hoursPlayed !== null && (
              <span className={styles.hours}>{formatHours(entry.hoursPlayed)}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
