import styles from './CoverImage.module.css'

interface CoverImageProps {
  src: string | null
  title: string
  className?: string
}

export function CoverImage({ src, title, className }: CoverImageProps) {
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
