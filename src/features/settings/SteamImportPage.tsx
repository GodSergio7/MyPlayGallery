import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { gamesRepository, libraryRepository } from '@/data/repository'
import { errorMessage } from '@/data/errors'
import { readSteamLibrary } from '@/data/supabase/connectionsRepository'
import { GAME_STATUSES, type Game, type GameStatus, type LibraryEntryInput } from '@/shared/types/domain'
import { Button } from '@/shared/components/Button'
import { CoverImage } from '@/shared/components/CoverImage'
import { PageHeader } from '@/shared/components/PageHeader'
import { SearchBar } from '@/shared/components/SearchBar'
import { EmptyState, ErrorState, LoadingState } from '@/shared/components/StateViews'
import { ArrowLeftIcon, CheckIcon, TrophyIcon } from '@/shared/components/icons'
import { formatHours } from '@/shared/lib/format'
import {
  buildImportPlan,
  hasAllAchievements,
  STEAM_PLATFORM,
  type EntryUpdate,
  type ImportPlan,
  type NewGame,
} from './steamImport'
import styles from './SteamImportPage.module.css'

export function SteamImportPage() {
  const steam = useQuery({
    queryKey: ['steam', 'library'],
    queryFn: readSteamLibrary,
    staleTime: Infinity,
    retry: false,
  })
  const entries = useQuery({ queryKey: ['library', 'entries'], queryFn: () => libraryRepository.list() })

  const plan = useMemo(
    () => (steam.data && entries.data ? buildImportPlan(steam.data.games, entries.data) : null),
    [steam.data, entries.data],
  )

  return (
    <>
      <Link to="/settings" className={styles.back}>
        <ArrowLeftIcon width={16} height={16} aria-hidden="true" />
        Volver a Ajustes
      </Link>
      <PageHeader title="Importar desde Steam" />

      {steam.isError ? (
        <ErrorState
          title="No se ha podido leer tu biblioteca de Steam"
          description={errorMessage(steam.error)}
          onRetry={() => void steam.refetch()}
        />
      ) : entries.isError ? (
        <ErrorState description={errorMessage(entries.error)} onRetry={() => void entries.refetch()} />
      ) : !plan ? (
        <LoadingState message="Leyendo tu biblioteca de Steam…" />
      ) : (
        <ImportReview plan={plan} />
      )}
    </>
  )
}

// ---------------------------------------------------------------- Revisión

