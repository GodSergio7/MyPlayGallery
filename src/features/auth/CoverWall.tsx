import styles from './CoverWall.module.css'

// Portadas fijas de juegos populares (CDN de imágenes de IGDB). Van escritas aquí para que
// la pantalla de acceso no dependa de la API ni de tener sesión.
const COVERS: Array<[title: string, imageId: string]> = [
  ['The Witcher 3: Wild Hunt', 'coaarl'],
  ['Elden Ring', 'co4jni'],
  ['Red Dead Redemption 2', 'co1q1f'],
  ['Hollow Knight', 'cobfzp'],
  ['The Legend of Zelda: Breath of the Wild', 'co3p2d'],
  ['God of War', 'cobkt6'],
  ['Portal 2', 'co1rs4'],
  ['The Last of Us', 'co1r7f'],
  ['Bloodborne', 'cob99l'],
  ['Stardew Valley', 'coa93h'],
  ['Super Mario Odyssey', 'co1mxf'],
  ['Grand Theft Auto V', 'co2lbd'],
  ['Horizon Zero Dawn', 'co2una'],
  ['Undertale', 'cob1t2'],
  ['BioShock Infinite', 'co2n12'],
  ['Mass Effect 2', 'co20ac'],
  ['Dark Souls III', 'cob9ed'],
  ["Marvel's Spider-Man", 'co1r77'],
  ['Half-Life 2', 'co1nmw'],
  ['Uncharted 4', 'co1r7h'],
  ['Fallout: New Vegas', 'co1u60'],
  ['Batman: Arkham City', 'co1voh'],
  ['Life Is Strange', 'co1r8e'],
  ['Super Mario 64', 'co721v'],
  ['The Elder Scrolls V: Skyrim', 'cocs1l'],
  ['Dishonored', 'coabgu'],
  ['The Last of Us Part II', 'co5ziw'],
  ['Doom', 'co1nc7'],
  ['Assassin’s Creed IV Black Flag', 'co4qfn'],
  ['Minecraft', 'coa77e'],
]

/** Mosaico de portadas de fondo para el panel izquierdo de la pantalla de acceso. */
export function CoverWall() {
  return (
    <div className={styles.wall} aria-hidden="true">
      <div className={styles.grid}>
        {COVERS.map(([title, imageId]) => (
          <img
            key={imageId}
            src={`https://images.igdb.com/igdb/image/upload/t_cover_big/${imageId}.jpg`}
            alt=""
            title={title}
            loading="lazy"
            decoding="async"
            className={styles.cover}
          />
        ))}
      </div>
      <div className={styles.shade} />
    </div>
  )
}
