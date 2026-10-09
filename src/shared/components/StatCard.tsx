import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import SpotlightCard from './reactbits/SpotlightCard'
import { ArrowUpRightIcon } from './icons'
import styles from './StatCard.module.css'

interface StatCardProps {
  label: string
  value: string | number
  /** Formato del número (p. ej. horas o nota media). */
  format?: (value: number) => string
  icon?: ReactNode
  hint?: string
  /** Si se indica, la tarjeta es un enlace a esa ruta. */
  to?: string
}

export function StatCard({ label, value, format, icon, hint, to }: StatCardProps) {
  const shown = typeof value === 'number' && format ? format(value) : value

  const content = (
    <>
      <div className={styles.header}>
        <span className={styles.label}>{label}</span>
        {to ? (
          <ArrowUpRightIcon className={styles.arrow} width={16} height={16} aria-hidden="true" />
        ) : (
          icon && <span className={styles.icon}>{icon}</span>
        )}
      </div>
      <span className={styles.value}>{shown}</span>
      {hint && <span className={styles.hint}>{hint}</span>}
    </>
  )

  if (!to) {
    return <div className={styles.card}>{content}</div>
  }

  return (
    <Link to={to} className={styles.link}>
      <SpotlightCard
        className={`${styles.card} ${styles.clickable}`}
        spotlightColor="#ffffff"
        intensity={0.07}
        spotlightSize={220}
        borderGlow={0.35}
        proximity={0}
        flare={false}
      >
        {content}
      </SpotlightCard>
    </Link>
  )
}
