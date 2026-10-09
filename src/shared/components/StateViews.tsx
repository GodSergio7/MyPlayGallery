import type { ReactNode } from 'react'
import { Button } from './Button'
import styles from './StateViews.module.css'

interface EmptyStateProps {
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className={styles.state}>
      <h2 className={styles.title}>{title}</h2>
      {description && <p className={styles.description}>{description}</p>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  )
}

export function LoadingState({ message = 'Cargando…' }: { message?: string }) {
  return (
    <div className={styles.state} role="status" aria-live="polite">
      <span className={styles.spinner} aria-hidden="true" />
      <p className={styles.description}>{message}</p>
    </div>
  )
}

interface ErrorStateProps {
  title?: string
  description?: string
  onRetry?: () => void
}

export function ErrorState({ title = 'No se ha podido cargar', description, onRetry }: ErrorStateProps) {
  return (
    <div className={styles.state} role="alert">
      <h2 className={styles.title}>{title}</h2>
      {description && <p className={styles.description}>{description}</p>}
      {onRetry && (
        <div className={styles.action}>
          <Button variant="secondary" onClick={onRetry}>
            Reintentar
          </Button>
        </div>
      )}
    </div>
  )
}

export function SkeletonCard() {
  return <div className={styles.skeleton} aria-hidden="true" />
}

export function GridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className={styles.skeletonGrid} role="status" aria-label="Cargando">
      {Array.from({ length: count }, (_, index) => (
        <SkeletonCard key={index} />
      ))}
    </div>
  )
}
