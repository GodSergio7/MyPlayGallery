import styles from './IgdbNotice.module.css'

/** Aviso cuando IGDB no responde y la biblioteca se muestra sin títulos ni portadas. */
export function IgdbNotice({ onRetry }: { onRetry: () => void }) {
  return (
    <p className={styles.notice} role="status">
      No se han podido cargar los títulos y las portadas desde IGDB. Tus datos están a salvo.{' '}
      <button type="button" className={styles.action} onClick={onRetry}>
        Reintentar
      </button>
    </p>
  )
}
