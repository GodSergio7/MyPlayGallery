import { useEffect, useRef, useState } from 'react'
import { PageHeader } from '@/shared/components/PageHeader'
import { SearchBar } from '@/shared/components/SearchBar'
import { Field, Select } from '@/shared/components/FormControls'
import { Button } from '@/shared/components/Button'
import { GameGrid } from '@/shared/components/GameGrid'
import { GameCard } from '@/shared/components/GameCard'
import { EmptyState, ErrorState, GridSkeleton } from '@/shared/components/StateViews'
import { CloseIcon } from '@/shared/components/icons'
import type { Game, GameBrowseSort } from '@/shared/types/domain'
import {
  DECADE_OPTIONS,
  GENRE_OPTIONS,
  LETTERS,
  MIN_RATING_OPTIONS,
  PLATFORM_GROUPS,
  SORT_OPTIONS,
  labelFor,
} from './catalog'
import {
  countActiveFilters,
  toBrowseFilters,
  useExploreFilters,
  type ExploreFilterState,
} from './hooks/useExploreFilters'
import { useGameBrowse, useLibraryGameIds } from './hooks/useGameBrowse'
import styles from './ExplorePage.module.css'

const SEARCH_DEBOUNCE_MS = 350
const numberFormat = new Intl.NumberFormat('es-ES')

export function ExplorePage() {
  const { filters, update, clear } = useExploreFilters()
  const browse = useGameBrowse(toBrowseFilters(filters))
  const libraryIds = useLibraryGameIds()
  const activeCount = countActiveFilters(filters)
  const [filtersOpen, setFiltersOpen] = useState(false)

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
      <PageHeader
        title="Explorar"
      />

      <section className={styles.panel} aria-label="Filtros del catálogo">
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

          <Field label="Ordenar por" htmlFor="explore-sort">
            <Select
              id="explore-sort"
              value={filters.sort}
              onChange={(event) => update({ sort: event.target.value as GameBrowseSort })}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>

          <button
            type="button"
            className={styles.filtersToggle}
            aria-expanded={filtersOpen}
            aria-controls="explore-filters"
            onClick={() => setFiltersOpen((open) => !open)}
          >
            Filtros{activeCount > 0 ? ` (${activeCount})` : ''}
          </button>
        </div>

        <div
          id="explore-filters"
          className={filtersOpen ? `${styles.filters} ${styles.filtersOpen}` : styles.filters}
        >
          <Field label="Consola" htmlFor="explore-platform">
            <Select
              id="explore-platform"
              value={filters.platformId ?? ''}
              onChange={(event) => update({ platformId: event.target.value ? Number(event.target.value) : null })}
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
            </Select>
          </Field>

          <Field label="Género" htmlFor="explore-genre">
            <Select
              id="explore-genre"
              value={filters.genreId ?? ''}
              onChange={(event) => update({ genreId: event.target.value ? Number(event.target.value) : null })}
            >
              <option value="">Todos</option>
              {GENRE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Época" htmlFor="explore-decade">
            <Select
              id="explore-decade"
              value={filters.decade ?? ''}
              onChange={(event) => update({ decade: event.target.value || null })}
            >
              <option value="">Cualquiera</option>
              {DECADE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Nota mínima" htmlFor="explore-rating">
            <Select
              id="explore-rating"
              value={filters.minRating ?? ''}
              onChange={(event) => update({ minRating: event.target.value ? Number(event.target.value) : null })}
            >
              <option value="">Cualquiera</option>
              {MIN_RATING_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

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

      <ResultsSummary
        filters={filters}
        total={browse.total}
        loading={browse.isLoading}
        onRemove={update}
        onClear={() => {
          setTerm('')
          clear()
        }}
      />

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

interface ResultsSummaryProps {
  filters: ExploreFilterState
  total: number | null
  loading: boolean
  onRemove: (patch: Partial<ExploreFilterState>) => void
  onClear: () => void
}

function ResultsSummary({ filters, total, loading, onRemove, onClear }: ResultsSummaryProps) {
  const chips: Array<{ key: string; label: string; patch: Partial<ExploreFilterState> }> = []
  if (filters.query.trim()) chips.push({ key: 'q', label: `“${filters.query.trim()}”`, patch: { query: '' } })
  if (filters.letter) chips.push({ key: 'letter', label: labelFor.letter(filters.letter), patch: { letter: null } })
  if (filters.platformId)
    chips.push({ key: 'platform', label: labelFor.platform(filters.platformId), patch: { platformId: null } })
  if (filters.genreId) chips.push({ key: 'genre', label: labelFor.genre(filters.genreId), patch: { genreId: null } })
  if (filters.decade) chips.push({ key: 'decade', label: labelFor.decade(filters.decade), patch: { decade: null } })
  if (filters.minRating)
    chips.push({ key: 'rating', label: labelFor.minRating(filters.minRating), patch: { minRating: null } })

  return (
    <div className={styles.summary}>
      <p className={styles.count} aria-live="polite">
        {loading ? 'Buscando juegos…' : total === null ? '' : `${numberFormat.format(total)} juegos`}
        <span className={styles.sortNote}> · {labelFor.sort(filters.sort)}</span>
      </p>

      {chips.length > 0 && (
        <ul className={styles.chips} aria-label="Filtros activos">
          {chips.map((chip) => (
            <li key={chip.key}>
              <button
                type="button"
                className={styles.chip}
                onClick={() => onRemove(chip.patch)}
                aria-label={`Quitar filtro: ${chip.label}`}
              >
                {chip.label}
                <CloseIcon width={14} height={14} aria-hidden="true" />
              </button>
            </li>
          ))}
          <li>
            <button type="button" className={styles.clear} onClick={onClear}>
              Limpiar filtros
            </button>
          </li>
        </ul>
      )}
    </div>
  )
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
