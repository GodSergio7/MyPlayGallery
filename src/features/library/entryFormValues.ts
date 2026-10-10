import type {
  GameStatus,
  LibraryEntry,
  LibraryEntryInput,
  Platform,
} from '@/shared/types/domain'

export interface EntryFormValues {
  platformId: string
  status: GameStatus
  score: string
  platinum: boolean
  hundredPercent: boolean
  hoursPlayed: string
  startedOn: string
  finishedOn: string
  review: string
  notes: string
}

/** Límites de la base de datos (columna hours_played numeric(6,1) y textos, migración T-21). */
export const MAX_HOURS = 99999.9
export const MAX_TEXT_LENGTH = 5000

export type EntryFormErrors = Partial<Record<'platformId' | 'hoursPlayed' | 'finishedOn' | 'review' | 'notes', string>>

/**
 * Comprueba el formulario antes de guardar (T-08) y devuelve un mensaje por campo.
 * Sin errores, el objeto está vacío.
 */
export function validateEntryForm(values: EntryFormValues): EntryFormErrors {
  const errors: EntryFormErrors = {}

  if (values.platformId === '') {
    errors.platformId = 'Elige una plataforma.'
  }

  if (values.hoursPlayed.trim() !== '') {
    const hours = Number(values.hoursPlayed)
    if (!Number.isFinite(hours)) {
      errors.hoursPlayed = 'Escribe un número, por ejemplo 12,5.'
    } else if (hours < 0) {
      errors.hoursPlayed = 'Las horas no pueden ser negativas.'
    } else if (hours > MAX_HOURS) {
      errors.hoursPlayed = 'Como mucho 99.999,9 horas.'
    }
  }

  if (values.startedOn && values.finishedOn && values.finishedOn < values.startedOn) {
    errors.finishedOn = 'No puede ser anterior a la fecha de inicio.'
  }

  if (values.review.length > MAX_TEXT_LENGTH) {
    errors.review = `Como mucho ${MAX_TEXT_LENGTH} caracteres.`
  }
  if (values.notes.length > MAX_TEXT_LENGTH) {
    errors.notes = `Como mucho ${MAX_TEXT_LENGTH} caracteres.`
  }

  return errors
}

export function hasErrors(errors: EntryFormErrors): boolean {
  return Object.keys(errors).length > 0
}

export function createEmptyForm(): EntryFormValues {
  return {
    platformId: '',
    status: 'pending',
    score: '',
    platinum: false,
    hundredPercent: false,
    hoursPlayed: '',
    startedOn: '',
    finishedOn: '',
    review: '',
    notes: '',
  }
}

export function formFromEntry(entry: LibraryEntry): EntryFormValues {
  return {
    platformId: String(entry.platformId),
    status: entry.status,
    score: entry.score === null ? '' : entry.score.toFixed(1),
    platinum: entry.platinum,
    hundredPercent: entry.hundredPercent,
    hoursPlayed: entry.hoursPlayed === null ? '' : String(entry.hoursPlayed),
    startedOn: entry.startedOn ?? '',
    finishedOn: entry.finishedOn ?? '',
    review: entry.review ?? '',
    notes: entry.notes ?? '',
  }
}

export function formToInput(
  values: EntryFormValues,
  platforms: Platform[],
): LibraryEntryInput {
  const platform = platforms.find((item) => String(item.id) === values.platformId)

  return {
    externalId: 0,
    platformId: Number(values.platformId),
    platformName: platform?.name ?? 'Plataforma',
    status: values.status,
    score: values.score === '' ? null : Number(values.score),
    platinum: values.platinum,
    hundredPercent: values.hundredPercent,
    hoursPlayed: values.hoursPlayed.trim() === '' ? null : Math.round(Number(values.hoursPlayed) * 10) / 10,
    startedOn: values.startedOn === '' ? null : values.startedOn,
    finishedOn: values.finishedOn === '' ? null : values.finishedOn,
    review: values.review.trim() === '' ? null : values.review,
    notes: values.notes.trim() === '' ? null : values.notes,
  }
}
