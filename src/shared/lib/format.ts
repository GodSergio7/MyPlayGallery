const dateFormatter = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

const numberFormatter = new Intl.NumberFormat('es-ES', {
  maximumFractionDigits: 1,
})

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/

/**
 * Fecha legible ("18 may 2015"). Las fechas sin hora (AAAA-MM-DD) se leen como fecha local:
 * new Date('2015-05-18') las toma en UTC y en América se mostraban un día antes (T-25).
 */
/** Fecha para mostrar: AAAA-MM-DD como medianoche local; con hora, tal cual. */
export function parseDisplayDate(value: string): Date {
  const dateOnly = DATE_ONLY.exec(value)
  return dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(value)
}

export function formatDate(value: string | null): string {
  if (!value) {
    return '—'
  }

  const date = parseDisplayDate(value)

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
