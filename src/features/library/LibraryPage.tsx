import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { GAME_STATUSES, type GameStatus } from '@/shared/types/domain'
import { loadLibraryWithGames } from '@/data/repository'
import { useAsync } from '@/shared/hooks/useAsync'
import { PageHeader } from '@/shared/components/PageHeader'
import { IgdbNotice } from '@/shared/components/IgdbNotice'
import { SearchBar } from '@/shared/components/SearchBar'
import { Button } from '@/shared/components/Button'
import { GameGrid } from '@/shared/components/GameGrid'
import { LibraryCard } from '@/shared/components/LibraryCard'
import { EmptyState, ErrorState, GridSkeleton } from '@/shared/components/StateViews'
import { ClearFiltersButton, FilterRow, PillSelect, ViewToggle } from '@/shared/components/FilterControls'
import { useViewMode } from '@/shared/hooks/useViewMode'
import { LibraryListRow } from './LibraryListRow'
import styles from './LibraryPage.module.css'

type SortKey = 'recent' | 'score' | 'hours' | 'started' | 'title'

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: 'recent', label: 'Actividad reciente' },
  { value: 'score', label: 'Puntuación' },
  { value: 'hours', label: 'Horas jugadas' },
  { value: 'started', label: 'Fecha de inicio' },
  { value: 'title', label: 'Título' },
]

function compareNullableNumbers(a: number | null, b: number | null, direction: 1 | -1): number {
  if (a === null && b === null) {
    return 0
  }
  if (a === null) {
    return 1
  }
  if (b === null) {
    return -1
  }
  return (a - b) * direction
}

function compareNullableDates(a: string | null, b: string | null): number {
  if (a === null && b === null) {
    return 0
  }
  if (a === null) {
    return 1
  }
  if (b === null) {
    return -1
  }
  return b.localeCompare(a)
}

type Achievement = 'platino' | 'completo'

const ACHIEVEMENT_OPTIONS: Array<{ value: Achievement; label: string }> = [
  { value: 'platino', label: 'Con platino' },
  { value: 'completo', label: 'Al 100%' },
]

const STATUS_VALUES = new Set<string>(GAME_STATUSES.map((option) => option.value))
const SORT_VALUES = new Set<string>(SORT_OPTIONS.map((option) => option.value))

// Estado, plataforma, orden y logro van en la URL (?estado=&plataforma=&orden=&logro=),
// así el Inicio puede enlazar a la biblioteca ya filtrada.
function readFilters(params: URLSearchParams) {
  const status = params.get('estado') ?? ''
  const platform = Number(params.get('plataforma'))
  const sort = params.get('orden') ?? ''
  const achievement = params.get('logro')

  return {
    status: STATUS_VALUES.has(status) ? (status as GameStatus) : ('all' as const),
    platformId: Number.isInteger(platform) && platform > 0 ? platform : ('all' as const),
    sort: SORT_VALUES.has(sort) ? (sort as SortKey) : ('recent' as const),
    achievement: achievement === 'platino' || achievement === 'completo' ? achievement : ('all' as const),
  }
}

// La vista elegida (cuadrícula o lista) se recuerda en este navegador.
const VIEW_STORAGE_KEY = 'myplaygallery.library.view'

