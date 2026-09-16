export type GameStatus = 'pending' | 'playing' | 'completed' | 'abandoned'

export interface Platform {
  id: number
  name: string
}

export interface Game {
  rawgId: number
  title: string
  coverUrl: string | null
  released: string | null
  genres: string[]
  platforms: Platform[]
}

export interface LibraryEntry {
  id: string
  rawgId: number
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
