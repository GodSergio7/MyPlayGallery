import { Children, type ReactNode } from 'react'
import AnimatedContent from './reactbits/AnimatedContent'
import styles from './GameGrid.module.css'

const STAGGER_SECONDS = 0.04
const MAX_STAGGERED = 12

export function GameGrid({ children }: { children: ReactNode }) {
  return (
    <div className={styles.grid}>
      {Children.toArray(children).map((child, index) => (
        <AnimatedContent
          key={(child as { key?: string | null }).key ?? index}
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
