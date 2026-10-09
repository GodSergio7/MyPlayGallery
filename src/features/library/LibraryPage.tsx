import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { GAME_STATUSES, type GameStatus } from '@/shared/types/domain'
import { loadLibraryWithGames } from '@/data/repository'
import { useAsync } from '@/shared/hooks/useAsync'
import { PageHeader } from '@/shared/components/PageHeader'
import { SearchBar } from '@/shared/components/SearchBar'
import { Select, Field } from '@/shared/components/FormControls'
import { Button } from '@/shared/components/Button'
import { GameGrid } from '@/shared/components/GameGrid'
import { LibraryCard } from '@/shared/components/LibraryCard'
import { EmptyState, ErrorState, GridSkeleton } from '@/shared/components/StateViews'
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

export function LibraryPage() {
  const libraryState = useAsync(loadLibraryWithGames, [])
  const [params, setParams] = useSearchParams()
  const { status, platformId, sort, achievement } = readFilters(params)
  const [query, setQuery] = useState('')

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

  const gameById = useMemo(
    () => new Map(games.map((game) => [game.externalId, game])),
    [games],
  )

  const platforms = useMemo(() => {
    const map = new Map<number, string>()
    entries.forEach((entry) => map.set(entry.platformId, entry.platformName))
    return [...map.entries()].map(([id, name]) => ({ id, name }))
  }, [entries])

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()

    const result = entries.filter((entry) => {
      if (status !== 'all' && entry.status !== status) {
        return false
      }
      if (platformId !== 'all' && entry.platformId !== platformId) {
        return false
      }
      if (achievement === 'platino' && !entry.platinum) {
        return false
      }
      if (achievement === 'completo' && !entry.hundredPercent) {
        return false
      }
      if (normalized) {
        const title = gameById.get(entry.externalId)?.title.toLowerCase() ?? ''
        if (!title.includes(normalized)) {
          return false
        }
      }
      return true
    })

    return result.sort((a, b) => {
      switch (sort) {
        case 'score':
          return compareNullableNumbers(a.score, b.score, -1)
        case 'hours':
          return compareNullableNumbers(a.hoursPlayed, b.hoursPlayed, -1)
        case 'started':
          return compareNullableDates(a.startedOn, b.startedOn)
        case 'title':
          return (gameById.get(a.externalId)?.title ?? '').localeCompare(
            gameById.get(b.externalId)?.title ?? '',
          )
        case 'recent':
        default:
          return b.updatedAt.localeCompare(a.updatedAt)
      }
    })
  }, [entries, gameById, query, status, platformId, sort, achievement])

  const hasActiveFilters =
    query.trim() !== '' ||
    status !== 'all' ||
    platformId !== 'all' ||
    sort !== 'recent' ||
    achievement !== 'all'

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

  return (
    <>
      <PageHeader
        title="Biblioteca"
        description={`${entries.length} ${entries.length === 1 ? 'juego' : 'juegos'}`}
      />

      <section className={styles.toolbar} aria-label="Filtros de la biblioteca">
        <div className={styles.searchField}>
          <SearchBar
            id="library-search"
            label="Buscar en mi biblioteca"
            value={query}
            onChange={setQuery}
            placeholder="Buscar por título…"
          />
        </div>

        <Field label="Estado" htmlFor="library-status">
          <Select
            id="library-status"
            value={status}
            onChange={(event) => setFilter('estado', event.target.value)}
          >
            <option value="all">Todos</option>
            {GAME_STATUSES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Plataforma" htmlFor="library-platform">
          <Select
            id="library-platform"
            value={platformId === 'all' ? 'all' : String(platformId)}
            onChange={(event) => setFilter('plataforma', event.target.value)}
          >
            <option value="all">Todas</option>
            {platforms.map((platform) => (
              <option key={platform.id} value={platform.id}>
                {platform.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Logros" htmlFor="library-achievement">
          <Select
            id="library-achievement"
            value={achievement}
            onChange={(event) => setFilter('logro', event.target.value)}
          >
            <option value="all">Todos</option>
            {ACHIEVEMENT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Ordenar por" htmlFor="library-sort">
          <Select
            id="library-sort"
            value={sort}
            onChange={(event) => setFilter('orden', event.target.value)}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>

        <div className={styles.clearWrapper}>
          <Button variant="ghost" onClick={clearFilters} disabled={!hasActiveFilters}>
            Limpiar filtros
          </Button>
        </div>
      </section>

      {filtered.length === 0 ? (
        <EmptyState
          title="Nada coincide con estos filtros"
          action={
            <Button variant="secondary" onClick={clearFilters}>
              Limpiar filtros
            </Button>
          }
        />
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
