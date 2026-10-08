import type { Game } from '@/shared/types/domain'
import { DataError, isDataError } from '@/data/errors'
import { invokeIgdbProxy } from './client'
import { mapIgdbGame, mapIgdbGameList } from './mappers'
import { IgdbGameListResponseSchema, IgdbGameSchema } from './schemas'

const MAX_IDS_PER_REQUEST = 100

export interface IgdbGamesRepository {
  search(query: string, signal?: AbortSignal): Promise<Game[]>
  getById(gameId: number, signal?: AbortSignal): Promise<Game | undefined>
  getByIds(gameIds: number[], signal?: AbortSignal): Promise<Game[]>
}

async function search(query: string, signal?: AbortSignal): Promise<Game[]> {
  const term = query.trim()
  if (term.length === 0) {
    return []
  }

  const data = await invokeIgdbProxy(
    `igdb-proxy/games?search=${encodeURIComponent(term)}`,
    signal,
  )

  const parsed = IgdbGameListResponseSchema.safeParse(data)
  if (!parsed.success) {
    throw new DataError('invalidResponse')
  }

  return mapIgdbGameList(parsed.data)
}

async function getById(gameId: number, signal?: AbortSignal): Promise<Game | undefined> {
  try {
    const data = await invokeIgdbProxy(`igdb-proxy/games/${gameId}`, signal)

    const parsed = IgdbGameSchema.safeParse(data)
    if (!parsed.success) {
      throw new DataError('invalidResponse')
    }

    return mapIgdbGame(parsed.data)
  } catch (error) {
    if (isDataError(error) && error.kind === 'notFound') {
      return undefined
    }
    throw error
  }
}

async function getByIds(gameIds: number[], signal?: AbortSignal): Promise<Game[]> {
  const uniqueIds = [...new Set(gameIds)]
  const chunks: number[][] = []
  for (let index = 0; index < uniqueIds.length; index += MAX_IDS_PER_REQUEST) {
    chunks.push(uniqueIds.slice(index, index + MAX_IDS_PER_REQUEST))
  }

  const responses = await Promise.all(
    chunks.map((chunk) => invokeIgdbProxy(`igdb-proxy/games?ids=${chunk.join(',')}`, signal)),
  )

  return responses.flatMap((data) => {
    const parsed = IgdbGameListResponseSchema.safeParse(data)
    if (!parsed.success) {
      throw new DataError('invalidResponse')
    }
    return mapIgdbGameList(parsed.data)
  })
}

export const igdbGamesRepository: IgdbGamesRepository = { search, getById, getByIds }
