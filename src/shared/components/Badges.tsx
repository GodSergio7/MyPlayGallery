import { GAME_STATUSES, type GameStatus } from '@/shared/types/domain'
import styles from './Badges.module.css'

const statusClass: Record<GameStatus, string> = {
  pending: styles.pending,
  playing: styles.playing,
  completed: styles.completed,
  abandoned: styles.abandoned,
}

export function StatusBadge({ status }: { status: GameStatus }) {
  const meta = GAME_STATUSES.find((item) => item.value === status)

  return (
    <span className={[styles.badge, statusClass[status]].join(' ')}>
      <span className={styles.dot} aria-hidden="true" />
      {meta?.label ?? status}
    </span>
  )
}

export function PlatformBadge({ name }: { name: string }) {
  return <span className={[styles.badge, styles.platform].join(' ')}>{name}</span>
}

export function Score({ value }: { value: number | null }) {
  if (value === null) {
    return <span className={styles.scoreEmpty}>Sin puntuar</span>
  }

  return (
    <span className={styles.score} aria-label={`Puntuación ${value} sobre 10`}>
      {value.toFixed(1)}
      <span className={styles.scoreMax}>/10</span>
    </span>
  )
}
