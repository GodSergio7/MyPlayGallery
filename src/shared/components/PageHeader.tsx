import type { ReactNode } from 'react'
import BlurText from './reactbits/BlurText'
import styles from './PageHeader.module.css'

interface PageHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.text}>
        <h1 className={styles.title}>
          <BlurText key={title} text={title} delay={80} direction="bottom" />
        </h1>
        {description && <p className={styles.description}>{description}</p>}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </header>
  )
}
