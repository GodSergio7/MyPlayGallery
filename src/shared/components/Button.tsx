import type { ButtonHTMLAttributes } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import styles from './Button.module.css'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
type Size = 'sm' | 'md'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

function buttonClasses(variant: Variant, size: Size, className?: string): string {
  return [styles.button, styles[variant], styles[size], className].filter(Boolean).join(' ')
}

export function Button({
  variant = 'primary',
  size = 'md',
  type = 'button',
  className,
  ...rest
}: ButtonProps) {
  return <button type={type} className={buttonClasses(variant, size, className)} {...rest} />
}

interface ButtonLinkProps extends LinkProps {
  variant?: Variant
  size?: Size
}

/** Enlace con aspecto de botón (en lugar de un <button> dentro de un <a>, que es HTML no válido). */
export function ButtonLink({ variant = 'primary', size = 'md', className, ...rest }: ButtonLinkProps) {
  return <Link className={buttonClasses(variant, size, className)} {...rest} />
}
