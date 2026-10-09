import CrystalizedBall from './reactbits/CrystalizedBall'
import styles from './AppBackground.module.css'

/**
 * Fondo animado de la app: la bola de cristal de React Bits con el violeta de la marca,
 * fija a pantalla completa y atenuada para no competir con el contenido.
 * Es decorativo: no recibe foco ni clics y los lectores de pantalla lo ignoran.
 */
export function AppBackground() {
  return (
    <div className={styles.page} aria-hidden="true">
      <CrystalizedBall
        color="#B13DFF"
        size={0.85}
        glow={0.35}
        haze={0.3}
        sparks={0.3}
        crackle={0.5}
        flares={0.4}
        particleCount={9000}
        hoverStrength={0.6}
      />
    </div>
  )
}
