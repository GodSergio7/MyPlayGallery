import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle'
import { PageHeader } from '@/shared/components/PageHeader'
import { SearchBar } from '@/shared/components/SearchBar'
import { GameGrid } from '@/shared/components/GameGrid'
import { GameCard } from '@/shared/components/GameCard'
import { EmptyState, ErrorState, GridSkeleton } from '@/shared/components/StateViews'
import { useGameSearch } from './hooks/useGameSearch'
import styles from './SearchPage.module.css'

const DEBOUNCE_MS = 350

export function SearchPage() {
  useDocumentTitle('Añadir juego')
  // Lo buscado va en la URL (?q=): al volver de un juego se recupera la búsqueda (T-18).
  const [params, setParams] = useSearchParams()
  const debounced = params.get('q') ?? ''
  const [term, setTerm] = useState(debounced)

  useEffect(() => {
    if (term === debounced) return undefined
    const timer = setTimeout(() => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current)
          if (term.trim()) next.set('q', term)
          else next.delete('q')
          return next
        },
        { replace: true },
      )
    }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [term, debounced, setParams])

  const isSearching = debounced.trim() !== ''
  const { games, isLoading, isError, refetch } = useGameSearch(debounced)

  return (
    <>
      <PageHeader
        title="Añadir juego"
      />

      <div className={styles.searchField}>
        <SearchBar
          id="igdb-search"
          label="Nombre del juego"
          value={term}
          onChange={setTerm}
          placeholder="Buscar por título…"
          autoFocus
        />
      </div>

      {!isSearching ? (
        <EmptyState
          title="Escribe el nombre de un juego"
        />
      ) : isLoading ? (
        <GridSkeleton count={6} />
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : games.length === 0 ? (
        <EmptyState
          title="Sin resultados"
          description={`No hay nada para “${debounced}”.`}
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
