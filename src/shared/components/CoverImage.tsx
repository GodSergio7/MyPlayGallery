import TiltedCard from './reactbits/TiltedCard'
import styles from './CoverImage.module.css'

interface CoverImageProps {
  src: string | null
  title: string
  className?: string
  /** Inclina la portada en 3D siguiendo el ratón. */
  tilt?: boolean
}

export function CoverImage({ src, title, className, tilt = false }: CoverImageProps) {
  if (src && tilt) {
    return (
      <div className={[styles.cover, styles.tiltFrame, className].filter(Boolean).join(' ')}>
        <TiltedCard
          imageSrc={src}
          altText={`Portada de ${title}`}
          containerWidth="100%"
          containerHeight="100%"
          imageWidth="100%"
          imageHeight="100%"
          scaleOnHover={1.04}
          rotateAmplitude={10}
        />
      </div>
    )
  }

  if (src) {
    return (
      <img
        src={src}
        alt={`Portada de ${title}`}
        loading="lazy"
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
      role="img"
      aria-label={`Portada no disponible de ${title}`}
      className={[styles.cover, styles.placeholder, className].filter(Boolean).join(' ')}
    >
      <span aria-hidden="true">{initials}</span>
    </div>
  )
}
