import type { Game, LibraryEntry, LibraryEntryInput } from '@/shared/types/domain'
import {
  createEntry,
  deleteEntry,
  getEntry,
  listEntries,
  listEntriesByGame,
  updateEntry,
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
}

export interface LibraryWithGames {
  entries: LibraryEntry[]
  games: Game[]
}

export const gamesRepository: GamesRepository = igdbGamesRepository

export const libraryRepository: LibraryRepository = {
  list: listEntries,
  getById: getEntry,
  listByGame: listEntriesByGame,
  create: createEntry,
  update: updateEntry,
  remove: deleteEntry,
}

export async function loadLibraryWithGames(): Promise<LibraryWithGames> {
  const entries = await libraryRepository.list()
  const games = await gamesRepository.getByIds(entries.map((entry) => entry.externalId))
  return { entries, games }
}
