import { useQuery } from '@tanstack/react-query'
import type { Game } from '@/shared/types/domain'
import { gamesRepository } from '@/data/repository'

const SEARCH_STALE_TIME = 5 * 60 * 1000
const SEARCH_GC_TIME = 30 * 60 * 1000

export function gameSearchQueryKey(query: string) {
  return ['rawg', 'search', query.trim().toLowerCase()] as const
}

export interface GameSearchState {
  games: Game[]
  isLoading: boolean
  isError: boolean
  refetch: () => void
}

export function useGameSearch(query: string): GameSearchState {
  const normalizedQuery = query.trim().toLowerCase()

  const result = useQuery({
    queryKey: gameSearchQueryKey(normalizedQuery),
    queryFn: ({ signal }) => gamesRepository.search(normalizedQuery, signal),
    enabled: normalizedQuery.length > 0,
    staleTime: SEARCH_STALE_TIME,
    gcTime: SEARCH_GC_TIME,
  })

  return {
    games: result.data ?? [],
    isLoading: result.isPending,
    isError: result.isError,
    refetch: () => {
      void result.refetch()
    },
  }
}
