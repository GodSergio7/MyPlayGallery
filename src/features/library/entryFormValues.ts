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
    hoursPlayed: values.hoursPlayed === '' ? null : Number(values.hoursPlayed),
    startedOn: values.startedOn === '' ? null : values.startedOn,
    finishedOn: values.finishedOn === '' ? null : values.finishedOn,
    review: values.review === '' ? null : values.review,
    notes: values.notes === '' ? null : values.notes,
  }
}
