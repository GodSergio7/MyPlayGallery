import { useEffect, useState, type ReactNode } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import type { GameDetails, GameScore } from '@/shared/types/domain'
import { formatDate } from '@/shared/lib/format'
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle'
import { CoverImage } from '@/shared/components/CoverImage'
import { PlatformBadge } from '@/shared/components/Badges'
import { ButtonLink } from '@/shared/components/Button'
import { EmptyState, ErrorState, LoadingState } from '@/shared/components/StateViews'
import { ArrowLeftIcon, ArrowUpRightIcon, StarIcon } from '@/shared/components/icons'
import { useLibraryGameIds } from '@/features/explore/hooks/useGameBrowse'
import { useGameDetails } from './hooks/useGameDetails'
import { TrailerPlayer } from './components/TrailerPlayer'
import { ScreenshotGallery } from './components/ScreenshotGallery'
import {
  translateGameModes,
  translateGenres,
  translatePerspectives,
  translateThemes,
  usefulWebsites,
} from './labels'
import styles from './GameInfoPage.module.css'

const numberFormat = new Intl.NumberFormat('es-ES')

/** Ficha informativa de un juego del catálogo (solo lectura; desde aquí no se añade a la biblioteca). */
export function GameInfoPage() {
  const { gameId } = useParams()
  const id = Number(gameId)
  const location = useLocation()
  const { game, isLoading, isError, notFound, refetch } = useGameDetails(id)
  const libraryIds = useLibraryGameIds()

  // Vuelve a Explorar con los mismos filtros con los que se llegó.
  const from = (location.state as { from?: unknown } | null)?.from
  const backTo = typeof from === 'string' && from.startsWith('/explore') ? from : '/explore'

  // Al pasar de un juego a otro (juegos similares), empezar arriba.
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [id])

  useDocumentTitle(game?.title ?? 'Explorar')

  const back = (
    <Link to={backTo} className={styles.back}>
      <ArrowLeftIcon width={18} height={18} />
      Volver a Explorar
    </Link>
  )

  if (isLoading) {
    return (
      <>
        {back}
        <LoadingState message="Cargando…" />
      </>
    )
  }

  if (isError) {
    return (
      <>
        {back}
        <ErrorState onRetry={refetch} />
      </>
    )
  }

  if (notFound || !game) {
    return (
      <>
        {back}
        <EmptyState
          title="Juego no encontrado"
          description="IGDB no tiene este juego."
          action={
            <ButtonLink to="/explore">Ir a Explorar</ButtonLink>
          }
        />
      </>
    )
  }

  return (
    <>
      {back}
      <Hero game={game} inLibrary={libraryIds.has(game.externalId)} />

      <div className={styles.layout}>
        <div className={styles.main}>
          {(game.summary || game.storyline) && (
            <Section title="Descripción" note="En inglés" boxed>
              {game.summary && <p className={styles.text}>{game.summary}</p>}
              {game.storyline && (
                <>
                  <h3 className={styles.subheading}>Historia</h3>
                  <ExpandableText text={game.storyline} />
                </>
              )}
            </Section>
          )}

          {game.videos.length > 0 && (
            <Section title="Tráileres">
              <TrailerPlayer videos={game.videos} title={game.title} />
            </Section>
          )}

          {game.screenshots.length > 0 && (
            <Section title="Capturas">
              <ScreenshotGallery screenshots={game.screenshots} title={game.title} />
            </Section>
          )}
        </div>

        <aside className={styles.side}>
          <Facts game={game} />
          <TimeToBeat game={game} />
          <Releases game={game} />
          <Links game={game} />
        </aside>
      </div>

      {game.similarGames.length > 0 && (
        <Section title="Juegos similares">
          <ul className={styles.similar}>
            {game.similarGames.map((similar) => (
              <li key={similar.externalId}>
                <Link to={`/explore/${similar.externalId}`} state={{ from: backTo }} className={styles.similarCard}>
                  <CoverImage src={similar.coverUrl} title={similar.title} />
                  <span className={styles.similarTitle}>{similar.title}</span>
                  <span className={styles.similarMeta}>
                    {similar.released ? similar.released.slice(0, 4) : '—'}
                    {similar.rating !== null && (
                      <span className={styles.similarRating}>
                        <StarIcon width={12} height={12} aria-hidden="true" />
                        {similar.rating}
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <p className={styles.attribution}>
        Datos e imágenes de{' '}
        <a href="https://www.igdb.com" target="_blank" rel="noreferrer">
          IGDB
        </a>
        .
      </p>
    </>
  )
}

// ---------------------------------------------------------------- Cabecera

function Hero({ game, inLibrary }: { game: GameDetails; inLibrary: boolean }) {
  const genres = translateGenres(game.genres)
  const studio = game.developers[0]

  return (
    <header className={styles.hero}>
      {game.heroImageUrl && (
        <img src={game.heroImageUrl} alt="" className={styles.heroImage} aria-hidden="true" />
      )}
      <div className={styles.heroShade} aria-hidden="true" />

      <div className={styles.heroContent}>
        <CoverImage src={game.coverUrl} title={game.title} className={styles.cover} />

        <div className={styles.heroInfo}>
          <h1 className={styles.title}>{game.title}</h1>
          <p className={styles.subtitle}>
            {[game.released ? formatDate(game.released) : 'Fecha por confirmar', studio].filter(Boolean).join(' · ')}
          </p>

          {(genres.length > 0 || inLibrary || game.pegi) && (
            <ul className={styles.tags}>
              {inLibrary && <li className={`${styles.tag} ${styles.tagLibrary}`}>En tu biblioteca</li>}
              {game.pegi && <li className={`${styles.tag} ${styles.tagPegi}`}>PEGI {game.pegi}</li>}
              {genres.map((genre) => (
                <li key={genre} className={styles.tag}>
                  {genre}
                </li>
              ))}
            </ul>
          )}

          {game.scores.total || game.scores.critics || game.scores.users ? (
            <div className={styles.scores}>
              <ScoreBlock label="Nota IGDB" score={game.scores.total} units={['valoración', 'valoraciones']} main />
              <ScoreBlock label="Crítica" score={game.scores.critics} units={['reseña', 'reseñas']} />
              <ScoreBlock label="Usuarios" score={game.scores.users} units={['voto', 'votos']} />
            </div>
          ) : (
            <p className={styles.noScores}>Sin notas todavía.</p>
          )}

          {game.platforms.length > 0 && (
            <ul className={styles.platforms} aria-label="Plataformas">
              {game.platforms.map((platform) => (
                <li key={platform.id}>
                  <PlatformBadge name={platform.name} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </header>
  )
}

function scoreTone(value: number): string {
  if (value >= 75) return styles.scoreHigh
  if (value >= 50) return styles.scoreMid
  return styles.scoreLow
}

interface ScoreBlockProps {
  label: string
  score: GameScore | null
  /** Unidad en singular y plural (valoración / valoraciones). */
  units: [string, string]
  main?: boolean
}

function ScoreBlock({ label, score, units, main = false }: ScoreBlockProps) {
  return (
    <div className={main ? `${styles.score} ${styles.scoreMain}` : styles.score}>
      <span className={styles.scoreLabel}>{label}</span>
      {score ? (
        <>
          <span className={`${styles.scoreValue} ${scoreTone(score.value)}`}>{score.value}</span>
          <span className={styles.scoreCount}>
            {numberFormat.format(score.count)} {score.count === 1 ? units[0] : units[1]}
          </span>
        </>
      ) : (
        <>
          <span className={styles.scoreValue}>—</span>
          <span className={styles.scoreCount}>Sin nota</span>
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------- Bloques

function Section({
  title,
  note,
  boxed = false,
  children,
}: {
  title: string
  note?: string
  /** Sobre una tarjeta, para textos largos que deben leerse bien sobre el fondo animado. */
  boxed?: boolean
  children: ReactNode
}) {
  return (
    <section className={boxed ? `${styles.section} ${styles.card}` : styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>{title}</h2>
        {note && <span className={styles.sectionNote}>{note}</span>}
      </div>
      {children}
    </section>
  )
}

const EXPANDABLE_LIMIT = 420

function ExpandableText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false)
  const long = text.length > EXPANDABLE_LIMIT

  return (
    <>
      <p className={styles.text}>
        {long && !expanded ? `${text.slice(0, EXPANDABLE_LIMIT).trimEnd()}…` : text}
      </p>
      {long && (
        <button type="button" className={styles.more} onClick={() => setExpanded((value) => !value)}>
          {expanded ? 'Leer menos' : 'Leer más'}
        </button>
      )}
    </>
  )
}

function Facts({ game }: { game: GameDetails }) {
  const rows: Array<[string, string[]]> = [
    ['Desarrolladora', game.developers],
    ['Editora', game.publishers],
    ['Saga', game.franchises],
    ['Modos de juego', translateGameModes(game.gameModes)],
    ['Perspectiva', translatePerspectives(game.perspectives)],
    ['Temas', translateThemes(game.themes)],
    ['Motor', game.engines],
  ]
  const visible = rows.filter(([, values]) => values.length > 0)
  if (visible.length === 0) return null

  return (
    <section className={styles.card}>
      <h2 className={styles.cardTitle}>Ficha</h2>
      <dl className={styles.facts}>
        {visible.map(([label, values]) => (
          <div key={label} className={styles.fact}>
            <dt>{label}</dt>
            <dd>{values.join(', ')}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function TimeToBeat({ game }: { game: GameDetails }) {
  const time = game.timeToBeat
  if (!time) return null
  const rows: Array<[string, number | null]> = [
    ['Historia principal', time.main],
    ['Historia y extras', time.extra],
    ['Completarlo al 100%', time.completionist],
  ]

  return (
    <section className={styles.card}>
      <h2 className={styles.cardTitle}>Duración</h2>
      <ul className={styles.durations}>
        {rows
          .filter(([, hours]) => hours !== null)
          .map(([label, hours]) => (
            <li key={label} className={styles.duration}>
              <span>{label}</span>
              <strong>{hours} h</strong>
            </li>
          ))}
      </ul>
      <p className={styles.cardNote}>Según los jugadores de IGDB.</p>
    </section>
  )
}

function Releases({ game }: { game: GameDetails }) {
  if (game.releaseDates.length === 0) return null
  return (
    <section className={styles.card}>
      <h2 className={styles.cardTitle}>Lanzamientos</h2>
      <ul className={styles.releases}>
        {game.releaseDates.map((release) => (
          <li key={release.platform} className={styles.release}>
            <span>{release.platform}</span>
            <span className={styles.releaseDate}>{formatDate(release.date)}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Links({ game }: { game: GameDetails }) {
  const links = usefulWebsites(game.websites)
  if (links.length === 0) return null
  return (
    <section className={styles.card}>
      <h2 className={styles.cardTitle}>Enlaces</h2>
      <ul className={styles.links}>
        {links.map((link) => (
          <li key={link.label}>
            <a href={link.url} target="_blank" rel="noreferrer" className={styles.link}>
              {link.label}
              <ArrowUpRightIcon width={16} height={16} aria-hidden="true" />
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
