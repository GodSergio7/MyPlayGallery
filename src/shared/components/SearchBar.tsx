import { SearchIcon } from './icons'
import styles from './SearchBar.module.css'

interface SearchBarProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  autoFocus?: boolean
}

export function SearchBar({
  id,
  label,
  value,
  onChange,
  placeholder,
  autoFocus,
}: SearchBarProps) {
  return (
    <div className={styles.wrapper}>
      <label className="visually-hidden" htmlFor={id}>
        {label}
      </label>
      <span className={styles.icon} aria-hidden="true">
        <SearchIcon />
      </span>
      <input
        id={id}
        type="search"
        className={styles.input}
        value={value}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  )
}
