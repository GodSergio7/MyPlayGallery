import { useEffect, useState } from 'react'
import { PageHeader } from '@/shared/components/PageHeader'
import { SearchBar } from '@/shared/components/SearchBar'
import { GameGrid } from '@/shared/components/GameGrid'
import { GameCard } from '@/shared/components/GameCard'
import { EmptyState, ErrorState, GridSkeleton } from '@/shared/components/StateViews'
import { useGameSearch } from './hooks/useGameSearch'
import styles from './SearchPage.module.css'

const DEBOUNCE_MS = 350

export function SearchPage() {
  const [term, setTerm] = useState('')
  const [debounced, setDebounced] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(term), DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [term])

  const isSearching = debounced.trim() !== ''
  const { games, isLoading, isError, refetch } = useGameSearch(debounced)

  return (
    <>
      <PageHeader
        title="Buscar videojuegos"
        description="Consultas la base de datos de IGDB para añadir juegos a tu biblioteca."
      />

      <div className={styles.searchField}>
        <SearchBar
          id="igdb-search"
          label="Buscar videojuegos en IGDB"
          value={term}
          onChange={setTerm}
          placeholder="Buscar por título…"
          autoFocus
        />
      </div>

      {!isSearching ? (
        <EmptyState
          title="Busca tu próximo juego"
          description="Escribe el título de un videojuego para ver resultados de IGDB y abrir su ficha."
        />
      ) : isLoading ? (
        <GridSkeleton count={6} />
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : games.length === 0 ? (
        <EmptyState
          title="Sin resultados"
          description={`No hemos encontrado juegos para “${debounced}”. Prueba con otro término.`}
        />
      ) : (
        <GameGrid>
          {games.map((game) => (
            <GameCard key={game.externalId} game={game} />
          ))}
        </GameGrid>
      )}
    </>
  )
}
