import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { gamesRepository, libraryRepository } from '@/data/repository'
import { useAsync } from '@/shared/hooks/useAsync'
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
  const id = entryId ?? ''
  const navigate = useNavigate()

  const entryState = useAsync(() => libraryRepository.getById(id), [id])
  const entry = entryState.data

  const gameState = useAsync(
    () => (entry ? gamesRepository.getById(entry.rawgId) : Promise.resolve(undefined)),
    [entry?.rawgId],
  )
  const siblingsState = useAsync(
    () => (entry ? libraryRepository.listByGame(entry.rawgId) : Promise.resolve([])),
    [entry?.rawgId],
  )

  const [editing, setEditing] = useState(false)
  const [values, setValues] = useState<EntryFormValues | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const game = gameState.data
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
    if (!values || !game || !entry) {
      return
    }

    setSaving(true)
    try {
      await libraryRepository.update(id, {
        ...formToInput(values, game.platforms),
        rawgId: entry.rawgId,
      })
      setEditing(false)
      entryState.reload()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    await libraryRepository.remove(id)
    navigate('/library')
  }

  if (entryState.loading || gameState.loading || siblingsState.loading) {
    return <LoadingState message="Cargando la experiencia…" />
  }

  if (entryState.error || gameState.error || siblingsState.error) {
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
          title="Experiencia no encontrada"
          description="Esta entrada ya no existe en tu biblioteca."
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

        {editing && values ? (
          <section className={styles.panel} aria-label="Editar experiencia">
            <h2 className={styles.panelTitle}>Editar experiencia</h2>
            <EntryFields
              idPrefix="edit-entry"
              values={values}
              platforms={game?.platforms ?? []}
              onChange={updateForm}
            />
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
          <section className={styles.panel} aria-label="Resumen de la experiencia">
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
              <h2 className={styles.blockTitle}>Reseña personal</h2>
              <p className={styles.blockText}>{entry.review ?? 'Sin reseña.'}</p>
            </div>

            <div className={styles.block}>
              <h2 className={styles.blockTitle}>Notas personales</h2>
              <p className={styles.blockText}>{entry.notes ?? 'Sin notas.'}</p>
            </div>
          </section>
        )}

        {siblings.length > 0 && (
          <section className={styles.panel} aria-labelledby="siblings-heading">
            <h2 id="siblings-heading" className={styles.panelTitle}>
              Otras experiencias de este juego
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
        title="Eliminar experiencia"
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
          ¿Seguro que quieres eliminar tu experiencia de {title} en {entry.platformName}? Esta
          acción no se puede deshacer.
        </p>
      </Modal>
    </>
  )
}

function BackLink() {
  return (
    <Link to="/library" className={styles.back}>
      <ArrowLeftIcon width={18} height={18} />
      Volver a la biblioteca
    </Link>
  )
}
