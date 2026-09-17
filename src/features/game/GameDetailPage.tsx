import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { gamesRepository, libraryRepository } from '@/data/repository'
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
  const { rawgId } = useParams()
  const rawgIdNumber = Number(rawgId)
  const navigate = useNavigate()

  const gameState = useAsync(() => gamesRepository.getById(rawgIdNumber), [rawgIdNumber])
  const entriesState = useAsync(
    () => libraryRepository.listByGame(rawgIdNumber),
    [rawgIdNumber],
  )

  const [values, setValues] = useState<EntryFormValues>(createEmptyForm)
  const [submitting, setSubmitting] = useState(false)

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
    try {
      const created = await libraryRepository.create({
        ...formToInput(values, game.platforms),
        rawgId: rawgIdNumber,
      })
      navigate(`/library/${created.id}`)
    } finally {
      setSubmitting(false)
    }
  }

  if (gameState.loading || entriesState.loading) {
    return <LoadingState message="Cargando la ficha del juego…" />
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
          description="Este juego no está disponible en los datos de RAWG."
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
            <span className={styles.externalTag}>Información de RAWG</span>
            <h1 id="game-info-heading" className={styles.title}>
              {game.title}
            </h1>
            <dl className={styles.meta}>
              <div>
                <dt>Fecha de lanzamiento</dt>
                <dd>{formatDate(game.released)}</dd>
              </div>
              <div>
                <dt>Géneros</dt>
                <dd>{game.genres.join(', ')}</dd>
              </div>
            </dl>
            <div>
              <h2 className={styles.subheading}>Plataformas disponibles</h2>
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
            Tu experiencia
          </h2>
          <p className={styles.help}>
            Un mismo juego puede tener varias experiencias, una por plataforma.
          </p>

          {entries.length > 0 && (
            <div className={styles.existing}>
              <h3 className={styles.existingTitle}>Experiencias registradas</h3>
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

          <h3 className={styles.existingTitle}>Añadir una experiencia</h3>

          {existingEntry && (
            <p className={styles.warning} role="status">
              Ya tienes una experiencia de {existingEntry.platformName}.{' '}
              <Link to={`/library/${existingEntry.id}`}>Edítala</Link> en lugar de crear otra.
            </p>
          )}

          <EntryFields
            idPrefix="new-entry"
            values={values}
            platforms={game.platforms}
            onChange={updateForm}
          />

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
