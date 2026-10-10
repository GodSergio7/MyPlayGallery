import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { libraryRepository } from '@/data/repository'
import { errorMessage } from '@/data/errors'
import type { Platform } from '@/shared/types/domain'
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle'
import { PLATFORM_GROUPS } from '@/features/explore/catalog'
import { useEntriesByGame, useGame, useInvalidateLibrary } from '@/features/library/hooks/useLibrary'
import { formatDate } from '@/shared/lib/format'
import { Button, ButtonLink } from '@/shared/components/Button'
import { CoverImage } from '@/shared/components/CoverImage'
import { PlatformBadge, StatusBadge } from '@/shared/components/Badges'
import { EmptyState, ErrorState, LoadingState } from '@/shared/components/StateViews'
import { ArrowLeftIcon } from '@/shared/components/icons'
import { EntryFields } from '@/features/library/EntryForm'
import {
  createEmptyForm,
  formToInput,
  hasErrors,
  validateEntryForm,
  type EntryFormErrors,
  type EntryFormValues,
} from '@/features/library/entryFormValues'
import styles from './GameDetailPage.module.css'

/** Todas las plataformas del catálogo, para juegos de los que IGDB no indica ninguna (T-10). */
const ALL_PLATFORMS: Platform[] = PLATFORM_GROUPS.flatMap((group) =>
  group.options.map((option) => ({ id: option.value, name: option.label })),
)

/** Id de IGDB válido: entero positivo. /game/abc, /game/0 o /game/1.5 no lo son (T-11). */
function parseGameId(value: string | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) return null
  const id = Number(value)
  return Number.isSafeInteger(id) && id > 0 ? id : null
}

export function GameDetailPage() {
  const { gameId } = useParams()
  const gameIdNumber = parseGameId(gameId)

  if (gameIdNumber === null) {
    return <GameNotFound />
  }
  return <AddGame key={gameIdNumber} gameId={gameIdNumber} />
}

function AddGame({ gameId }: { gameId: number }) {
  const navigate = useNavigate()
  const invalidateLibrary = useInvalidateLibrary()

  const gameQuery = useGame(gameId)
  const entriesQuery = useEntriesByGame(gameId)

  const [values, setValues] = useState<EntryFormValues>(createEmptyForm)
  const [formErrors, setFormErrors] = useState<EntryFormErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const game = gameQuery.data ?? undefined
  const entries = entriesQuery.data ?? []
  const noPlatforms = game !== undefined && game.platforms.length === 0
  const platforms = noPlatforms ? ALL_PLATFORMS : (game?.platforms ?? [])

  useDocumentTitle(game ? `Añadir ${game.title}` : 'Añadir juego')

  const existingEntry = entries.find(
    (entry) => String(entry.platformId) === values.platformId,
  )

  function updateForm(patch: Partial<EntryFormValues>) {
    setValues((current) => ({ ...current, ...patch }))
    setFormErrors((current) => {
      const next = { ...current }
      for (const key of Object.keys(patch)) delete next[key as keyof EntryFormErrors]
      return next
    })
  }

  async function handleSubmit() {
    if (!game) {
      return
    }
    const errors = validateEntryForm(values)
    setFormErrors(errors)
    if (hasErrors(errors)) {
      return
    }

    setSubmitting(true)
    setSubmitError(null)
    try {
      const created = await libraryRepository.create({
        ...formToInput(values, platforms),
        externalId: gameId,
      })
      await invalidateLibrary()
      navigate(`/library/${created.id}`)
    } catch (error) {
      setSubmitError(errorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  if (gameQuery.isPending || entriesQuery.isPending) {
    return <LoadingState message="Cargando…" />
  }

  if (gameQuery.isError || entriesQuery.isError) {
    return (
      <ErrorState
        onRetry={() => {
          void gameQuery.refetch()
          void entriesQuery.refetch()
        }}
      />
    )
  }

  if (!game) {
    return <GameNotFound />
  }

  const canSubmit = !existingEntry && !submitting

  return (
    <>
      <BackLink />

      <div className={styles.layout}>
        <section className={styles.external} aria-labelledby="game-info-heading">
          <div className={styles.cover}>
            <CoverImage src={game.coverUrl} title={game.title} />
          </div>
          <div className={styles.externalInfo}>
            <h1 id="game-info-heading" className={styles.title}>
              {game.title}
            </h1>
            <dl className={styles.meta}>
              <div>
                <dt>Salida</dt>
                <dd>{formatDate(game.released)}</dd>
              </div>
              <div>
                <dt>Géneros</dt>
                <dd>{game.genres.join(', ')}</dd>
              </div>
            </dl>
            {!noPlatforms && (
              <div className={styles.platforms}>
                <h2 className={styles.subheading}>Plataformas</h2>
                <ul className={styles.platformList}>
                  {game.platforms.map((platform) => (
                    <li key={platform.id}>
                      <PlatformBadge name={platform.name} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>

        <section className={styles.personal} aria-labelledby="personal-heading">
          <h2 id="personal-heading" className={styles.subheading}>
            Añadir a tu biblioteca
          </h2>
          <p className={styles.help}>
            Si lo juegas en varias plataformas, puedes añadir una entrada por cada una.
          </p>

          {entries.length > 0 && (
            <div className={styles.existing}>
              <h3 className={styles.existingTitle}>Ya lo tienes en</h3>
              <ul className={styles.existingList}>
                {entries.map((entry) => (
                  <li key={entry.id}>
                    <Link to={`/library/${entry.id}`} className={styles.existingItem}>
                      <PlatformBadge name={entry.platformName} />
                      <StatusBadge status={entry.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {existingEntry && (
            <p className={styles.warning} role="status">
              Ya lo tienes en {existingEntry.platformName}.{' '}
              <Link to={`/library/${existingEntry.id}`}>Ver entrada</Link>
            </p>
          )}

          {noPlatforms && (
            <p className={styles.help} role="note">
              IGDB todavía no indica en qué plataformas sale este juego. Elige la tuya de la lista completa.
            </p>
          )}

          <EntryFields
            idPrefix="new-entry"
            values={values}
            platforms={platforms}
            onChange={updateForm}
            errors={formErrors}
          />

          {submitError && (
            <p className={styles.formError} role="alert">
              {submitError}
            </p>
          )}

          <div className={styles.actions}>
            <Button onClick={handleSubmit} disabled={!canSubmit}>
              {submitting ? 'Guardando…' : 'Añadir a mi biblioteca'}
            </Button>
          </div>
        </section>
      </div>
    </>
  )
}

function GameNotFound() {
  useDocumentTitle('Juego no encontrado')
  return (
    <>
      <BackLink />
      <EmptyState
        title="Juego no encontrado"
        description="El enlace no corresponde a ningún juego de IGDB."
        action={<ButtonLink to="/search">Buscar un juego</ButtonLink>}
      />
    </>
  )
}

/** Vuelve a la búsqueda de la que se vino (con lo que se había escrito), o a Añadir juego. */
function BackLink() {
  const location = useLocation()
  const from = (location.state as { from?: unknown } | null)?.from
  const to = typeof from === 'string' && from.startsWith('/search') ? from : '/search'

  return (
    <Link to={to} className={styles.back}>
      <ArrowLeftIcon width={18} height={18} />
      Volver a la búsqueda
    </Link>
  )
}
