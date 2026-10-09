import { z } from 'zod'
import type { GameStatus, LibraryEntry, LibraryEntryInput } from '@/shared/types/domain'
import { DataError } from '@/data/errors'
import { getSupabaseClient } from './client'

const TABLE = 'library_entries'

const LibraryEntryRowSchema = z.object({
  id: z.string(),
  external_id: z.number().int(),
  platform_id: z.number().int(),
  platform_name: z.string(),
  status: z.enum(['pending', 'playing', 'completed', 'abandoned']),
  score: z.coerce.number().nullable(),
  platinum: z.boolean(),
  hundred_percent: z.boolean(),
  hours_played: z.coerce.number().nullable(),
  started_on: z.string().nullable(),
  finished_on: z.string().nullable(),
  review: z.string().nullable(),
  notes: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
})

type LibraryEntryRow = z.infer<typeof LibraryEntryRowSchema>

interface PostgrestErrorLike {
  code?: string
}

function mapRow(row: LibraryEntryRow): LibraryEntry {
  return {
    id: row.id,
    externalId: row.external_id,
    platformId: row.platform_id,
    platformName: row.platform_name,
    status: row.status,
    score: row.score,
    platinum: row.platinum,
    hundredPercent: row.hundred_percent,
    hoursPlayed: row.hours_played,
    startedOn: row.started_on,
    finishedOn: row.finished_on,
    review: row.review,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toRow(input: LibraryEntryInput) {
  return {
    external_id: input.externalId,
    platform_id: input.platformId,
    platform_name: input.platformName,
    status: input.status,
    score: input.score,
    platinum: input.platinum,
    hundred_percent: input.hundredPercent,
    hours_played: input.hoursPlayed,
    started_on: input.startedOn,
    finished_on: input.finishedOn,
    review: input.review,
    notes: input.notes,
  }
}

function toDataError(error: PostgrestErrorLike): DataError {
  switch (error.code) {
    case '23505':
      return new DataError('badRequest', 'Ya tienes este juego en esa plataforma.')
    case '23514':
    case '22P02':
      return new DataError('badRequest')
    case '42501':
    case 'PGRST301':
      return new DataError('unauthorized')
    default:
      return new DataError(error.code ? 'internalError' : 'network')
  }
}

function parseRows(data: unknown): LibraryEntry[] {
  const parsed = z.array(LibraryEntryRowSchema).safeParse(data)
  if (!parsed.success) {
    throw new DataError('invalidResponse')
  }
  return parsed.data.map(mapRow)
}

function parseRow(data: unknown): LibraryEntry {
  const parsed = LibraryEntryRowSchema.safeParse(data)
  if (!parsed.success) {
    throw new DataError('invalidResponse')
  }
  return mapRow(parsed.data)
}

export async function listEntries(): Promise<LibraryEntry[]> {
  const { data, error } = await getSupabaseClient()
    .from(TABLE)
    .select('*')
    .order('updated_at', { ascending: false })

  if (error) {
    throw toDataError(error)
  }
  return parseRows(data)
}

export async function getEntry(id: string): Promise<LibraryEntry | undefined> {
  const { data, error } = await getSupabaseClient().from(TABLE).select('*').eq('id', id).maybeSingle()

  if (error) {
    // Un id que no es uuid válido equivale a "no existe".
    if (error.code === '22P02') {
      return undefined
    }
    throw toDataError(error)
  }
  return data ? parseRow(data) : undefined
}

export async function listEntriesByGame(externalId: number): Promise<LibraryEntry[]> {
  const { data, error } = await getSupabaseClient()
    .from(TABLE)
    .select('*')
    .eq('external_id', externalId)
    .order('updated_at', { ascending: false })

  if (error) {
    throw toDataError(error)
  }
  return parseRows(data)
}

export async function createEntry(input: LibraryEntryInput): Promise<LibraryEntry> {
  const { data, error } = await getSupabaseClient()
    .from(TABLE)
    .insert(toRow(input))
    .select('*')
    .single()

  if (error) {
    throw toDataError(error)
  }
  return parseRow(data)
}

export async function updateEntry(
  id: string,
  input: LibraryEntryInput,
): Promise<LibraryEntry | undefined> {
  const { data, error } = await getSupabaseClient()
    .from(TABLE)
    .update(toRow(input))
    .eq('id', id)
    .select('*')
    .maybeSingle()

  if (error) {
    throw toDataError(error)
  }
  return data ? parseRow(data) : undefined
}

export async function deleteEntry(id: string): Promise<void> {
  const { error } = await getSupabaseClient().from(TABLE).delete().eq('id', id)

  if (error) {
    throw toDataError(error)
  }
}

/**
 * Alta de varias entradas en una sola petición (importación de Steam).
 * Las que ya existen (mismo juego y plataforma) se ignoran en lugar de fallar.
 * Devuelve cuántas se han creado.
 */
export async function createEntries(inputs: LibraryEntryInput[]): Promise<number> {
  if (inputs.length === 0) {
    return 0
  }

  const { data, error } = await getSupabaseClient()
    .from(TABLE)
    .upsert(inputs.map(toRow), { onConflict: 'user_id,external_id,platform_id', ignoreDuplicates: true })
    .select('id')

  if (error) {
    throw toDataError(error)
  }
  return Array.isArray(data) ? data.length : 0
}

/** Lo que la sincronización con Steam puede cambiar en una entrada existente. */
export interface SteamEntryPatch {
  hoursPlayed?: number
  hundredPercent?: boolean
  status?: GameStatus
}

/** Actualiza solo los campos indicados (sincronización con Steam); el resto de la entrada no se toca. */
export async function updateEntryFromSteam(id: string, patch: SteamEntryPatch): Promise<void> {
  const row: Record<string, unknown> = {}
  if (patch.hoursPlayed !== undefined) row.hours_played = patch.hoursPlayed
  if (patch.hundredPercent !== undefined) row.hundred_percent = patch.hundredPercent
  if (patch.status !== undefined) row.status = patch.status
  if (Object.keys(row).length === 0) return

  const { error } = await getSupabaseClient().from(TABLE).update(row).eq('id', id)

  if (error) {
    throw toDataError(error)
  }
}

/**
 * Borra todas las entradas del usuario (RLS limita el borrado a las suyas).
 * Solo lo usa la zona de pruebas de Ajustes, que existe únicamente en desarrollo.
 * Devuelve cuántas se han borrado.
 */
export async function deleteAllEntries(): Promise<number> {
  // Supabase exige un filtro en los delete: este coincide con todas las filas.
  const { data, error } = await getSupabaseClient().from(TABLE).delete().not('id', 'is', null).select('id')

  if (error) {
    throw toDataError(error)
  }
  return Array.isArray(data) ? data.length : 0
}
