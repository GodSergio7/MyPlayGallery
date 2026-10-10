import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { gamesRepository, libraryRepository } from '@/data/repository'
import { errorMessage } from '@/data/errors'
import { useAsync } from '@/shared/hooks/useAsync'
import type { Game, LibraryEntry, Platform } from '@/shared/types/domain'
import { formatDate, formatHours } from '@/shared/lib/format'
import { Button } from '@/shared/components/Button'
import { CoverImage } from '@/shared/components/CoverImage'
import { PlatformBadge, Score, StatusBadge } from '@/shared/components/Badges'
import { Modal } from '@/shared/components/Modal'
import { EmptyState, ErrorState, LoadingState } from '@/shared/components/StateViews'
import { ArrowLeftIcon, EditIcon, TrashIcon } from '@/shared/components/icons'
import { EntryFields } from '@/features/library/EntryForm'
import {
  formFromEntry,
  formToInput,
  type EntryFormValues,
} from '@/features/library/entryFormValues'
import styles from './EntryDetailPage.module.css'

export function EntryDetailPage() {
  const { entryId } = useParams()
  // La key hace que al pasar a otra entrada (p. ej. "También lo tienes en") el componente se monte
  // de nuevo: el formulario, el modo edición y los avisos no se arrastran a la otra entrada.
  return <EntryDetail key={entryId ?? ''} id={entryId ?? ''} />
}

