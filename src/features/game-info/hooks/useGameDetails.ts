import { useQuery } from '@tanstack/react-query'
import { gamesRepository } from '@/data/repository'

const DETAILS_STALE_TIME = 30 * 60 * 1000

/** Ficha completa de un juego de IGDB (se guarda en caché 30 minutos). */
export function useGameDetails(gameId: number) {
  const valid = Number.isSafeInteger(gameId) && gameId > 0

  const result = useQuery({
    queryKey: ['igdb', 'details', gameId],
    queryFn: ({ signal }) => gamesRepository.getDetails(gameId, signal),
    enabled: valid,
    staleTime: DETAILS_STALE_TIME,
  })

  return {
    game: result.data,
    isLoading: valid && result.isPending,
    isError: result.isError,
    notFound: !valid || (result.isSuccess && result.data === undefined),
    refetch: () => void result.refetch(),
  }
}
