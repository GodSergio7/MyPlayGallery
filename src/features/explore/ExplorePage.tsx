import { useEffect, useRef, useState } from 'react'
import { PageHeader } from '@/shared/components/PageHeader'
import { SearchBar } from '@/shared/components/SearchBar'
import { ClearFiltersButton, FilterRow, PillSelect, ViewToggle } from '@/shared/components/FilterControls'
import { Button } from '@/shared/components/Button'
import { GameGrid } from '@/shared/components/GameGrid'
import { GameCard } from '@/shared/components/GameCard'
import { EmptyState, ErrorState, GridSkeleton } from '@/shared/components/StateViews'
import { useViewMode } from '@/shared/hooks/useViewMode'
import type { Game, GameBrowseSort } from '@/shared/types/domain'
import {
  DECADE_OPTIONS,
  GENRE_OPTIONS,
  LETTERS,
  MIN_RATING_OPTIONS,
  PLATFORM_GROUPS,
  SORT_OPTIONS,
} from './catalog'
import {
  countActiveFilters,
  toBrowseFilters,
  useExploreFilters,
} from './hooks/useExploreFilters'
import { useGameBrowse, useLibraryGameIds } from './hooks/useGameBrowse'
import { ExploreListRow } from './ExploreListRow'
import styles from './ExplorePage.module.css'
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle'

const SEARCH_DEBOUNCE_MS = 350
const numberFormat = new Intl.NumberFormat('es-ES')
const DEFAULT_SORT: GameBrowseSort = 'popular'
// La vista elegida (cuadrícula o lista) se recuerda en este navegador.
const VIEW_STORAGE_KEY = 'myplaygallery.explore.view'

