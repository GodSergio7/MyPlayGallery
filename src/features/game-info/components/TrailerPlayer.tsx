import { useState } from 'react'
import type { GameVideo } from '@/shared/types/domain'
import styles from './TrailerPlayer.module.css'

/**
 * Tráileres de YouTube. Primero muestra la miniatura; el reproductor (youtube-nocookie)
 * solo se carga al pulsar, para no ralentizar la página ni conectar con YouTube antes de tiempo.
 */
export function TrailerPlayer({ videos, title }: { videos: GameVideo[]; title: string }) {
  const [selected, setSelected] = useState(0)
  const [playing, setPlaying] = useState(false)
  const video = videos[selected]

  if (!video) return null

  return (
    <div className={styles.player}>
      <div className={styles.frame}>
        {playing ? (
          <iframe
            className={styles.iframe}
            src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}?autoplay=1&rel=0`}
            title={`${video.name} · ${title}`}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <button
            type="button"
            className={styles.poster}
            onClick={() => setPlaying(true)}
            aria-label={`Reproducir ${video.name} de ${title}`}
          >
            <img
              src={`https://i.ytimg.com/vi/${video.youtubeId}/hqdefault.jpg`}
              alt=""
              loading="lazy"
              className={styles.posterImage}
            />
            <span className={styles.play} aria-hidden="true">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                <path d="M8 5.5v13l11-6.5Z" />
              </svg>
            </span>
          </button>
        )}
      </div>

      {videos.length > 1 && (
        <div className={styles.tabs} role="group" aria-label="Elegir vídeo">
          {videos.map((item, index) => (
            <button
              key={item.youtubeId}
              type="button"
              className={styles.tab}
              aria-pressed={index === selected}
              onClick={() => {
                setSelected(index)
                setPlaying(false)
              }}
            >
              {item.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
