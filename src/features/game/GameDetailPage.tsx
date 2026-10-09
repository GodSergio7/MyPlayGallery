import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { gamesRepository, libraryRepository } from '@/data/repository'
import { errorMessage } from '@/data/errors'
import { useAsync } from '@/shared/hooks/useAsync'
import { formatDate } from '@/shared/lib/format'
import { Button } from '@/shared/components/Button'
import { CoverImage } from '@/shared/components/CoverImage'
import { PlatformBadge, StatusBadge } from '@/shared/components/Badges'
import { EmptyState, ErrorState, LoadingState } from '@/shared/components/StateViews'
import { ArrowLeftIcon } from '@/shared/components/icons'
import { EntryFields } from '@/features/library/EntryForm'
import {
  createEmptyForm,
  formToInput,
  type EntryFormValues,
} from '@/features/library/entryFormValues'
import styles from './GameDetailPage.module.css'

export function GameDetailPage() {
  const { gameId } = useParams()
  const gameIdNumber = Number(gameId)
  const navigate = useNavigate()

  const gameState = useAsync(() => gamesRepository.getById(gameIdNumber), [gameIdNumber])
  const entriesState = useAsync(
    () => libraryRepository.listByGame(gameIdNumber),
    [gameIdNumber],
  )

  const [values, setValues] = useState<EntryFormValues>(createEmptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const game = gameState.data
  const entries = entriesState.data ?? []

  const existingEntry = entries.find(
    (entry) => String(entry.platformId) === values.platformId,
  )

  function updateForm(patch: Partial<EntryFormValues>) {
    setValues((current) => ({ ...current, ...patch }))
  }

  async function handleSubmit() {
    if (!game) {
      return
    }

    setSubmitting(true)
    setSubmitError(null)
    try {
      const created = await libraryRepository.create({
        ...formToInput(values, game.platforms),
        externalId: gameIdNumber,
      })
      navigate(`/library/${created.id}`)
    } catch (error) {
      setSubmitError(errorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  if (gameState.loading || entriesState.loading) {
    return <LoadingState message="Cargando…" />
  }

  if (gameState.error || entriesState.error) {
    return (
      <ErrorState
        onRetry={() => {
          gameState.reload()
          entriesState.reload()
        }}
      />
    )
  }

  if (!game) {
    return (
      <>
        <BackLink />
        <EmptyState
          title="Juego no encontrado"
          description="IGDB no tiene este juego."
        />
      </>
    )
  }

  const canSubmit = values.platformId !== '' && !existingEntry && !submitting

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
            <div>
              <h2 className={styles.subheading}>Plataformas</h2>
              <ul className={styles.platformList}>
                {game.platforms.map((platform) => (
                  <li key={platform.id}>
                    <PlatformBadge name={platform.name} />
                  </li>
                ))}
              </ul>
            </div>
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

          <EntryFields
            idPrefix="new-entry"
            values={values}
            platforms={game.platforms}
            onChange={updateForm}
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

function BackLink() {
  return (
    <Link to="/search" className={styles.back}>
      <ArrowLeftIcon width={18} height={18} />
      Volver a la búsqueda
    </Link>
  )
}
