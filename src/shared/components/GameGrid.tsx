import type { ReactNode } from 'react'
import styles from './GameGrid.module.css'

export function GameGrid({ children }: { children: ReactNode }) {
  return <div className={styles.grid}>{children}</div>
}
