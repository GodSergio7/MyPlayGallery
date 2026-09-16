import { useEffect, useState } from 'react'
import { searchGames } from '@/data/mock/store'
import { useAsync } from '@/shared/hooks/useAsync'
import { PageHeader } from '@/shared/components/PageHeader'
import { SearchBar } from '@/shared/components/SearchBar'
import { GameGrid } from '@/shared/components/GameGrid'
import { GameCard } from '@/shared/components/GameCard'
import { EmptyState, ErrorState, GridSkeleton } from '@/shared/components/StateViews'
import styles from './SearchPage.module.css'

export function SearchPage() {
  const [term, setTerm] = useState('')
  const [debounced, setDebounced] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(term), 350)
    return () => clearTimeout(timer)
  }, [term])

  const isSearching = debounced.trim() !== ''
  const state = useAsync(
    () => (isSearching ? searchGames(debounced) : Promise.resolve([])),
    [debounced, isSearching],
  )

  const results = state.data ?? []

  return (
    <>
      <PageHeader
        title="Buscar videojuegos"
        description="Consultas la base de datos de RAWG para añadir juegos a tu biblioteca."
      />

      <div className={styles.searchField}>
        <SearchBar
          id="rawg-search"
          label="Buscar videojuegos en RAWG"
          value={term}
          onChange={setTerm}
          placeholder="Buscar por título…"
          autoFocus
        />
      </div>

      {!isSearching ? (
        <EmptyState
          title="Busca tu próximo juego"
          description="Escribe el título de un videojuego para ver resultados de RAWG y abrir su ficha."
        />
      ) : state.loading ? (
        <GridSkeleton count={6} />
      ) : state.error ? (
        <ErrorState onRetry={state.reload} />
      ) : results.length === 0 ? (
        <EmptyState
          title="Sin resultados"
          description={`No hemos encontrado juegos para “${debounced}”. Prueba con otro término.`}
        />
      ) : (
        <GameGrid>
          {results.map((game) => (
            <GameCard key={game.rawgId} game={game} />
          ))}
        </GameGrid>
      )}
    </>
  )
}
