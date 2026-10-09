import { Children, isValidElement, useLayoutEffect, type ReactNode } from 'react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import AnimatedContent from './reactbits/AnimatedContent'
import styles from './GameGrid.module.css'

const STAGGER_SECONDS = 0.04
const MAX_STAGGERED = 12

export function GameGrid({ children }: { children: ReactNode }) {
  const items = Children.toArray(children)
  // Firma de la lista: cambia al filtrar, ordenar o cargar más elementos.
  const signature = items.map((child, index) => (isValidElement(child) ? child.key : index)).join('|')

  // Al cambiar la lista, las tarjetas que ya existían pueden moverse a la zona visible.
  // Sin recalcular, su animación de entrada esperaría a una posición antigua y se quedarían invisibles.
  useLayoutEffect(() => {
    ScrollTrigger.refresh()
  }, [signature])

  return (
    <div className={styles.grid}>
      {items.map((child, index) => (
        <AnimatedContent
          key={isValidElement(child) && child.key !== null ? child.key : index}
          className={styles.item}
          distance={24}
          duration={0.5}
          delay={(index % MAX_STAGGERED) * STAGGER_SECONDS}
        >
          {child}
        </AnimatedContent>
      ))}
    </div>
  )
}
