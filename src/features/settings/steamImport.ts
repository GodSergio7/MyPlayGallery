import type { SteamOwnedGame } from '@/data/supabase/connectionsRepository'
import type { GameStatus, LibraryEntry } from '@/shared/types/domain'

// Plan de importación de Steam (SPEC-08, fase 2): qué juegos son nuevos, cuáles ya están en la
// biblioteca y hay que actualizar, y cuáles no tienen ficha en IGDB. Lógica pura, sin red.

/** Plataforma con la que se guardan los juegos de Steam (id de IGDB para PC). */
export const STEAM_PLATFORM = { id: 6, name: 'PC (Microsoft Windows)' } as const

const RECENT_DAYS = 30

type Achievements = SteamOwnedGame['achievements']

export function minutesToHours(minutes: number): number {
  return Math.round((minutes / 60) * 10) / 10
}

/** Todos los logros conseguidos (y el juego tiene logros). */
export function hasAllAchievements(achievements: Achievements): boolean {
  return achievements !== null && achievements.total > 0 && achievements.unlocked === achievements.total
}

/**
 * Estado propuesto a partir de lo que dice Steam (el usuario lo puede cambiar antes de importar).
 * Completado solo cuando se tienen todos los logros:
 * - sin abrir → Pendiente
 * - todos los logros → Completado
 * - jugado en los últimos 30 días → Jugando
 * - el resto → Abandonado
 */
export function proposeStatus(
  game: Pick<SteamOwnedGame, 'minutes' | 'lastPlayedAt' | 'achievements'>,
  now = Date.now(),
): GameStatus {
  if (game.minutes === 0) return 'pending'
  if (hasAllAchievements(game.achievements)) return 'completed'
  const lastPlayed = game.lastPlayedAt ? Date.parse(game.lastPlayedAt) : Number.NaN
  if (!Number.isNaN(lastPlayed) && now - lastPlayed <= RECENT_DAYS * 24 * 60 * 60 * 1000) return 'playing'
  return 'abandoned'
}

export interface NewGame {
  igdbId: number
  steamName: string
  minutes: number
  hours: number
  achievements: Achievements
  status: GameStatus
  hundredPercent: boolean
}

/** Juego que ya está en la biblioteca en PC y que Steam permite poner al día. */
export interface EntryUpdate {
  entryId: string
  igdbId: number
  steamName: string
  currentHours: number | null
  /** Horas nuevas, o null si las de la biblioteca ya son iguales o mayores. */
  steamHours: number | null
  /** Tiene todos los logros en Steam y en la biblioteca aún no está marcado al 100%. */
  completeAll: boolean
}

export interface ImportPlan {
  total: number
  newGames: NewGame[]
  updates: EntryUpdate[]
  upToDate: number
  unmatched: string[]
}

export function buildImportPlan(
  steamGames: SteamOwnedGame[],
  entries: LibraryEntry[],
  now = Date.now(),
): ImportPlan {
  // Varios appid pueden ser el mismo juego en IGDB (ediciones, servidores de prueba): se queda el más jugado.
  const byIgdb = new Map<number, SteamOwnedGame>()
  const unmatched: string[] = []
  for (const game of steamGames) {
    if (game.igdbId === null) {
      unmatched.push(game.name)
      continue
    }
    const previous = byIgdb.get(game.igdbId)
    if (!previous || game.minutes > previous.minutes) byIgdb.set(game.igdbId, game)
  }

  const pcEntries = new Map(
    entries.filter((entry) => entry.platformId === STEAM_PLATFORM.id).map((entry) => [entry.externalId, entry]),
  )

  const newGames: NewGame[] = []
  const updates: EntryUpdate[] = []
  let upToDate = 0

  for (const [igdbId, game] of byIgdb) {
    const hours = minutesToHours(game.minutes)
    const allAchievements = hasAllAchievements(game.achievements)
    const existing = pcEntries.get(igdbId)

    if (!existing) {
      newGames.push({
        igdbId,
        steamName: game.name,
        minutes: game.minutes,
        hours,
        achievements: game.achievements,
        status: proposeStatus(game, now),
        hundredPercent: allAchievements,
      })
      continue
    }

    const moreHours = hours > (existing.hoursPlayed ?? 0)
    const completeAll = allAchievements && !existing.hundredPercent
    if (moreHours || completeAll) {
      updates.push({
        entryId: existing.id,
        igdbId,
        steamName: game.name,
        currentHours: existing.hoursPlayed,
        steamHours: moreHours ? hours : null,
        completeAll,
      })
    } else {
      upToDate += 1
    }
  }

  newGames.sort((a, b) => b.minutes - a.minutes || a.steamName.localeCompare(b.steamName))
  updates.sort((a, b) => (b.steamHours ?? 0) - (a.steamHours ?? 0))
  unmatched.sort((a, b) => a.localeCompare(b))

  return { total: steamGames.length, newGames, updates, upToDate, unmatched }
}
