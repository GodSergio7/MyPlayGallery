import type { GameBrowseSort } from '@/shared/types/domain'

// Valores de los filtros de Explorar. Los ids de plataformas y géneros son los de IGDB.

export interface Option<T> {
  value: T
  label: string
}

export interface OptionGroup<T> {
  label: string
  options: Option<T>[]
}

export const SORT_OPTIONS: Option<GameBrowseSort>[] = [
  { value: 'popular', label: 'Más populares' },
  { value: 'top_rated', label: 'Mejor valorados' },
  { value: 'newest', label: 'Novedades' },
  { value: 'upcoming', label: 'Próximos lanzamientos' },
  { value: 'oldest', label: 'Más antiguos' },
  { value: 'name_asc', label: 'Nombre (A–Z)' },
  { value: 'name_desc', label: 'Nombre (Z–A)' },
]

export const PLATFORM_GROUPS: OptionGroup<number>[] = [
  {
    label: 'PlayStation',
    options: [
      { value: 167, label: 'PlayStation 5' },
      { value: 48, label: 'PlayStation 4' },
      { value: 9, label: 'PlayStation 3' },
      { value: 8, label: 'PlayStation 2' },
      { value: 7, label: 'PlayStation' },
      { value: 46, label: 'PlayStation Vita' },
    ],
  },
  {
    label: 'Xbox',
    options: [
      { value: 169, label: 'Xbox Series X|S' },
      { value: 49, label: 'Xbox One' },
      { value: 12, label: 'Xbox 360' },
      { value: 11, label: 'Xbox' },
    ],
  },
  {
    label: 'Nintendo',
    options: [
      { value: 508, label: 'Nintendo Switch 2' },
      { value: 130, label: 'Nintendo Switch' },
      { value: 41, label: 'Wii U' },
      { value: 5, label: 'Wii' },
      { value: 37, label: 'Nintendo 3DS' },
      { value: 20, label: 'Nintendo DS' },
      { value: 21, label: 'GameCube' },
      { value: 4, label: 'Nintendo 64' },
      { value: 19, label: 'Super Nintendo' },
      { value: 18, label: 'NES' },
      { value: 24, label: 'Game Boy Advance' },
      { value: 22, label: 'Game Boy Color' },
      { value: 33, label: 'Game Boy' },
    ],
  },
  {
    label: 'PC y móvil',
    options: [
      { value: 6, label: 'PC (Windows)' },
      { value: 14, label: 'Mac' },
      { value: 3, label: 'Linux' },
      { value: 39, label: 'iOS' },
      { value: 34, label: 'Android' },
    ],
  },
  {
    label: 'Sega',
    options: [
      { value: 23, label: 'Dreamcast' },
      { value: 32, label: 'Sega Saturn' },
    ],
  },
]

export const GENRE_OPTIONS: Option<number>[] = [
  { value: 31, label: 'Aventura' },
  { value: 2, label: 'Aventura gráfica' },
  { value: 33, label: 'Arcade' },
  { value: 35, label: 'Cartas y tablero' },
  { value: 10, label: 'Carreras' },
  { value: 14, label: 'Deportes' },
  { value: 15, label: 'Estrategia' },
  { value: 16, label: 'Estrategia por turnos' },
  { value: 11, label: 'Estrategia en tiempo real' },
  { value: 25, label: "Hack and slash / Beat 'em up" },
  { value: 32, label: 'Indie' },
  { value: 4, label: 'Lucha' },
  { value: 36, label: 'MOBA' },
  { value: 7, label: 'Música' },
  { value: 34, label: 'Novela visual' },
  { value: 30, label: 'Pinball' },
  { value: 8, label: 'Plataformas' },
  { value: 26, label: 'Preguntas y trivial' },
  { value: 9, label: 'Puzles' },
  { value: 12, label: 'Rol (RPG)' },
  { value: 5, label: 'Shooter' },
  { value: 13, label: 'Simulación' },
  { value: 24, label: 'Táctico' },
]

/** Décadas: el valor es el año de inicio; 'antes' son los anteriores a 1980. */
export const DECADE_OPTIONS: Option<string>[] = [
  { value: '2020', label: 'Años 2020' },
  { value: '2010', label: 'Años 2010' },
  { value: '2000', label: 'Años 2000' },
  { value: '1990', label: 'Años 90' },
  { value: '1980', label: 'Años 80' },
  { value: 'antes', label: 'Antes de 1980' },
]

export function decadeToYears(decade: string | null): { fromYear: number | null; toYear: number | null } {
  if (decade === 'antes') return { fromYear: null, toYear: 1979 }
  const start = Number(decade)
  if (!decade || !Number.isInteger(start)) return { fromYear: null, toYear: null }
  return { fromYear: start, toYear: start + 9 }
}

export const MIN_RATING_OPTIONS: Option<number>[] = [
  { value: 90, label: '90 o más' },
  { value: 80, label: '80 o más' },
  { value: 70, label: '70 o más' },
  { value: 60, label: '60 o más' },
]

export const LETTERS: string[] = ['#', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')]

const allPlatforms = PLATFORM_GROUPS.flatMap((group) => group.options)

export const labelFor = {
  sort: (value: GameBrowseSort) => SORT_OPTIONS.find((o) => o.value === value)?.label ?? value,
  platform: (value: number) => allPlatforms.find((o) => o.value === value)?.label ?? `Plataforma ${value}`,
  genre: (value: number) => GENRE_OPTIONS.find((o) => o.value === value)?.label ?? `Género ${value}`,
  decade: (value: string) => DECADE_OPTIONS.find((o) => o.value === value)?.label ?? value,
  minRating: (value: number) => `Nota ${value}+`,
  letter: (value: string) => (value === '#' ? 'Empieza por número' : `Letra ${value}`),
}
