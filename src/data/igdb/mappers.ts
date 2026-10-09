import type { Game, GameBrowsePage, GameDetails, GameScore, Platform } from '@/shared/types/domain'
import type {
  IgdbBrowseResponse,
  IgdbCover,
  IgdbFullGame,
  IgdbGame,
  IgdbGameListResponse,
  IgdbPlatform,
} from './types'

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
    rating: igdbGame.total_rating === null ? null : Math.round(igdbGame.total_rating),
    genres: igdbGame.genres.map((genre) => genre.name),
    platforms: igdbGame.platforms.map(mapIgdbPlatform),
  }
}

export function mapIgdbGameList(response: IgdbGameListResponse): Game[] {
  return response.results.map(mapIgdbGame)
}

/** URL absoluta de una imagen de IGDB en el tamaño pedido (t_cover_big, t_1080p…). */
export function igdbImageUrl(url: string, size: string): string {
  const absolute = url.startsWith('//') ? `https:${url}` : url
  return absolute.replace(/\/t_[a-z0-9_]+\//, `/${size}/`)
}

const toScore = (value: number | null, count: number | null): GameScore | null =>
  value === null ? null : { value: Math.round(value), count: count ?? 0 }

const toHours = (seconds: number | null): number | null =>
  seconds === null || seconds <= 0 ? null : Math.max(1, Math.round(seconds / 3600))

export function mapIgdbFullGame(game: IgdbFullGame): GameDetails {
  // Las capturas son más fiables como fondo que los artworks (a veces son banners oscuros o logos).
  const hero = game.screenshots[0] ?? game.artworks[0] ?? null

  return {
    externalId: game.id,
    title: game.name,
    summary: game.summary,
    storyline: game.storyline,
    released: mapIgdbReleaseDate(game.first_release_date),
    coverUrl: game.cover ? igdbImageUrl(game.cover.url, 't_cover_big_2x') : null,
    heroImageUrl: hero ? igdbImageUrl(hero.url, 't_1080p') : null,
    scores: {
      total: toScore(game.total_rating, game.total_rating_count),
      critics: toScore(game.aggregated_rating, game.aggregated_rating_count),
      users: toScore(game.rating, game.rating_count),
    },
    screenshots: game.screenshots.map((shot) => ({
      thumbUrl: igdbImageUrl(shot.url, 't_screenshot_med'),
      fullUrl: igdbImageUrl(shot.url, 't_1080p'),
    })),
    videos: game.videos.map((video) => ({ youtubeId: video.video_id, name: video.name })),
    genres: game.genres,
    themes: game.themes,
    gameModes: game.game_modes,
    perspectives: game.player_perspectives,
    platforms: game.platforms.map(mapIgdbPlatform),
    developers: game.developers,
    publishers: game.publishers,
    franchises: game.franchises,
    engines: game.engines,
    similarGames: game.similar_games.map((similar) => ({
      externalId: similar.id,
      title: similar.name,
      coverUrl: similar.cover ? igdbImageUrl(similar.cover.url, 't_cover_big') : null,
      rating: similar.total_rating === null ? null : Math.round(similar.total_rating),
      released: mapIgdbReleaseDate(similar.first_release_date),
    })),
    websites: game.websites,
    pegi: game.pegi,
    releaseDates: game.release_dates.flatMap((release) => {
      const date = mapIgdbReleaseDate(release.date)
      return date ? [{ platform: release.platform, date }] : []
    }),
    timeToBeat: game.time_to_beat
      ? {
          main: toHours(game.time_to_beat.hastily),
          extra: toHours(game.time_to_beat.normally),
          completionist: toHours(game.time_to_beat.completely),
        }
      : null,
  }
}

export function mapIgdbBrowsePage(response: IgdbBrowseResponse): GameBrowsePage {
  return {
    games: response.results.map(mapIgdbGame),
    hasMore: response.has_more,
    total: response.total,
  }
}
