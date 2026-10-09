import { Link } from 'react-router-dom'
import { GAME_STATUSES } from '@/shared/types/domain'
import { loadLibraryWithGames } from '@/data/repository'
import { useAsync } from '@/shared/hooks/useAsync'
import { formatAverage, formatDate, formatHours } from '@/shared/lib/format'
import { PageHeader } from '@/shared/components/PageHeader'
import { StatCard } from '@/shared/components/StatCard'
import { Button } from '@/shared/components/Button'
import { StatusBadge } from '@/shared/components/Badges'
import { EmptyState, ErrorState, LoadingState } from '@/shared/components/StateViews'
import styles from './DashboardPage.module.css'

export function DashboardPage() {
  const libraryState = useAsync(loadLibraryWithGames, [])

  if (libraryState.loading) {
    return <LoadingState message="Cargando tu biblioteca…" />
  }

  if (libraryState.error) {
    return (
      <ErrorState
        onRetry={() => {
          libraryState.reload()
        }}
      />
    )
  }

  const entries = libraryState.data?.entries ?? []
  const games = libraryState.data?.games ?? []

  if (entries.length === 0) {
    return (
      <>
        <PageHeader title="Inicio" />
        <EmptyState
          title="Todavía no has añadido ningún juego"
          action={
            <Link to="/search">
              <Button>Añadir un juego</Button>
            </Link>
          }
        />
      </>
    )
  }

  const gameById = new Map(games.map((game) => [game.externalId, game]))
  const total = entries.length
  const totalHours = entries.reduce((sum, entry) => sum + (entry.hoursPlayed ?? 0), 0)
  const scored = entries.filter((entry) => entry.score !== null)
  const averageScore =
    scored.length > 0
      ? scored.reduce((sum, entry) => sum + (entry.score ?? 0), 0) / scored.length
      : null
  const platinumCount = entries.filter((entry) => entry.platinum).length
  const hundredCount = entries.filter((entry) => entry.hundredPercent).length

  const statusCounts = GAME_STATUSES.map((status) => ({
    ...status,
    count: entries.filter((entry) => entry.status === status.value).length,
  }))

  const recent = [...entries]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 5)

  return (
    <>
      <PageHeader title="Inicio" />

      <section className={styles.stats} aria-label="Resumen de la biblioteca">
        <StatCard label="Juegos" value={total} />
        <StatCard label="Horas jugadas" value={totalHours} format={formatHours} />
        <StatCard
          label="Nota media"
          value={averageScore ?? '—'}
          format={formatAverage}
          hint={scored.length > 0 ? `de ${scored.length} con nota` : undefined}
        />
        <StatCard label="Platinos" value={platinumCount} />
        <StatCard label="Al 100%" value={hundredCount} />
      </section>

      <div className={styles.columns}>
        <section className={styles.panel} aria-labelledby="distribution-heading">
          <h2 id="distribution-heading" className={styles.panelTitle}>
            Por estado
          </h2>
          <ul className={styles.distribution}>
            {statusCounts.map((status) => (
              <li key={status.value} className={styles.distributionRow}>
                <span className={styles.distributionLabel}>{status.label}</span>
                <span className={styles.bar} aria-hidden="true">
                  <span
                    className={styles.barFill}
                    data-status={status.value}
                    style={{ width: `${(status.count / total) * 100}%` }}
                  />
                </span>
                <span className={styles.distributionCount}>{status.count}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.panel} aria-labelledby="recent-heading">
          <h2 id="recent-heading" className={styles.panelTitle}>
            Últimos cambios
          </h2>
          <ul className={styles.recent}>
            {recent.map((entry) => {
              const game = gameById.get(entry.externalId)
              return (
                <li key={entry.id}>
                  <Link to={`/library/${entry.id}`} className={styles.recentItem}>
                    <span className={styles.recentInfo}>
                      <span className={styles.recentTitle}>
                        {game?.title ?? 'Juego desconocido'}
                      </span>
                      <span className={styles.recentMeta}>{entry.platformName}</span>
                    </span>
                    <span className={styles.recentRight}>
                      <StatusBadge status={entry.status} />
                      <span className={styles.recentDate}>{formatDate(entry.updatedAt)}</span>
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      </div>
    </>
  )
}
