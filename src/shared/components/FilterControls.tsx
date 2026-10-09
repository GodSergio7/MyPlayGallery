import type { ReactNode } from 'react'
import type { ViewMode } from '@/shared/hooks/useViewMode'
import { ChevronDownIcon, GridIcon, ListIcon } from './icons'
import styles from './FilterControls.module.css'

// Piezas comunes de los filtros de Biblioteca y Explorar: fila de pastillas,
// desplegable con forma de pastilla y selector de vista (cuadrícula / lista).

/** Fila de pastillas: en móvil se desplaza en horizontal; en pantallas anchas, salta de línea. */
export function FilterRow({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <div className={styles.row} role={label ? 'group' : undefined} aria-label={label}>
      {children}
    </div>
  )
}

/** Desplegable con aspecto de pastilla: "Plataforma: Todas ▾". Se resalta cuando no está en su valor por defecto. */
export function PillSelect({
  id,
  label,
  value,
  active,
  onChange,
  children,
}: {
  id: string
  label: string
  value: string
  active: boolean
  onChange: (value: string) => void
  children: ReactNode
}) {
  return (
    <div className={active ? `${styles.pill} ${styles.pillActive}` : styles.pill}>
      <label htmlFor={id} className={styles.pillLabel}>
        {label}:
      </label>
      <select id={id} className={styles.pillSelect} value={value} onChange={(event) => onChange(event.target.value)}>
        {children}
      </select>
      <ChevronDownIcon className={styles.pillChevron} width={14} height={14} aria-hidden="true" />
    </div>
  )
}

/** Enlace de texto para quitar todos los filtros (va junto al recuento, siempre a la vista). */
export function ClearFiltersButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className={styles.clear} onClick={onClick}>
      Limpiar filtros
    </button>
  )
}

export function ViewToggle({ view, onChange }: { view: ViewMode; onChange: (view: ViewMode) => void }) {
  return (
    <div className={styles.viewToggle} role="group" aria-label="Vista">
      <button
        type="button"
        className={styles.viewButton}
        aria-pressed={view === 'grid'}
        aria-label="Ver en cuadrícula"
        title="Cuadrícula"
        onClick={() => onChange('grid')}
      >
        <GridIcon width={18} height={18} />
      </button>
      <button
        type="button"
        className={styles.viewButton}
        aria-pressed={view === 'list'}
        aria-label="Ver en lista"
        title="Lista"
        onClick={() => onChange('list')}
      >
        <ListIcon width={18} height={18} />
      </button>
    </div>
  )
}
