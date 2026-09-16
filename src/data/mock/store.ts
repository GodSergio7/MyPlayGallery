import type { Game, LibraryEntry, LibraryEntryInput } from '@/shared/types/domain'
import { GAMES } from './games'
import { ENTRIES } from './entries'

const DELAY_MS = 350

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(value), DELAY_MS)
  })
}

let entries: LibraryEntry[] = ENTRIES.map((entry) => ({ ...entry }))

export function listGames(): Promise<Game[]> {
  return delay(GAMES)
}

export function getGame(rawgId: number): Promise<Game | undefined> {
  return delay(GAMES.find((game) => game.rawgId === rawgId))
}

export function searchGames(query: string): Promise<Game[]> {
  const normalized = query.trim().toLowerCase()

  const results = normalized
    ? GAMES.filter((game) => game.title.toLowerCase().includes(normalized))
    : GAMES

  return delay(results)
}

export function listEntries(): Promise<LibraryEntry[]> {
  return delay([...entries])
}

export function getEntry(id: string): Promise<LibraryEntry | undefined> {
  return delay(entries.find((entry) => entry.id === id))
}

export function listEntriesByGame(rawgId: number): Promise<LibraryEntry[]> {
  return delay(entries.filter((entry) => entry.rawgId === rawgId))
}

export function createEntry(input: LibraryEntryInput): Promise<LibraryEntry> {
  const now = new Date().toISOString()
  const entry: LibraryEntry = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  }

  entries = [entry, ...entries]
  return delay(entry)
}

export function updateEntry(
  id: string,
  input: LibraryEntryInput,
): Promise<LibraryEntry | undefined> {
  let updated: LibraryEntry | undefined

  entries = entries.map((entry) => {
    if (entry.id !== id) {
      return entry
    }

    updated = { ...entry, ...input, updatedAt: new Date().toISOString() }
    return updated
  })

  return delay(updated)
}

export function deleteEntry(id: string): Promise<void> {
  entries = entries.filter((entry) => entry.id !== id)
  return delay(undefined)
}
