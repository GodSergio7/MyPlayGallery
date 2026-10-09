import { Link } from 'react-router-dom'
import type { Game, LibraryEntry } from '@/shared/types/domain'
import { formatHours } from '@/shared/lib/format'
import { CoverImage } from '@/shared/components/CoverImage'
import { Score, StatusBadge } from '@/shared/components/Badges'
import { TrophyIcon } from '@/shared/components/icons'
import styles from './LibraryListRow.module.css'

interface LibraryListRowProps {
  entry: LibraryEntry
  game: Game | undefined
}

/** Fila de la biblioteca en vista de lista: portada pequeña, título y datos en una línea. */
export function LibraryListRow({ entry, game }: LibraryListRowProps) {
  const title = game?.title ?? 'Juego desconocido'

  return (
    <Link to={`/library/${entry.id}`} className={styles.row} aria-label={`${title}, ${entry.platformName}`}>
      <CoverImage src={game?.coverUrl ?? null} title={title} className={styles.cover} />

      <span className={styles.main}>
        <span className={styles.title}>{title}</span>
        <span className={styles.meta}>
          <span className={styles.platform}>{entry.platformName}</span>
          {entry.hoursPlayed !== null && <span className={styles.metaHours}>· {formatHours(entry.hoursPlayed)}</span>}
          {(entry.platinum || entry.hundredPercent) && (
            <span className={styles.achievement} title={entry.platinum ? 'Platino' : 'Al 100%'}>
              <TrophyIcon width={12} height={12} aria-hidden="true" />
              <span className={styles.achievementLabel}>{entry.platinum ? 'Platino' : '100%'}</span>
            </span>
          )}
        </span>
      </span>

      <span className={styles.status}>
        <StatusBadge status={entry.status} />
      </span>
      <span className={styles.score}>{entry.score !== null ? <Score value={entry.score} /> : '—'}</span>
      <span className={styles.hours}>{entry.hoursPlayed !== null ? formatHours(entry.hoursPlayed) : '—'}</span>
    </Link>
  )
}
