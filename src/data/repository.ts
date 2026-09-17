import type { Game, LibraryEntry, LibraryEntryInput } from '@/shared/types/domain'
import {
  createEntry as mockCreateEntry,
  deleteEntry as mockDeleteEntry,
  getEntry as mockGetEntry,
  listEntries as mockListEntries,
  listEntriesByGame as mockListEntriesByGame,
  listGames as mockListGames,
  updateEntry as mockUpdateEntry,
} from './mock/store'
import { rawgGamesRepository, type RawgGamesRepository } from './rawg/repository'

export interface GamesRepository extends RawgGamesRepository {
  list(): Promise<Game[]>
}

export interface LibraryRepository {
  list(): Promise<LibraryEntry[]>
  getById(id: string): Promise<LibraryEntry | undefined>
  listByGame(rawgId: number): Promise<LibraryEntry[]>
  create(input: LibraryEntryInput): Promise<LibraryEntry>
  update(id: string, input: LibraryEntryInput): Promise<LibraryEntry | undefined>
  remove(id: string): Promise<void>
}

export const gamesRepository: GamesRepository = {
  ...rawgGamesRepository,
  list: mockListGames,
}

export const libraryRepository: LibraryRepository = {
  list: mockListEntries,
  getById: mockGetEntry,
  listByGame: mockListEntriesByGame,
  create: mockCreateEntry,
  update: mockUpdateEntry,
  remove: mockDeleteEntry,
}