export function ExplorePage() {
  useDocumentTitle('Explorar')
  const { filters, update, clear } = useExploreFilters()
  const browse = useGameBrowse(toBrowseFilters(filters))
  const libraryIds = useLibraryGameIds()
  const activeCount = countActiveFilters(filters)
  const [view, setView] = useViewMode(VIEW_STORAGE_KEY)

  // El texto se escribe en local y se lleva a la URL con un pequeño retardo.
  const [term, setTerm] = useState(filters.query)
  const [lastQuery, setLastQuery] = useState(filters.query)
  if (filters.query !== lastQuery) {
    // La URL cambió desde fuera (p. ej. "Limpiar filtros" o volver atrás).
    setLastQuery(filters.query)
    setTerm(filters.query)
  }
  useEffect(() => {
    if (term === filters.query) return undefined
    const timer = setTimeout(() => update({ query: term }), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [term, filters.query, update])

  return (
    <>
      <PageHeader title="Explorar" />

      <section className={styles.toolbar} aria-label="Filtros del catálogo">
        <div className={styles.topRow}>
          <div className={styles.search}>
            <SearchBar
              id="explore-search"
              label="Buscar por nombre"
              value={term}
              onChange={setTerm}
              placeholder="Buscar por nombre…"
            />
          </div>
          <ViewToggle view={view} onChange={setView} />
        </div>

        <FilterRow layout="grid">
          <PillSelect
            id="explore-platform"
            label="Consola"
            value={filters.platformId ? String(filters.platformId) : ''}
            active={filters.platformId !== null}
            onChange={(value) => update({ platformId: value ? Number(value) : null })}
          >
            <option value="">Todas</option>
            {PLATFORM_GROUPS.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </PillSelect>

          <PillSelect
            id="explore-genre"
            label="Género"
            value={filters.genreId ? String(filters.genreId) : ''}
            active={filters.genreId !== null}
            onChange={(value) => update({ genreId: value ? Number(value) : null })}
          >
            <option value="">Todos</option>
            {GENRE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </PillSelect>

          <PillSelect
            id="explore-decade"
            label="Época"
            value={filters.decade ?? ''}
            active={filters.decade !== null}
            onChange={(value) => update({ decade: value || null })}
          >
            <option value="">Cualquiera</option>
            {DECADE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </PillSelect>

          <PillSelect
            id="explore-rating"
            label="Nota"
            value={filters.minRating ? String(filters.minRating) : ''}
            active={filters.minRating !== null}
            onChange={(value) => update({ minRating: value ? Number(value) : null })}
          >
            <option value="">Cualquiera</option>
            {MIN_RATING_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </PillSelect>

          <PillSelect
            id="explore-sort"
            label="Orden"
            value={filters.sort}
            active={filters.sort !== DEFAULT_SORT}
            onChange={(value) => update({ sort: value as GameBrowseSort })}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </PillSelect>

          {/* Hasta 1100 px la barra de letras no cabe: la letra se elige en esta pastilla */}
          <PillSelect
            id="explore-letter"
            label="Letra"
            value={filters.letter ?? ''}
            active={filters.letter !== null}
            onChange={(value) => update({ letter: value || null })}
            className={styles.letterPill}
          >
            <option value="">Todas</option>
            {LETTERS.map((letter) => (
              <option key={letter} value={letter}>
                {letter === '#' ? '# (números)' : letter}
              </option>
            ))}
          </PillSelect>
        </FilterRow>

        <div className={styles.letters} role="group" aria-label="Empieza por">
          <button
            type="button"
            className={styles.letter}
            aria-pressed={filters.letter === null}
            onClick={() => update({ letter: null })}
          >
            Todas
          </button>
          {LETTERS.map((letter) => (
            <button
              key={letter}
              type="button"
              className={styles.letter}
              aria-pressed={filters.letter === letter}
              aria-label={letter === '#' ? 'Empieza por número' : `Empieza por ${letter}`}
              onClick={() => update({ letter: filters.letter === letter ? null : letter })}
            >
              {letter}
            </button>
          ))}
        </div>
      </section>

      <div className={styles.countRow}>
        <p className={styles.count} aria-live="polite">
          {browse.isLoading ? 'Buscando juegos…' : browse.total === null ? '' : `${numberFormat.format(browse.total)} juegos`}
        </p>
        {(activeCount > 0 || filters.sort !== DEFAULT_SORT) && (
          <ClearFiltersButton
            onClick={() => {
              setTerm('')
              clear()
            }}
          />
        )}
      </div>

      {browse.isLoading ? (
        <GridSkeleton count={8} />
      ) : browse.isError ? (
        <ErrorState onRetry={browse.refetch} />
      ) : browse.games.length === 0 ? (
        <EmptyState
          title="Nada coincide con estos filtros"
          action={
            activeCount > 0 ? (
              <Button
                onClick={() => {
                  setTerm('')
                  clear()
                }}
              >
                Limpiar filtros
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          {view === 'list' ? (
            <ul className={styles.list}>
              {browse.games.map((game) => (
                <li key={game.externalId}>
                  <ExploreListRow
                    game={withPlatformFirst(game, filters.platformId)}
                    inLibrary={libraryIds.has(game.externalId)}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <GameGrid>
              {browse.games.map((game) => (
                <GameCard
                  key={game.externalId}
                  game={withPlatformFirst(game, filters.platformId)}
                  to={`/explore/${game.externalId}`}
                  inLibrary={libraryIds.has(game.externalId)}
                />
              ))}
            </GameGrid>
          )}

          <LoadMore
            hasNextPage={browse.hasNextPage}
            isFetching={browse.isFetchingNextPage}
            isError={browse.isFetchNextPageError}
            onLoadMore={browse.fetchNextPage}
          />
        </>
      )}
    </>
  )
}

/** Si se filtra por una consola, su etiqueta aparece la primera en la tarjeta. */
function withPlatformFirst(game: Game, platformId: number | null): Game {
  if (!platformId) return game
  const index = game.platforms.findIndex((platform) => platform.id === platformId)
  if (index <= 0) return game
  const platforms = [...game.platforms]
  const [selected] = platforms.splice(index, 1)
  return { ...game, platforms: [selected, ...platforms] }
}

interface LoadMoreProps {
  hasNextPage: boolean
  isFetching: boolean
  isError: boolean
  onLoadMore: () => void
}

/** Carga la siguiente página al acercarse al final; el botón queda como alternativa accesible. */
function LoadMore({ hasNextPage, isFetching, isError, onLoadMore }: LoadMoreProps) {
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const node = sentinelRef.current
    if (!node || !hasNextPage || isFetching || isError || typeof IntersectionObserver === 'undefined') {
      return undefined
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) onLoadMore()
      },
      { rootMargin: '600px 0px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [hasNextPage, isFetching, isError, onLoadMore])

  if (!hasNextPage) {
    return <p className={styles.end}>No hay más.</p>
  }

  return (
    <div ref={sentinelRef} className={styles.loadMore}>
      {isError && <p className={styles.loadError}>No se han podido cargar más juegos.</p>}
      <Button variant="secondary" onClick={onLoadMore} disabled={isFetching}>
        {isFetching ? 'Cargando…' : isError ? 'Reintentar' : 'Cargar más juegos'}
      </Button>
    </div>
  )
}