function ImportReview({ plan }: { plan: ImportPlan }) {
  const queryClient = useQueryClient()
  const [query, setQuery] = useState('')
  // Por defecto se marcan los juegos con horas; los que nunca has abierto, no.
  const [selected, setSelected] = useState(
    () => new Set(plan.newGames.filter((game) => game.minutes > 0).map((game) => game.igdbId)),
  )
  const [statuses, setStatuses] = useState(() => new Map(plan.newGames.map((game) => [game.igdbId, game.status])))
  const [selectedUpdates, setSelectedUpdates] = useState(
    () => new Set(plan.updates.map((update) => update.entryId)),
  )

  const covers = useQuery({
    queryKey: ['igdb', 'batch', plan.newGames.map((game) => game.igdbId).join(',')],
    queryFn: ({ signal }) =>
      gamesRepository.getByIds(
        plan.newGames.map((game) => game.igdbId),
        signal,
      ),
    enabled: plan.newGames.length > 0,
    staleTime: Infinity,
  })
  const gameById = useMemo(
    () => new Map<number, Game>((covers.data ?? []).map((game) => [game.externalId, game])),
    [covers.data],
  )

  const normalized = query.trim().toLowerCase()
  const visibleGames = normalized
    ? plan.newGames.filter((game) =>
        (gameById.get(game.igdbId)?.title ?? game.steamName).toLowerCase().includes(normalized),
      )
    : plan.newGames

  const save = useMutation({
    mutationFn: async () => {
      const inputs: LibraryEntryInput[] = plan.newGames
        .filter((game) => selected.has(game.igdbId))
        .map((game) => ({
          externalId: game.igdbId,
          platformId: STEAM_PLATFORM.id,
          platformName: STEAM_PLATFORM.name,
          status: statuses.get(game.igdbId) ?? game.status,
          score: null,
          platinum: false,
          hundredPercent: game.hundredPercent,
          hoursPlayed: game.hours > 0 ? game.hours : null,
          startedOn: null,
          finishedOn: null,
          review: null,
          notes: null,
        }))
      const created = await libraryRepository.createMany(inputs)
      const updates = plan.updates.filter((update) => selectedUpdates.has(update.entryId))
      await Promise.all(
        updates.map((update) =>
          libraryRepository.updateFromSteam(update.entryId, {
            hoursPlayed: update.steamHours ?? undefined,
            ...(update.completeAll ? { hundredPercent: true, status: 'completed' as const } : {}),
          }),
        ),
      )
      return { created, updated: updates.length }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['library'] })
    },
  })

  if (save.isSuccess) {
    const { created, updated } = save.data
    return (
      <div className={styles.done}>
        <span className={styles.doneIcon} aria-hidden="true">
          <CheckIcon width={26} height={26} />
        </span>
        <h2 className={styles.doneTitle}>Importación terminada</h2>
        <p className={styles.doneText}>{summaryText(created, updated)}</p>
        <Link to="/library">
          <Button>Ver mi biblioteca</Button>
        </Link>
      </div>
    )
  }

  if (plan.newGames.length === 0 && plan.updates.length === 0) {
    return (
      <EmptyState
        title="Tu biblioteca ya está al día"
        description={
          plan.total === 0
            ? 'Tu cuenta de Steam no tiene juegos.'
            : 'Todos tus juegos de Steam ya están en tu biblioteca con sus horas.'
        }
        action={
          <Link to="/library">
            <Button variant="secondary">Ver mi biblioteca</Button>
          </Link>
        }
      />
    )
  }

  const toggle = (igdbId: number) =>
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(igdbId)) next.delete(igdbId)
      else next.add(igdbId)
      return next
    })

  const setAll = (checked: boolean) =>
    setSelected((current) => {
      const next = new Set(current)
      for (const game of visibleGames) {
        if (checked) next.add(game.igdbId)
        else next.delete(game.igdbId)
      }
      return next
    })

  const toggleUpdate = (entryId: string) =>
    setSelectedUpdates((current) => {
      const next = new Set(current)
      if (next.has(entryId)) next.delete(entryId)
      else next.add(entryId)
      return next
    })

  const totalSelected = selected.size + selectedUpdates.size

  return (
    <div className={styles.review}>
      <dl className={styles.summary}>
        <SummaryItem label="En tu cuenta de Steam" value={plan.total} />
        <SummaryItem label="Nuevos" value={plan.newGames.length} />
        <SummaryItem label="Para poner al día" value={plan.updates.length} />
        <SummaryItem label="Ya al día" value={plan.upToDate} />
      </dl>

      {plan.newGames.length > 0 && (
        <section className={styles.section} aria-labelledby="steam-new">
          <div>
            <h2 id="steam-new" className={styles.sectionTitle}>
              Juegos nuevos
            </h2>
            <p className={styles.sectionText}>
              Se añaden en PC con las horas de Steam. Los que tienen todos los logros entran como Completado y
              al 100%; el resto, según cuándo los jugaste. Puedes cambiar cualquier estado.
            </p>
          </div>

          <div className={styles.toolbar}>
            <div className={styles.search}>
              <SearchBar
                id="steam-import-search"
                label="Buscar entre los juegos nuevos"
                value={query}
                onChange={setQuery}
                placeholder="Buscar…"
              />
            </div>
            <div className={styles.toolbarActions}>
              <Button variant="ghost" size="sm" onClick={() => setAll(true)}>
                Marcar todos
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setAll(false)}>
                Desmarcar
              </Button>
            </div>
          </div>

          {visibleGames.length === 0 ? (
            <p className={styles.noResults}>Ningún juego coincide con “{query.trim()}”.</p>
          ) : (
            <ul className={styles.list}>
              {visibleGames.map((game) => (
                <NewGameRow
                  key={game.igdbId}
                  game={game}
                  igdbGame={gameById.get(game.igdbId)}
                  checked={selected.has(game.igdbId)}
                  status={statuses.get(game.igdbId) ?? game.status}
                  onToggle={() => toggle(game.igdbId)}
                  onStatusChange={(status) =>
                    setStatuses((current) => new Map(current).set(game.igdbId, status))
                  }
                />
              ))}
            </ul>
          )}
        </section>
      )}

      {plan.updates.length > 0 && (
        <section className={styles.section} aria-labelledby="steam-hours">
          <div>
            <h2 id="steam-hours" className={styles.sectionTitle}>
              Poner al día
            </h2>
            <p className={styles.sectionText}>
              Ya los tienes en PC, pero en Steam llevas más horas o has conseguido todos los logros.
            </p>
          </div>
          <ul className={styles.list}>
            {plan.updates.map((update) => (
              <UpdateRow
                key={update.entryId}
                update={update}
                checked={selectedUpdates.has(update.entryId)}
                onToggle={() => toggleUpdate(update.entryId)}
              />
            ))}
          </ul>
        </section>
      )}

      {plan.unmatched.length > 0 && (
        <details className={styles.unmatched}>
          <summary>
            {plan.unmatched.length} sin ficha en IGDB (no se pueden añadir)
          </summary>
          <p>
            Suelen ser herramientas, bandas sonoras, demos o servidores de prueba: {plan.unmatched.join(', ')}.
          </p>
        </details>
      )}

      <div className={styles.footer}>
        {save.isError && (
          <p className={styles.saveError} role="alert">
            {errorMessage(save.error)}
          </p>
        )}
        <div className={styles.footerBar}>
          <span className={styles.footerCount}>{selectionText(selected.size, selectedUpdates.size)}</span>
          <Button onClick={() => save.mutate()} disabled={totalSelected === 0 || save.isPending}>
            {save.isPending ? 'Guardando…' : 'Importar'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function SummaryItem({ label, value }: { label: string; value: number }) {
  return (
    <div className={styles.summaryItem}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

function NewGameRow({
  game,
  igdbGame,
  checked,
  status,
  onToggle,
  onStatusChange,
}: {
  game: NewGame
  igdbGame: Game | undefined
  checked: boolean
  status: GameStatus
  onToggle: () => void
  onStatusChange: (status: GameStatus) => void
}) {
  const title = igdbGame?.title ?? game.steamName
  const inputId = `steam-game-${game.igdbId}`

  return (
    <li className={checked ? `${styles.row} ${styles.rowChecked}` : styles.row}>
      <input id={inputId} type="checkbox" className={styles.check} checked={checked} onChange={onToggle} />
      <label htmlFor={inputId} className={styles.rowMain}>
        <CoverImage src={igdbGame?.coverUrl ?? null} title={title} className={styles.cover} />
        <span className={styles.rowText}>
          <span className={styles.rowTitle}>{title}</span>
          <span className={styles.rowMeta}>
            <span>{game.hours > 0 ? formatHours(game.hours) : 'Sin jugar'}</span>
            {game.achievements && (
              <>
                <span aria-hidden="true">·</span>
                <AchievementsBadge achievements={game.achievements} />
              </>
            )}
          </span>
        </span>
      </label>
      <select
        className={styles.status}
        value={status}
        onChange={(event) => onStatusChange(event.target.value as GameStatus)}
        aria-label={`Estado de ${title}`}
        disabled={!checked}
      >
        {GAME_STATUSES.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </li>
  )
}

function AchievementsBadge({ achievements }: { achievements: { unlocked: number; total: number } }) {
  const complete = hasAllAchievements(achievements)
  return (
    <span
      className={complete ? `${styles.achievements} ${styles.achievementsDone}` : styles.achievements}
      aria-label={`${achievements.unlocked} de ${achievements.total} logros`}
      title={`${achievements.unlocked} de ${achievements.total} logros`}
    >
      <TrophyIcon width={13} height={13} aria-hidden="true" />
      {achievements.unlocked}/{achievements.total}
    </span>
  )
}

function UpdateRow({ update, checked, onToggle }: { update: EntryUpdate; checked: boolean; onToggle: () => void }) {
  const inputId = `steam-update-${update.entryId}`

  return (
    <li className={checked ? `${styles.row} ${styles.rowChecked}` : styles.row}>
      <input id={inputId} type="checkbox" className={styles.check} checked={checked} onChange={onToggle} />
      <label htmlFor={inputId} className={styles.rowMain}>
        <span className={styles.rowText}>
          <span className={styles.rowTitle}>{update.steamName}</span>
          <span className={`${styles.rowMeta} ${styles.rowMetaStacked}`}>
            {update.steamHours !== null && (
              <span>
                {update.currentHours !== null ? formatHours(update.currentHours) : 'Sin horas'} →{' '}
                <strong>{formatHours(update.steamHours)}</strong>
              </span>
            )}
            {update.completeAll && (
              <span className={`${styles.achievements} ${styles.achievementsDone}`}>
                <CheckIcon width={12} height={12} strokeWidth={2.6} aria-hidden="true" />
                Todos los logros: Completado y al 100%
              </span>
            )}
          </span>
        </span>
      </label>
    </li>
  )
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`
}

function selectionText(games: number, updates: number): string {
  if (games === 0 && updates === 0) return 'Nada marcado'
  const parts = []
  if (games > 0) parts.push(plural(games, 'juego', 'juegos'))
  if (updates > 0) parts.push(plural(updates, 'actualización', 'actualizaciones'))
  return parts.join(' y ')
}

function summaryText(created: number, updated: number): string {
  const parts = []
  if (created > 0) parts.push(`${plural(created, 'juego añadido', 'juegos añadidos')} a tu biblioteca`)
  if (updated > 0) parts.push(`${plural(updated, 'juego', 'juegos')} con las horas al día`)
  return parts.length > 0 ? `${parts.join(' y ')}.` : 'No había nada nuevo que guardar.'
}
