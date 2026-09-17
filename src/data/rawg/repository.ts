import type { Game } from '@/shared/types/domain'
import { DataError, isDataError } from '@/data/errors'
import { invokeRawgProxy } from './client'
import { mapRawgGame, mapRawgGameList } from './mappers'
import { RawgGameListResponseSchema, RawgGameSchema } from './schemas'

export interface RawgGamesRepository {
  search(query: string, signal?: AbortSignal): Promise<Game[]>
  getById(rawgId: number, signal?: AbortSignal): Promise<Game | undefined>
}

async function search(query: string, signal?: AbortSignal): Promise<Game[]> {
  const term = query.trim()
  if (term.length === 0) {
    return []
  }

  const data = await invokeRawgProxy(
    `rawg-proxy/games?search=${encodeURIComponent(term)}&page=1`,
    signal,
  )

  const parsed = RawgGameListResponseSchema.safeParse(data)
  if (!parsed.success) {
    throw new DataError('invalidResponse')
  }

  return mapRawgGameList(parsed.data)
}

async function getById(rawgId: number, signal?: AbortSignal): Promise<Game | undefined> {
  try {
    const data = await invokeRawgProxy(`rawg-proxy/games/${rawgId}`, signal)

    const parsed = RawgGameSchema.safeParse(data)
    if (!parsed.success) {
      throw new DataError('invalidResponse')
    }

    return mapRawgGame(parsed.data)
  } catch (error) {
    if (isDataError(error) && error.kind === 'notFound') {
      return undefined
    }
    throw error
  }
}

export const rawgGamesRepository: RawgGamesRepository = { search, getById }
