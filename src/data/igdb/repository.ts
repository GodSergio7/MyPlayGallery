import type { Game, GameBrowseFilters, GameBrowsePage, GameDetails } from '@/shared/types/domain'
import { DataError, isDataError } from '@/data/errors'
import { invokeIgdbProxy } from './client'
import { mapIgdbBrowsePage, mapIgdbFullGame, mapIgdbGame, mapIgdbGameList } from './mappers'
import {
  IgdbBrowseResponseSchema,
  IgdbFullGameSchema,
  IgdbGameListResponseSchema,
  IgdbGameSchema,
} from './schemas'

const MAX_IDS_PER_REQUEST = 100

export interface IgdbGamesRepository {
  search(query: string, signal?: AbortSignal): Promise<Game[]>
  getById(gameId: number, signal?: AbortSignal): Promise<Game | undefined>
  getByIds(gameIds: number[], signal?: AbortSignal): Promise<Game[]>
  browse(filters: GameBrowseFilters, offset: number, signal?: AbortSignal): Promise<GameBrowsePage>
  /** Ficha completa; `undefined` si el juego no existe. */
  getDetails(gameId: number, signal?: AbortSignal): Promise<GameDetails | undefined>
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

/** Convierte los filtros en los parámetros que entiende la ruta games/browse de la función. */
export function browseSearchParams(filters: GameBrowseFilters, offset: number): URLSearchParams {
  const params = new URLSearchParams({ sort: filters.sort })
  const query = filters.query.trim()
  if (query) params.set('q', query)
  if (filters.letter) params.set('letter', filters.letter)
  if (filters.platformId) params.set('platform', String(filters.platformId))
  if (filters.genreId) params.set('genre', String(filters.genreId))
  if (filters.fromYear) params.set('from', String(filters.fromYear))
  if (filters.toYear) params.set('to', String(filters.toYear))
  if (filters.minRating) params.set('min_rating', String(filters.minRating))
  if (offset > 0) params.set('offset', String(offset))
  return params
}

async function browse(
  filters: GameBrowseFilters,
  offset: number,
  signal?: AbortSignal,
): Promise<GameBrowsePage> {
  const data = await invokeIgdbProxy(
    `igdb-proxy/games/browse?${browseSearchParams(filters, offset).toString()}`,
    signal,
  )

  const parsed = IgdbBrowseResponseSchema.safeParse(data)
  if (!parsed.success) {
    throw new DataError('invalidResponse')
  }
  return mapIgdbBrowsePage(parsed.data)
}

async function getDetails(gameId: number, signal?: AbortSignal): Promise<GameDetails | undefined> {
  try {
    const data = await invokeIgdbProxy('igdb-proxy/games/' + gameId + '/full', signal)

    const parsed = IgdbFullGameSchema.safeParse(data)
    if (!parsed.success) {
      throw new DataError('invalidResponse')
    }
    return mapIgdbFullGame(parsed.data)
  } catch (error) {
    if (isDataError(error) && error.kind === 'notFound') {
      return undefined
    }
    throw error
  }
}

export const igdbGamesRepository: IgdbGamesRepository = {
  search,
  getById,
  getByIds,
  browse,
  getDetails,
}
