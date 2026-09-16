const dateFormatter = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

const numberFormatter = new Intl.NumberFormat('es-ES', {
  maximumFractionDigits: 1,
})

export function formatDate(value: string | null): string {
  if (!value) {
    return '—'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return dateFormatter.format(date)
}

export function formatHours(value: number | null): string {
  if (value === null) {
    return '—'
  }

  return `${numberFormatter.format(value)} h`
}

export function formatAverage(value: number | null): string {
  if (value === null) {
    return '—'
  }

  return `${numberFormatter.format(value)}/10`
}
