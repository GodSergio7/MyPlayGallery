import { useState } from 'react'
import styles from './CoverImage.module.css'

interface CoverImageProps {
  src: string | null
  title: string
  className?: string
  /** Dentro de una tarjeta que ya dice el título: la portada no se anuncia (evita repetirlo). */
  decorative?: boolean
}

const COVER_SIZE = '/t_cover_big/'
const COVER_SIZE_2X = '/t_cover_big_2x/'

/** En pantallas retina pide la portada al doble de resolución (T-37). */
function retinaSrcSet(src: string): string | undefined {
  return src.includes(COVER_SIZE) ? `${src} 1x, ${src.replace(COVER_SIZE, COVER_SIZE_2X)} 2x` : undefined
}

export function CoverImage({ src, title, className, decorative = false }: CoverImageProps) {
  // Si la imagen no carga (IGDB caído, imagen borrada), se muestran las iniciales (T-28).
  const [failedSrc, setFailedSrc] = useState<string | null>(null)

  if (src && failedSrc !== src) {
    return (
      <img
        src={src}
        srcSet={retinaSrcSet(src)}
        alt={decorative ? '' : `Portada de ${title}`}
        loading="lazy"
        decoding="async"
        onError={() => setFailedSrc(src)}
        className={[styles.cover, className].filter(Boolean).join(' ')}
      />
    )
  }

  const initials = title
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('')

  return (
    <div
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : `Portada no disponible de ${title}`}
      aria-hidden={decorative || undefined}
      className={[styles.cover, styles.placeholder, className].filter(Boolean).join(' ')}
    >
      <span aria-hidden="true">{initials}</span>
    </div>
  )
}
