import { Link } from 'react-router-dom'
import { useLibraryWithGames } from '@/features/library/hooks/useLibrary'
import { formatAverage, formatHours } from '@/shared/lib/format'
import { PageHeader } from '@/shared/components/PageHeader'
import { IgdbNotice } from '@/shared/components/IgdbNotice'
import { StatCard } from '@/shared/components/StatCard'
import { ButtonLink } from '@/shared/components/Button'
import { CoverImage } from '@/shared/components/CoverImage'
import { EmptyState, ErrorState, LoadingState } from '@/shared/components/StateViews'
import { libraryStats } from './libraryStats'
import { mostPlayed } from './mostPlayed'
import styles from './DashboardPage.module.css'
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle'

const TOP_GAMES = 3
// Escala fija de la barra de horas: de 0 a 1000 h (a partir de ahí, llena).
const BAR_MAX_HOURS = 1000

export function DashboardPage() {
  useDocumentTitle('Inicio')
  const libraryState = useLibraryWithGames()

  if (libraryState.isPending) {
    return <LoadingState message="Cargando tu biblioteca…" />
  }

  if (libraryState.isError) {
    return (
      <ErrorState
        onRetry={() => {
          void libraryState.refetch()
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
            <ButtonLink to="/search">Añadir un juego</ButtonLink>
          }
        />
      </>
    )
  }

  const gameById = new Map(games.map((game) => [game.externalId, game]))
  const { total, totalHours, averageScore, scoredCount, platinumCount, hundredCount, playingCount, statusCounts } =
    libraryStats(entries)

  const topGames = mostPlayed(entries, TOP_GAMES)

  return (
    <>
      <PageHeader title="Inicio" />
      {libraryState.data?.gamesUnavailable && <IgdbNotice onRetry={() => void libraryState.refetch()} />}

      <section className={styles.stats} aria-label="Resumen de la biblioteca">
        <StatCard
          label="Juegos"
          value={total}
          hint={playingCount > 0 ? `${playingCount} jugando ahora` : undefined}
          to="/library"
        />
        <StatCard label="Horas jugadas" value={totalHours} format={formatHours} to="/library?orden=hours" />
        <StatCard
          label="Nota media"
          value={averageScore ?? '—'}
          format={formatAverage}
          hint={scoredCount > 0 ? `de ${scoredCount} con nota` : undefined}
          to="/library?orden=score"
        />
        <StatCard label="Platinos" value={platinumCount} to="/library?logro=platino" />
        <StatCard label="Al 100%" value={hundredCount} to="/library?logro=completo" />
      </section>

      <div className={styles.columns}>
        <section className={styles.panel} aria-labelledby="distribution-heading">
          <h2 id="distribution-heading" className={styles.panelTitle}>
            Por estado
          </h2>
          <ul className={styles.distribution}>
            {statusCounts.map((status) => (
              <li key={status.value}>
                <Link to={`/library?estado=${status.value}`} className={styles.distributionRow}>
                  <span className={styles.distributionLabel}>{status.label}</span>
                  <span className={styles.bar} aria-hidden="true">
                    <span
                      className={styles.barFill}
                      data-status={status.value}
                      style={{ width: `${(status.count / total) * 100}%` }}
                    />
                  </span>
                  <span className={styles.distributionCount}>{status.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className={`${styles.panel} ${styles.topPanel}`} aria-labelledby="top-heading">
          <div className={styles.panelHeader}>
            <div>
              <h2 id="top-heading" className={styles.panelTitle}>
                Más jugados
              </h2>
              <p className={styles.panelSubtitle}>{formatHours(totalHours)} en total</p>
            </div>
            <Link to="/library?orden=hours" className={styles.panelLink}>
              Ver todos
            </Link>
          </div>
          {topGames.length === 0 ? (
            <p className={styles.panelEmpty}>Todavía no has apuntado horas en ningún juego.</p>
          ) : (
            <ol className={styles.top}>
              {topGames.map((item, index) => {
                const game = gameById.get(item.externalId)
                const title = game?.title ?? 'Juego desconocido'
                return (
                  <li key={item.externalId}>
                    <Link to={`/library/${item.entryId}`} className={styles.topItem}>
                      <span className={styles.topRank} aria-hidden="true">
                        {index + 1}
                      </span>
                      <CoverImage src={game?.coverUrl ?? null} title={title} className={styles.topCover} />
                      <span className={styles.topInfo}>
                        <span className={styles.topRow}>
                          <span className={styles.topTitle}>{title}</span>
                          <span className={styles.topHours}>{formatHours(item.hours)}</span>
                        </span>
                        <span className={styles.topMeta}>{item.platforms.join(' · ')}</span>
                        <span className={styles.topBar} aria-hidden="true">
                          <span
                            className={styles.topBarFill}
                            style={{ width: `${Math.min(item.hours / BAR_MAX_HOURS, 1) * 100}%` }}
                          />
                        </span>
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ol>
          )}
        </section>
      </div>
    </>
  )
}
