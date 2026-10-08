import CrystalizedBall from './reactbits/CrystalizedBall'
import styles from './AppBackground.module.css'

interface AppBackgroundProps {
  /**
   * `page`: fondo fijo a pantalla completa, atenuado para no competir con el contenido.
   * `panel`: ocupa su contenedor (que debe tener `position: relative`), a plena intensidad.
   */
  variant?: 'page' | 'panel'
  /** Clase extra para ajustar la posición del contenedor. */
  className?: string
}

/**
 * Fondo animado de la app: la bola de cristal de React Bits con el violeta de la marca.
 * Brillo y neblina reducidos para respetar la identidad visual sin neón (SPEC-03 v0.4).
 * Es decorativo: no recibe foco ni clics y los lectores de pantalla lo ignoran.
 */
export function AppBackground({ variant = 'page', className }: AppBackgroundProps) {
  const isPage = variant === 'page'

  return (
    <div
      className={[isPage ? styles.page : styles.panel, className].filter(Boolean).join(' ')}
      aria-hidden="true"
    >
      <CrystalizedBall
        color="#B13DFF"
        size={isPage ? 0.85 : 0.88}
        glow={0.35}
        haze={0.3}
        sparks={0.3}
        crackle={0.5}
        flares={0.4}
        particleCount={isPage ? 9000 : 12000}
        hoverStrength={0.6}
      />
    </div>
  )
}
