import LineWaves from './reactbits/LineWaves'
import styles from './AppBackground.module.css'

/**
 * Fondo animado de la app: ondas de líneas de React Bits en los violetas de la marca,
 * fijas a pantalla completa y con poco brillo para no competir con el contenido.
 * Es decorativo: no recibe foco ni clics y los lectores de pantalla lo ignoran.
 */
export function AppBackground() {
  return (
    <div className={styles.page} aria-hidden="true">
      <LineWaves
        color1="#6a3fe0"
        color2="#b39bff"
        color3="#3b2a8c"
        brightness={0.11}
        speed={0.2}
        colorCycleSpeed={0.6}
        warpIntensity={0.9}
        mouseInfluence={1.2}
      />
    </div>
  )
}
