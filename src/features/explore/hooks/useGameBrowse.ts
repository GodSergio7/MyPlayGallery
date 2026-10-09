import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import type { GameBrowseFilters } from '@/shared/types/domain'
import { gamesRepository, libraryRepository } from '@/data/repository'

const BROWSE_STALE_TIME = 5 * 60 * 1000
const BROWSE_GC_TIME = 30 * 60 * 1000

export function gameBrowseQueryKey(filters: GameBrowseFilters) {
  return ['igdb', 'browse', filters] as const
}

/** Catálogo de IGDB paginado: cada página trae 24 juegos y se cargan bajo demanda. */
export function useGameBrowse(filters: GameBrowseFilters) {
  const result = useInfiniteQuery({
    queryKey: gameBrowseQueryKey(filters),
    queryFn: ({ pageParam, signal }) => gamesRepository.browse(filters, pageParam, signal),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) =>
      lastPage.hasMore ? pages.reduce((total, page) => total + page.games.length, 0) : undefined,
    staleTime: BROWSE_STALE_TIME,
    gcTime: BROWSE_GC_TIME,
  })

  const pages = result.data?.pages ?? []

  return {
    // Se eliminan duplicados por si IGDB repite un juego entre páginas.
    games: [...new Map(pages.flatMap((page) => page.games).map((game) => [game.externalId, game])).values()],
    total: pages[0]?.total ?? null,
    isLoading: result.isPending,
    isError: result.isError,
    hasNextPage: result.hasNextPage,
    isFetchingNextPage: result.isFetchingNextPage,
    isFetchNextPageError: result.isFetchNextPageError,
    fetchNextPage: () => void result.fetchNextPage(),
    refetch: () => void result.refetch(),
  }
}

/** Ids de IGDB de los juegos que el usuario ya tiene en su biblioteca. */
export function useLibraryGameIds(): Set<number> {
  const result = useQuery({
    queryKey: ['library', 'game-ids'],
    queryFn: async () => new Set((await libraryRepository.list()).map((entry) => entry.externalId)),
    staleTime: 0, // Se vuelve a pedir al entrar, por si se acaba de añadir un juego
  })
  return result.data ?? new Set()
}
