export type GameStatus = 'pending' | 'playing' | 'completed' | 'abandoned'

export interface Platform {
  id: number
  name: string
}

export interface Game {
  externalId: number
  title: string
  coverUrl: string | null
  released: string | null
  /** Nota media de IGDB (crítica y usuarios), 0–100 redondeada. */
  rating: number | null
  genres: string[]
  platforms: Platform[]
}

export interface GameScore {
  /** 0–100, redondeada. */
  value: number
  /** Número de valoraciones o reseñas. */
  count: number
}

export interface GameTag {
  id: number
  /** Nombre en inglés tal como llega de IGDB; la interfaz lo traduce si puede. */
  name: string
}

export interface GameScreenshot {
  thumbUrl: string
  fullUrl: string
}

export interface GameVideo {
  youtubeId: string
  name: string
}

export interface GameWebsite {
  url: string
  /** Tipo de enlace según IGDB (1 = web oficial). */
  type: number | null
}

export interface SimilarGame {
  externalId: number
  title: string
  coverUrl: string | null
  rating: number | null
  released: string | null
}

/** Ficha completa de un juego para la sección Explorar (solo lectura, datos de IGDB). */
export interface GameDetails {
  externalId: number
  title: string
  /** Textos en inglés: IGDB no ofrece traducciones. */
  summary: string | null
  storyline: string | null
  released: string | null
  coverUrl: string | null
  /** Imagen grande para el fondo de la cabecera (primera captura o, si no hay, un artwork). */
  heroImageUrl: string | null
  scores: {
    total: GameScore | null
    critics: GameScore | null
    users: GameScore | null
  }
  screenshots: GameScreenshot[]
  videos: GameVideo[]
  genres: GameTag[]
  themes: GameTag[]
  gameModes: GameTag[]
  perspectives: GameTag[]
  platforms: Platform[]
  developers: string[]
  publishers: string[]
  franchises: string[]
  engines: string[]
  similarGames: SimilarGame[]
  websites: GameWebsite[]
  pegi: string | null
  releaseDates: Array<{ platform: string; date: string }>
  /** Horas aproximadas para terminarlo, según los jugadores de IGDB. */
  timeToBeat: { main: number | null; extra: number | null; completionist: number | null } | null
}

export type GameBrowseSort =
  | 'popular'
  | 'top_rated'
  | 'newest'
  | 'oldest'
  | 'upcoming'
  | 'name_asc'
  | 'name_desc'

/** Filtros para explorar el catálogo completo de IGDB. */
export interface GameBrowseFilters {
  query: string
  /** 'A'..'Z', '#' (empieza por número) o null. */
  letter: string | null
  platformId: number | null
  genreId: number | null
  fromYear: number | null
  toYear: number | null
  minRating: number | null
  sort: GameBrowseSort
}

export interface GameBrowsePage {
  games: Game[]
  hasMore: boolean
  /** Total de resultados; solo viene en la primera página. */
  total: number | null
}

export interface LibraryEntry {
  id: string
  externalId: number
  platformId: number
  platformName: string
  status: GameStatus
  score: number | null
  platinum: boolean
  hundredPercent: boolean
  hoursPlayed: number | null
  startedOn: string | null
  finishedOn: string | null
  review: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export type LibraryEntryInput = Omit<
  LibraryEntry,
  'id' | 'createdAt' | 'updatedAt'
>

export interface GameStatusMeta {
  value: GameStatus
  label: string
}

export const GAME_STATUSES: GameStatusMeta[] = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'playing', label: 'Jugando' },
  { value: 'completed', label: 'Completado' },
  { value: 'abandoned', label: 'Abandonado' },
]
