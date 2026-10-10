import { afterEach, describe, expect, it, vi } from 'vitest'
import { gamesRepository, libraryRepository, loadLibraryWithGames } from './repository'
import { DataError } from './errors'
import type { LibraryEntry } from '@/shared/types/domain'

const entry: LibraryEntry = {
  id: 'a',
  externalId: 1942,
  platformId: 6,
  platformName: 'PC (Microsoft Windows)',
  status: 'playing',
  score: null,
  platinum: false,
  hundredPercent: false,
  hoursPlayed: 10,
  startedOn: null,
  finishedOn: null,
  review: null,
  notes: null,
  createdAt: '2026-10-01T10:00:00Z',
  updatedAt: '2026-10-01T10:00:00Z',
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('loadLibraryWithGames', () => {
  it('devuelve las entradas y sus juegos', async () => {
    vi.spyOn(libraryRepository, 'list').mockResolvedValue([entry])
    vi.spyOn(gamesRepository, 'getByIds').mockResolvedValue([])

    await expect(loadLibraryWithGames()).resolves.toEqual({ entries: [entry], games: [], gamesUnavailable: false })
  })

  it('si IGDB falla, devuelve igualmente las entradas y avisa', async () => {
    vi.spyOn(libraryRepository, 'list').mockResolvedValue([entry])
    vi.spyOn(gamesRepository, 'getByIds').mockRejectedValue(new DataError('rateLimited'))

    await expect(loadLibraryWithGames()).resolves.toEqual({ entries: [entry], games: [], gamesUnavailable: true })
  })

  it('si falla Supabase, sí es un error', async () => {
    vi.spyOn(libraryRepository, 'list').mockRejectedValue(new DataError('network'))

    await expect(loadLibraryWithGames()).rejects.toBeInstanceOf(DataError)
  })
})
