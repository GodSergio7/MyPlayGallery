import type { ReactNode } from 'react'
import { AlertIcon, GamepadIcon } from './icons'
import styles from './StateViews.module.css'

interface EmptyStateProps {
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className={styles.state}>
      <span className={styles.icon}>
        <GamepadIcon width={28} height={28} />
      </span>
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

export function ErrorState({
  title = 'No se ha podido cargar la información',
  description = 'Ha ocurrido un error inesperado. Inténtalo de nuevo.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className={styles.state} role="alert">
      <span className={[styles.icon, styles.iconError].join(' ')}>
        <AlertIcon width={28} height={28} />
      </span>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.description}>{description}</p>
      {onRetry && (
        <div className={styles.action}>
          <button type="button" className={styles.retry} onClick={onRetry}>
            Reintentar
          </button>
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
    <div className={styles.skeletonGrid} role="status" aria-label="Cargando contenido">
      {Array.from({ length: count }, (_, index) => (
        <SkeletonCard key={index} />
      ))}
    </div>
  )
}
