import type { LibraryEntry } from '@/shared/types/domain'

export interface MostPlayedGame {
  externalId: number
  /** Entrada con más horas de ese juego: es a la que lleva el enlace. */
  entryId: string
  platforms: string[]
  hours: number
}

/**
 * Juegos con más horas, de mayor a menor. Si un juego está en varias plataformas,
 * se suman sus horas en una sola fila. Los juegos sin horas no aparecen.
 */
export function mostPlayed(entries: LibraryEntry[], limit: number): MostPlayedGame[] {
  const byGame = new Map<number, { game: MostPlayedGame; topHours: number }>()

  for (const entry of entries) {
    const hours = entry.hoursPlayed ?? 0
    if (hours <= 0) continue

    const current = byGame.get(entry.externalId)
    if (!current) {
      byGame.set(entry.externalId, {
        game: { externalId: entry.externalId, entryId: entry.id, platforms: [entry.platformName], hours },
        topHours: hours,
      })
      continue
    }

    current.game.hours += hours
    current.game.platforms.push(entry.platformName)
    if (hours > current.topHours) {
      current.topHours = hours
      current.game.entryId = entry.id
    }
  }

  return [...byGame.values()]
    .map(({ game }) => ({ ...game, hours: Math.round(game.hours * 10) / 10 }))
    .sort((a, b) => b.hours - a.hours)
    .slice(0, limit)
}
