import { useQuery, useQueryClient } from '@tanstack/react-query'
import { gamesRepository, libraryRepository, loadLibraryWithGames } from '@/data/repository'

// Cargas de la biblioteca con TanStack Query (T-19): caché compartida entre páginas y una sola
// forma de invalidar después de crear, editar o borrar. Todas las claves cuelgan de ['library'].

export const libraryKeys = {
  all: ['library'] as const,
  withGames: ['library', 'with-games'] as const,
  entry: (id: string) => ['library', 'entry', id] as const,
  byGame: (externalId: number) => ['library', 'by-game', externalId] as const,
}

/** Entradas de la biblioteca con sus juegos de IGDB (Inicio y Biblioteca). */
export function useLibraryWithGames() {
  return useQuery({ queryKey: libraryKeys.withGames, queryFn: loadLibraryWithGames })
}

// TanStack Query no admite undefined como resultado: "no existe" se guarda como null.

export function useEntry(id: string) {
  return useQuery({
    queryKey: libraryKeys.entry(id),
    queryFn: async () => (await libraryRepository.getById(id)) ?? null,
  })
}

/** Entradas del mismo juego en otras plataformas. */
export function useEntriesByGame(externalId: number | undefined) {
  return useQuery({
    queryKey: libraryKeys.byGame(externalId ?? 0),
    queryFn: () => libraryRepository.listByGame(externalId ?? 0),
    enabled: externalId !== undefined && externalId > 0,
  })
}

/** Ficha básica de un juego en IGDB. Cambia poco: se reutiliza durante una hora. */
export function useGame(externalId: number | undefined) {
  return useQuery({
    queryKey: ['igdb', 'game', externalId ?? 0],
    queryFn: async ({ signal }) => (await gamesRepository.getById(externalId ?? 0, signal)) ?? null,
    enabled: externalId !== undefined && externalId > 0,
    staleTime: 60 * 60 * 1000,
  })
}

/** Marca como desactualizado todo lo de la biblioteca (tras crear, editar o borrar una entrada). */
export function useInvalidateLibrary() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: libraryKeys.all })
}
