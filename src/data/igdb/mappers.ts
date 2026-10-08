import type { Game, Platform } from '@/shared/types/domain'
import type { IgdbCover, IgdbGame, IgdbGameListResponse, IgdbPlatform } from './types'

const DEFAULT_COVER_SIZE = '/t_thumb/'
const COVER_SIZE = '/t_cover_big/'

export function mapIgdbCoverUrl(cover: IgdbCover | null): string | null {
  if (!cover) {
    return null
  }

  const absolute = cover.url.startsWith('//') ? `https:${cover.url}` : cover.url
  return absolute.replace(DEFAULT_COVER_SIZE, COVER_SIZE)
}

export function mapIgdbReleaseDate(timestamp: number | null): string | null {
  if (timestamp === null) {
    return null
  }

  const date = new Date(timestamp * 1000)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date.toISOString().slice(0, 10)
}

export function mapIgdbPlatform(igdbPlatform: IgdbPlatform): Platform {
  return { id: igdbPlatform.id, name: igdbPlatform.name }
}

export function mapIgdbGame(igdbGame: IgdbGame): Game {
  return {
    externalId: igdbGame.id,
    title: igdbGame.name,
    coverUrl: mapIgdbCoverUrl(igdbGame.cover),
    released: mapIgdbReleaseDate(igdbGame.first_release_date),
    genres: igdbGame.genres.map((genre) => genre.name),
    platforms: igdbGame.platforms.map(mapIgdbPlatform),
  }
}

export function mapIgdbGameList(response: IgdbGameListResponse): Game[] {
  return response.results.map(mapIgdbGame)
}
