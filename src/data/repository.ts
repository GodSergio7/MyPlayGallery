import type { Game, LibraryEntry, LibraryEntryInput } from '@/shared/types/domain'
import {
  createEntries,
  createEntry,
  deleteEntry,
  getEntry,
  listEntries,
  listEntriesByGame,
  updateEntry,
  updateEntryFromSteam,
  type SteamEntryPatch,
} from './supabase/libraryRepository'
import { igdbGamesRepository, type IgdbGamesRepository } from './igdb/repository'

export type GamesRepository = IgdbGamesRepository

export interface LibraryRepository {
  list(): Promise<LibraryEntry[]>
  getById(id: string): Promise<LibraryEntry | undefined>
  listByGame(externalId: number): Promise<LibraryEntry[]>
  create(input: LibraryEntryInput): Promise<LibraryEntry>
  update(id: string, input: LibraryEntryInput): Promise<LibraryEntry | undefined>
  remove(id: string): Promise<void>
  /** Alta de varias entradas a la vez; ignora las que ya existen. Devuelve cuántas se han creado. */
  createMany(inputs: LibraryEntryInput[]): Promise<number>
  /** Actualiza solo horas, 100% o estado (sincronización con Steam). */
  updateFromSteam(id: string, patch: SteamEntryPatch): Promise<void>
}

export interface LibraryWithGames {
  entries: LibraryEntry[]
  games: Game[]
  /** IGDB no ha respondido: las entradas se muestran sin título ni portada ("Juego desconocido"). */
  gamesUnavailable: boolean
}

export const gamesRepository: GamesRepository = igdbGamesRepository

export const libraryRepository: LibraryRepository = {
  list: listEntries,
  getById: getEntry,
  listByGame: listEntriesByGame,
  create: createEntry,
  update: updateEntry,
  remove: deleteEntry,
  createMany: createEntries,
  updateFromSteam: updateEntryFromSteam,
}

export async function loadLibraryWithGames(): Promise<LibraryWithGames> {
  // Tus datos están en Supabase: si IGDB falla (caído, sin cuota, tiempo agotado), la biblioteca
  // se sigue mostrando con lo que tenemos en lugar de una pantalla de error.
  const entries = await libraryRepository.list()
  try {
    const games = await gamesRepository.getByIds(entries.map((entry) => entry.externalId))
    return { entries, games, gamesUnavailable: false }
  } catch {
    return { entries, games: [], gamesUnavailable: true }
  }
}
