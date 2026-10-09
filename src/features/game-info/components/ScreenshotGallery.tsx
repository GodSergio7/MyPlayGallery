import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { GameScreenshot } from '@/shared/types/domain'
import { ArrowLeftIcon, CloseIcon } from '@/shared/components/icons'
import styles from './ScreenshotGallery.module.css'

/** Capturas en miniatura; al pulsar una se abre a pantalla completa (flechas y Escape). */
export function ScreenshotGallery({ screenshots, title }: { screenshots: GameScreenshot[]; title: string }) {
  const [open, setOpen] = useState<number | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)

  const close = useCallback(() => {
    setOpen(null)
    triggerRef.current?.focus()
  }, [])

  return (
    <>
      <ul className={styles.grid}>
        {screenshots.map((shot, index) => (
          <li key={shot.fullUrl}>
            <button
              type="button"
              className={styles.thumb}
              onClick={(event) => {
                triggerRef.current = event.currentTarget
                setOpen(index)
              }}
              aria-label={`Ver captura ${index + 1} de ${screenshots.length} a pantalla completa`}
            >
              <img src={shot.thumbUrl} alt="" loading="lazy" className={styles.thumbImage} />
            </button>
          </li>
        ))}
      </ul>

      {open !== null && (
        <Lightbox
          screenshots={screenshots}
          index={open}
          title={title}
          onChange={setOpen}
          onClose={close}
        />
      )}
    </>
  )
}

interface LightboxProps {
  screenshots: GameScreenshot[]
  index: number
  title: string
  onChange: (index: number) => void
  onClose: () => void
}

function Lightbox({ screenshots, index, title, onChange, onClose }: LightboxProps) {
  const closeRef = useRef<HTMLButtonElement | null>(null)
  const total = screenshots.length
  const prev = useCallback(() => onChange((index - 1 + total) % total), [index, total, onChange])
  const next = useCallback(() => onChange((index + 1) % total), [index, total, onChange])

  useEffect(() => {
    closeRef.current?.focus()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      else if (event.key === 'ArrowLeft') prev()
      else if (event.key === 'ArrowRight') next()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose, prev, next])

  return createPortal(
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label={`Capturas de ${title}`}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <img src={screenshots[index].fullUrl} alt={`Captura ${index + 1} de ${title}`} className={styles.full} />

      <button ref={closeRef} type="button" className={`${styles.control} ${styles.close}`} onClick={onClose} aria-label="Cerrar">
        <CloseIcon />
      </button>

      {total > 1 && (
        <>
          <button type="button" className={`${styles.control} ${styles.prev}`} onClick={prev} aria-label="Captura anterior">
            <ArrowLeftIcon />
          </button>
          <button type="button" className={`${styles.control} ${styles.next}`} onClick={next} aria-label="Captura siguiente">
            <ArrowLeftIcon className={styles.flip} />
          </button>
          <p className={styles.counter} aria-live="polite">
            {index + 1} / {total}
          </p>
        </>
      )}
    </div>,
    document.body,
  )
}
