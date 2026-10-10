import { GAME_STATUSES, type GameStatus, type LibraryEntry } from '@/shared/types/domain'

export interface LibraryStats {
  total: number
  totalHours: number
  /** Media de las entradas con nota, o null si ninguna tiene. */
  averageScore: number | null
  scoredCount: number
  platinumCount: number
  hundredCount: number
  playingCount: number
  statusCounts: Array<{ value: GameStatus; label: string; count: number }>
}

/** Cifras del Inicio a partir de las entradas de la biblioteca. */
export function libraryStats(entries: LibraryEntry[]): LibraryStats {
  const scored = entries.filter((entry) => entry.score !== null)
  return {
    total: entries.length,
    totalHours: Math.round(entries.reduce((sum, entry) => sum + (entry.hoursPlayed ?? 0), 0) * 10) / 10,
    averageScore:
      scored.length > 0 ? scored.reduce((sum, entry) => sum + (entry.score ?? 0), 0) / scored.length : null,
    scoredCount: scored.length,
    platinumCount: entries.filter((entry) => entry.platinum).length,
    hundredCount: entries.filter((entry) => entry.hundredPercent).length,
    playingCount: entries.filter((entry) => entry.status === 'playing').length,
    statusCounts: GAME_STATUSES.map((status) => ({
      ...status,
      count: entries.filter((entry) => entry.status === status.value).length,
    })),
  }
}
