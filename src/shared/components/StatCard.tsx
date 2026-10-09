import type { ReactNode } from 'react'
import styles from './StatCard.module.css'

interface StatCardProps {
  label: string
  value: string | number
  /** Formato del número (p. ej. horas o nota media). */
  format?: (value: number) => string
  icon?: ReactNode
  hint?: string
}

export function StatCard({ label, value, format, icon, hint }: StatCardProps) {
  const shown = typeof value === 'number' && format ? format(value) : value

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.label}>{label}</span>
        {icon && <span className={styles.icon}>{icon}</span>}
      </div>
      <span className={styles.value}>{shown}</span>
      {hint && <span className={styles.hint}>{hint}</span>}
    </div>
  )
}