function EntryDetail({ id }: { id: string }) {
  const navigate = useNavigate()

  const entryState = useAsync(() => libraryRepository.getById(id), [id])
  const entry = entryState.data

  const gameState = useAsync(
    () => (entry ? gamesRepository.getById(entry.externalId) : Promise.resolve(undefined)),
    [entry?.externalId],
  )
  const siblingsState = useAsync(
    () => (entry ? libraryRepository.listByGame(entry.externalId) : Promise.resolve([])),
    [entry?.externalId],
  )

  const [editing, setEditing] = useState(false)
  const [values, setValues] = useState<EntryFormValues | null>(null)
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  // Si IGDB falla, la entrada se sigue viendo y editando ("Juego desconocido"): tus datos están en Supabase.
  const game = gameState.error ? undefined : gameState.data
  const gameUnavailable = Boolean(gameState.error)
  const siblings = (siblingsState.data ?? []).filter((item) => item.id !== id)

  function startEdit() {
    if (entry) {
      setValues(formFromEntry(entry))
      setEditing(true)
    }
  }

  function updateForm(patch: Partial<EntryFormValues>) {
    setValues((current) => (current ? { ...current, ...patch } : current))
  }

  async function handleSave() {
    if (!values || !entry) {
      return
    }

    setSaving(true)
    setActionError(null)
    try {
      await libraryRepository.update(id, {
        ...formToInput(values, platformOptions(entry, game)),
        externalId: entry.externalId,
      })
      setEditing(false)
      entryState.reload()
    } catch (error) {
      setActionError(errorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setActionError(null)
    try {
      await libraryRepository.remove(id)
      navigate('/library')
    } catch (error) {
      setConfirmOpen(false)
      setActionError(errorMessage(error))
    }
  }

  if (entryState.loading || gameState.loading || siblingsState.loading) {
    return <LoadingState message="Cargando…" />
  }

  if (entryState.error || siblingsState.error) {
    return (
      <ErrorState
        onRetry={() => {
          entryState.reload()
          gameState.reload()
          siblingsState.reload()
        }}
      />
    )
  }

  if (!entry) {
    return (
      <>
        <BackLink />
        <EmptyState
          title="Esta entrada no existe"
        />
      </>
    )
  }

  const title = game?.title ?? 'Juego desconocido'

  return (
    <>
      <BackLink />

      <div className={styles.layout}>
        <header className={styles.header}>
          <div className={styles.cover}>
            <CoverImage src={game?.coverUrl ?? null} title={title} />
          </div>
          <div className={styles.headerInfo}>
            <h1 className={styles.title}>{title}</h1>
            <div className={styles.badges}>
              <PlatformBadge name={entry.platformName} />
              <StatusBadge status={entry.status} />
            </div>
            {!editing && (
              <div className={styles.actions}>
                <Button variant="secondary" size="sm" onClick={startEdit}>
                  <EditIcon width={16} height={16} />
                  Editar
                </Button>
                <Button variant="danger" size="sm" onClick={() => setConfirmOpen(true)}>
                  <TrashIcon width={16} height={16} />
                  Eliminar
                </Button>
              </div>
            )}
          </div>
        </header>

        {gameUnavailable && (
          <p className={styles.notice} role="status">
            No se ha podido cargar la información del juego desde IGDB. Tus datos están a salvo y puedes
            editarlos; el título y la portada volverán cuando IGDB responda.{' '}
            <button type="button" className={styles.noticeAction} onClick={() => gameState.reload()}>
              Reintentar
            </button>
          </p>
        )}

        {editing && values ? (
          <section className={styles.panel} aria-label="Editar">
            <h2 className={styles.panelTitle}>Editar</h2>
            <EntryFields
              idPrefix="edit-entry"
              values={values}
              platforms={platformOptions(entry, game)}
              onChange={updateForm}
            />
            {actionError && (
              <p className={styles.formError} role="alert">
                {actionError}
              </p>
            )}
            <div className={styles.formActions}>
              <Button
                variant="ghost"
                onClick={() => setEditing(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar cambios'}
              </Button>
            </div>
          </section>
        ) : (
          <section className={styles.panel} aria-label="Resumen">
            {actionError && (
              <p className={styles.formError} role="alert">
                {actionError}
              </p>
            )}
            <dl className={styles.details}>
              <div className={styles.detailItem}>
                <dt>Puntuación</dt>
                <dd>
                  <Score value={entry.score} />
                </dd>
              </div>
              <div className={styles.detailItem}>
                <dt>Horas jugadas</dt>
                <dd>{formatHours(entry.hoursPlayed)}</dd>
              </div>
              <div className={styles.detailItem}>
                <dt>Platino</dt>
                <dd>{entry.platinum ? 'Sí' : 'No'}</dd>
              </div>
              <div className={styles.detailItem}>
                <dt>100%</dt>
                <dd>{entry.hundredPercent ? 'Sí' : 'No'}</dd>
              </div>
              <div className={styles.detailItem}>
                <dt>Fecha de inicio</dt>
                <dd>{formatDate(entry.startedOn)}</dd>
              </div>
              <div className={styles.detailItem}>
                <dt>Fecha de finalización</dt>
                <dd>{formatDate(entry.finishedOn)}</dd>
              </div>
            </dl>

            <div className={styles.block}>
              <h2 className={styles.blockTitle}>Reseña</h2>
              <p className={styles.blockText}>{entry.review ?? 'Sin reseña.'}</p>
            </div>

            <div className={styles.block}>
              <h2 className={styles.blockTitle}>Notas</h2>
              <p className={styles.blockText}>{entry.notes ?? 'Sin notas.'}</p>
            </div>
          </section>
        )}

        {siblings.length > 0 && (
          <section className={styles.panel} aria-labelledby="siblings-heading">
            <h2 id="siblings-heading" className={styles.panelTitle}>
              También lo tienes en
            </h2>
            <ul className={styles.siblings}>
              {siblings.map((sibling) => (
                <li key={sibling.id}>
                  <Link to={`/library/${sibling.id}`} className={styles.siblingItem}>
                    <PlatformBadge name={sibling.platformName} />
                    <StatusBadge status={sibling.status} />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <Modal
        open={confirmOpen}
        title="Quitar de la biblioteca"
        onClose={() => setConfirmOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Eliminar
            </Button>
          </>
        }
      >
        <p>
          ¿Quitar {title} ({entry.platformName}) de tu biblioteca? No se puede
          deshacer.
        </p>
      </Modal>
    </>
  )
}

/**
 * Plataformas del desplegable: las del juego en IGDB más la de la propia entrada, por si IGDB
 * no responde o ya no la incluye (así nunca se pierde la plataforma guardada).
 */
function platformOptions(entry: LibraryEntry, game: Game | null | undefined): Platform[] {
  const platforms = game?.platforms ?? []
  if (platforms.some((platform) => platform.id === entry.platformId)) {
    return platforms
  }
  return [{ id: entry.platformId, name: entry.platformName }, ...platforms]
}

function BackLink() {
  return (
    <Link to="/library" className={styles.back}>
      <ArrowLeftIcon width={18} height={18} />
      Volver a la biblioteca
    </Link>
  )
}
