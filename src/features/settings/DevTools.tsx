import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { errorMessage } from '@/data/errors'
import { deleteAllEntries } from '@/data/supabase/libraryRepository'
import { Button } from '@/shared/components/Button'
import { Modal } from '@/shared/components/Modal'
import styles from './SettingsPage.module.css'

// Zona de pruebas: SOLO en desarrollo (npm run dev). SettingsPage la monta tras comprobar
// import.meta.env.DEV, así que en la build de producción este código no se incluye.

export function DevTools() {
  const queryClient = useQueryClient()
  const [confirmOpen, setConfirmOpen] = useState(false)

  const wipe = useMutation({
    mutationFn: deleteAllEntries,
    onSuccess: () => {
      setConfirmOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['library'] })
    },
  })

  return (
    <section className={`${styles.section} ${styles.devSection}`} aria-labelledby="ajustes-pruebas">
      <div className={styles.sectionIntro}>
        <h2 id="ajustes-pruebas" className={styles.sectionTitle}>
          Zona de pruebas
        </h2>
        <p className={styles.sectionText}>Solo aparece en el servidor local. No existe en la web publicada.</p>
      </div>
      <div className={`${styles.card} ${styles.devCard}`}>
        <div className={styles.row}>
          <div className={styles.rowText}>
            <span className={styles.rowTitle}>Vaciar mi biblioteca</span>
            <span className={styles.rowHint}>
              Borra todos tus juegos para repetir la importación de Steam desde cero.
            </span>
          </div>
          <Button variant="danger" size="sm" onClick={() => setConfirmOpen(true)}>
            Borrar todo
          </Button>
        </div>
        {wipe.isSuccess && (
          <p className={`${styles.notice} ${styles.info}`} role="status">
            {wipe.data === 1 ? 'Se ha borrado 1 juego.' : `Se han borrado ${wipe.data} juegos.`}
          </p>
        )}
        {wipe.isError && (
          <p className={`${styles.notice} ${styles.error}`} role="alert">
            {errorMessage(wipe.error)}
          </p>
        )}
      </div>

      <Modal
        open={confirmOpen}
        title="Vaciar la biblioteca"
        onClose={() => setConfirmOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)} disabled={wipe.isPending}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={() => wipe.mutate()} disabled={wipe.isPending}>
              {wipe.isPending ? 'Borrando…' : 'Borrar todos los juegos'}
            </Button>
          </>
        }
      >
        <p>Se borrarán todos los juegos de tu biblioteca, con sus notas y reseñas. No se puede deshacer.</p>
      </Modal>
    </section>
  )
}