export function LibraryPage() {
  const libraryState = useAsync(loadLibraryWithGames, [])
  const [params, setParams] = useSearchParams()
  const { status, platformId, sort, achievement } = readFilters(params)
  const [query, setQuery] = useState('')
  const [view, setView] = useViewMode(VIEW_STORAGE_KEY)

  function setFilter(name: 'estado' | 'plataforma' | 'orden' | 'logro', value: string | null) {
    setParams(
      (current) => {
        const next = new URLSearchParams(current)
        if (value === null || value === 'all' || (name === 'orden' && value === 'recent')) next.delete(name)
        else next.set(name, value)
        return next
      },
      { replace: true },
    )
  }

  const entries = useMemo(() => libraryState.data?.entries ?? [], [libraryState.data])
  const games = useMemo(() => libraryState.data?.games ?? [], [libraryState.data])

  const gameById = useMemo(() => new Map(games.map((game) => [game.externalId, game])), [games])

  const platforms = useMemo(() => {
    const map = new Map<number, string>()
    entries.forEach((entry) => map.set(entry.platformId, entry.platformName))
    return [...map.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))
  }, [entries])

  // Todos los filtros menos el estado: sirve para filtrar y para contar cuántos hay de cada estado.
  const matchingExceptStatus = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return entries.filter((entry) => {
      if (platformId !== 'all' && entry.platformId !== platformId) return false
      if (achievement === 'platino' && !entry.platinum) return false
      if (achievement === 'completo' && !entry.hundredPercent) return false
      if (normalized) {
        const title = gameById.get(entry.externalId)?.title.toLowerCase() ?? ''
        if (!title.includes(normalized)) return false
      }
      return true
    })
  }, [entries, gameById, query, platformId, achievement])

  const statusCounts = useMemo(() => {
    const counts = new Map<GameStatus, number>()
    for (const entry of matchingExceptStatus) counts.set(entry.status, (counts.get(entry.status) ?? 0) + 1)
    return counts
  }, [matchingExceptStatus])

  const filtered = useMemo(() => {
    const result = matchingExceptStatus.filter((entry) => status === 'all' || entry.status === status)

    return result.sort((a, b) => {
      switch (sort) {
        case 'score':
          return compareNullableNumbers(a.score, b.score, -1)
        case 'hours':
          return compareNullableNumbers(a.hoursPlayed, b.hoursPlayed, -1)
        case 'started':
          return compareNullableDates(a.startedOn, b.startedOn)
        case 'title':
          return (gameById.get(a.externalId)?.title ?? '').localeCompare(gameById.get(b.externalId)?.title ?? '')
        case 'recent':
        default:
          return b.updatedAt.localeCompare(a.updatedAt)
      }
    })
  }, [matchingExceptStatus, gameById, status, sort])

  const hasActiveFilters =
    query.trim() !== '' || status !== 'all' || platformId !== 'all' || sort !== 'recent' || achievement !== 'all'

  function clearFilters() {
    setQuery('')
    setParams(new URLSearchParams(), { replace: true })
  }

  if (libraryState.loading) {
    return (
      <>
        <PageHeader title="Biblioteca" />
        <GridSkeleton count={8} />
      </>
    )
  }

  if (libraryState.error) {
    return (
      <ErrorState
        onRetry={() => {
          libraryState.reload()
        }}
      />
    )
  }

  if (entries.length === 0) {
    return (
      <>
        <PageHeader title="Biblioteca" />
        <EmptyState
          title="Todavía no has añadido ningún juego"
          action={
            <Link to="/search">
              <Button>Añadir un juego</Button>
            </Link>
          }
        />
      </>
    )
  }

  const description = `${entries.length} ${entries.length === 1 ? 'juego' : 'juegos'}`

  return (
    <>
      <PageHeader title="Biblioteca" description={description} />
      {libraryState.data?.gamesUnavailable && <IgdbNotice onRetry={() => libraryState.reload()} />}

      <section className={styles.toolbar} aria-label="Filtros de la biblioteca">
        <div className={styles.topRow}>
          <div className={styles.search}>
            <SearchBar
              id="library-search"
              label="Buscar en mi biblioteca"
              value={query}
              onChange={setQuery}
              placeholder="Buscar por título…"
            />
          </div>
          <ViewToggle view={view} onChange={setView} />
        </div>

        <FilterRow label="Estado">
          <StatusChip
            label="Todos"
            count={matchingExceptStatus.length}
            active={status === 'all'}
            onClick={() => setFilter('estado', null)}
          />
          {GAME_STATUSES.map((option) => (
            <StatusChip
              key={option.value}
              label={option.label}
              status={option.value}
              count={statusCounts.get(option.value) ?? 0}
              active={status === option.value}
              onClick={() => setFilter('estado', status === option.value ? null : option.value)}
            />
          ))}
        </FilterRow>

        <FilterRow layout="grid">
          <PillSelect
            id="library-platform"
            label="Plataforma"
            value={platformId === 'all' ? 'all' : String(platformId)}
            active={platformId !== 'all'}
            onChange={(value) => setFilter('plataforma', value)}
          >
            <option value="all">Todas</option>
            {platforms.map((platform) => (
              <option key={platform.id} value={platform.id}>
                {platform.name}
              </option>
            ))}
          </PillSelect>

          <PillSelect
            id="library-achievement"
            label="Logros"
            value={achievement}
            active={achievement !== 'all'}
            onChange={(value) => setFilter('logro', value)}
          >
            <option value="all">Todos</option>
            {ACHIEVEMENT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </PillSelect>

          <PillSelect
            id="library-sort"
            label="Orden"
            value={sort}
            active={sort !== 'recent'}
            onChange={(value) => setFilter('orden', value)}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </PillSelect>
        </FilterRow>
      </section>

      {hasActiveFilters && (
        <div className={styles.resultsRow}>
          <p className={styles.results} aria-live="polite">
            {filtered.length} de {entries.length} juegos
          </p>
          <ClearFiltersButton onClick={clearFilters} />
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          title="Nada coincide con estos filtros"
          action={
            <Button variant="secondary" onClick={clearFilters}>
              Limpiar filtros
            </Button>
          }
        />
      ) : view === 'list' ? (
        <ul className={styles.list}>
          {filtered.map((entry) => (
            <li key={entry.id}>
              <LibraryListRow entry={entry} game={gameById.get(entry.externalId)} />
            </li>
          ))}
        </ul>
      ) : (
        <GameGrid>
          {filtered.map((entry) => (
            <LibraryCard key={entry.id} entry={entry} game={gameById.get(entry.externalId)} />
          ))}
        </GameGrid>
      )}
    </>
  )
}

function StatusChip({
  label,
  count,
  active,
  status,
  onClick,
}: {
  label: string
  count: number
  active: boolean
  status?: GameStatus
  onClick: () => void
}) {
  return (
    <button type="button" className={styles.chip} aria-pressed={active} data-status={status} onClick={onClick}>
      {status && <span className={styles.chipDot} aria-hidden="true" />}
      {label}
      <span className={styles.chipCount}>{count}</span>
    </button>
  )
}
