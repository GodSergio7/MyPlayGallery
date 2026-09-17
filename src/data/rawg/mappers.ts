import type { Game, Platform } from '@/shared/types/domain'
import type {
  RawgGame,
  RawgGameListResponse,
  RawgGamePlatform,
  RawgPlatform,
} from './types'

export function mapRawgPlatform(rawgPlatform: RawgPlatform): Platform {
  return { id: rawgPlatform.id, name: rawgPlatform.name }
}

export function mapRawgGamePlatform(entry: RawgGamePlatform): Platform {
  return mapRawgPlatform(entry.platform)
}

export function mapRawgGame(rawgGame: RawgGame): Game {
  return {
    rawgId: rawgGame.id,
    title: rawgGame.name,
    coverUrl: rawgGame.background_image ?? null,
    released: rawgGame.released ?? null,
    genres: rawgGame.genres.map((genre) => genre.name),
    platforms: rawgGame.platforms.map(mapRawgGamePlatform),
  }
}

export function mapRawgGameList(response: RawgGameListResponse): Game[] {
  return response.results.map(mapRawgGame)
}
