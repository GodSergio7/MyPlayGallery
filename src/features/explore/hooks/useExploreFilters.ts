import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { GameBrowseFilters, GameBrowseSort } from '@/shared/types/domain'
import {
  DECADE_OPTIONS,
  GENRE_OPTIONS,
  LETTERS,
  MIN_RATING_OPTIONS,
  PLATFORM_GROUPS,
  SORT_OPTIONS,
  decadeToYears,
} from '../catalog'

// Los filtros viven en la URL (?q=&letra=&consola=&genero=&decada=&nota=&orden=):
// se pueden compartir y se conservan al volver atrás desde la ficha de un juego.

export interface ExploreFilterState {
  query: string
  letter: string | null
  platformId: number | null
  genreId: number | null
  decade: string | null
  minRating: number | null
  sort: GameBrowseSort
}

const DEFAULT_SORT: GameBrowseSort = 'popular'

const PARAM = {
  query: 'q',
  letter: 'letra',
  platformId: 'consola',
  genreId: 'genero',
  decade: 'decada',
  minRating: 'nota',
  sort: 'orden',
} as const satisfies Record<keyof ExploreFilterState, string>

const validPlatforms = new Set(PLATFORM_GROUPS.flatMap((g) => g.options.map((o) => o.value)))
const validGenres = new Set(GENRE_OPTIONS.map((o) => o.value))
const validDecades = new Set(DECADE_OPTIONS.map((o) => o.value))
const validRatings = new Set(MIN_RATING_OPTIONS.map((o) => o.value))
const validSorts = new Set(SORT_OPTIONS.map((o) => o.value))

/** Lee un número de la URL solo si está en la lista de valores permitidos. */
function pickNumber(raw: string | null, allowed: Set<number>): number | null {
  const value = Number(raw)
  return raw && allowed.has(value) ? value : null
}

function readFilters(params: URLSearchParams): ExploreFilterState {
  const letter = (params.get(PARAM.letter) ?? '').toUpperCase()
  const decade = params.get(PARAM.decade)
  const sort = params.get(PARAM.sort) as GameBrowseSort | null

  return {
    query: (params.get(PARAM.query) ?? '').slice(0, 100),
    letter: LETTERS.includes(letter) ? letter : null,
    platformId: pickNumber(params.get(PARAM.platformId), validPlatforms),
    genreId: pickNumber(params.get(PARAM.genreId), validGenres),
    decade: decade && validDecades.has(decade) ? decade : null,
    minRating: pickNumber(params.get(PARAM.minRating), validRatings),
    sort: sort && validSorts.has(sort) ? sort : DEFAULT_SORT,
  }
}

export function toBrowseFilters(state: ExploreFilterState): GameBrowseFilters {
  return {
    query: state.query.trim(),
    letter: state.letter,
    platformId: state.platformId,
    genreId: state.genreId,
    minRating: state.minRating,
    sort: state.sort,
    ...decadeToYears(state.decade),
  }
}

/** Número de filtros activos (sin contar el orden). */
export function countActiveFilters(state: ExploreFilterState): number {
  return [state.query.trim(), state.letter, state.platformId, state.genreId, state.decade, state.minRating].filter(
    Boolean,
  ).length
}

export function useExploreFilters() {
  const [params, setParams] = useSearchParams()
  const filters = useMemo(() => readFilters(params), [params])

  const update = useCallback(
    (patch: Partial<ExploreFilterState>) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current)
          for (const [key, value] of Object.entries(patch) as [keyof ExploreFilterState, unknown][]) {
            const name = PARAM[key]
            const isDefault = key === 'sort' && value === DEFAULT_SORT
            if (value === null || value === '' || value === undefined || isDefault) next.delete(name)
            else next.set(name, String(value))
          }
          return next
        },
        // Escribir en el buscador no debe llenar el historial; cambiar un filtro sí.
        { replace: 'query' in patch && Object.keys(patch).length === 1 },
      )
    },
    [setParams],
  )

  const clear = useCallback(() => {
    setParams((current) => {
      const next = new URLSearchParams()
      const sort = current.get(PARAM.sort)
      if (sort) next.set(PARAM.sort, sort)
      return next
    })
  }, [setParams])

  return { filters, update, clear }
}
