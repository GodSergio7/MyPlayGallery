import type { ReactNode } from 'react'
import CountUp from './reactbits/CountUp'
import styles from './StatCard.module.css'

interface StatCardProps {
  label: string
  /** Los números se animan contando desde 0; los textos se muestran tal cual. */
  value: string | number
  /** Formato del número mientras se anima (p. ej. horas o nota media). */
  format?: (value: number) => string
  icon?: ReactNode
  hint?: string
}

export function StatCard({ label, value, format, icon, hint }: StatCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.label}>{label}</span>
        {icon && <span className={styles.icon}>{icon}</span>}
      </div>
      {typeof value === 'number' ? (
        <CountUp to={value} duration={1.2} format={format} className={styles.value} />
      ) : (
        <span className={styles.value}>{value}</span>
      )}
      {hint && <span className={styles.hint}>{hint}</span>}
    </div>
  )
}
