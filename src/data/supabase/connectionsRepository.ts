import { z } from 'zod'
import { DataError, dataErrorFromStatus } from '@/data/errors'
import { getSupabaseClient } from './client'

// Cuentas de plataformas conectadas (SPEC-08). El cliente solo lee y borra;
// las conexiones las crea la Edge Function de cada plataforma tras verificar la cuenta.

const TABLE = 'platform_connections'

export type ConnectionProvider = 'steam'

export interface PlatformConnection {
  provider: ConnectionProvider
  externalId: string
  displayName: string | null
  avatarUrl: string | null
  connectedAt: string
  lastSyncedAt: string | null
}

const ConnectionRowSchema = z.object({
  provider: z.literal('steam'),
  external_id: z.string(),
  display_name: z.string().nullable(),
  avatar_url: z.string().nullable(),
  connected_at: z.string(),
  last_synced_at: z.string().nullable(),
})

type ConnectionRow = z.infer<typeof ConnectionRowSchema>

const COLUMNS = 'provider, external_id, display_name, avatar_url, connected_at, last_synced_at'

function mapRow(row: ConnectionRow): PlatformConnection {
  return {
    provider: row.provider,
    externalId: row.external_id,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    connectedAt: row.connected_at,
    lastSyncedAt: row.last_synced_at,
  }
}

// Mensajes en español para los códigos de error de las funciones de Steam.
const STEAM_ERRORS: Record<string, string> = {
  invalid_steam_response: 'Steam no ha confirmado el inicio de sesión. Vuelve a intentarlo.',
  already_linked: 'Esa cuenta de Steam ya está conectada a otro usuario de MyPlayGallery.',
  upstream_error: 'No se ha podido contactar con Steam. Inténtalo dentro de un rato.',
  not_connected: 'Primero conecta tu cuenta de Steam en Ajustes.',
  private_profile:
    'Steam no deja ver tus juegos. En tu perfil de Steam, ve a Privacidad y pon "Detalles de juego" en Público.',
}

/** Lee el código de error que devuelven las funciones de Steam y lo traduce. */
async function steamFunctionError(response: Response | undefined): Promise<DataError> {
  const body: unknown = await response?.json().catch(() => null)
  const code =
    typeof body === 'object' && body !== null ? (body as { error?: { code?: unknown } }).error?.code : undefined
  if (typeof code === 'string' && STEAM_ERRORS[code]) {
    return new DataError('badRequest', STEAM_ERRORS[code])
  }
  return response ? dataErrorFromStatus(response.status) : new DataError('network')
}

export async function listConnections(): Promise<PlatformConnection[]> {
  const { data, error } = await getSupabaseClient().from(TABLE).select(COLUMNS)

  if (error) {
    throw new DataError(error.code ? 'internalError' : 'network')
  }
  const parsed = z.array(ConnectionRowSchema).safeParse(data)
  if (!parsed.success) {
    throw new DataError('invalidResponse')
  }
  return parsed.data.map(mapRow)
}

export async function removeConnection(provider: ConnectionProvider): Promise<void> {
  const { error } = await getSupabaseClient().from(TABLE).delete().eq('provider', provider)

  if (error) {
    throw new DataError(error.code ? 'internalError' : 'network')
  }
}

/** Envía la respuesta de Steam (parámetros openid.*) a la Edge Function, que la verifica y guarda la conexión. */
export async function connectSteam(params: Record<string, string>): Promise<PlatformConnection> {
  const { data, error, response } = await getSupabaseClient().functions.invoke<unknown>('steam-connect', {
    method: 'POST',
    body: { params },
  })

  if (error) {
    throw await steamFunctionError(response)
  }

  const parsed = z.object({ connection: ConnectionRowSchema }).safeParse(data)
  if (!parsed.success) {
    throw new DataError('invalidResponse')
  }
  return mapRow(parsed.data.connection)
}

// ---------------------------------------------------------------- Biblioteca de Steam

export interface SteamOwnedGame {
  appId: number
  name: string
  minutes: number
  lastPlayedAt: string | null
  /** Juego de IGDB que corresponde a este appid, o null si IGDB no lo tiene. */
  igdbId: number | null
  /** Logros conseguidos y totales; null si el juego no tiene logros o no se han podido leer. */
  achievements: { unlocked: number; total: number } | null
}

const SteamLibrarySchema = z.object({
  games: z.array(
    z.object({
      appId: z.number().int(),
      name: z.string(),
      minutes: z.number().nonnegative(),
      lastPlayedAt: z.string().nullable(),
      igdbId: z.number().int().nullable(),
      achievements: z
        .object({ unlocked: z.number().int().nonnegative(), total: z.number().int().positive() })
        .nullable(),
    }),
  ),
  syncedAt: z.string(),
})

/** Pide a la Edge Function steam-library los juegos de Steam emparejados con IGDB. */
export async function readSteamLibrary(): Promise<{ games: SteamOwnedGame[]; syncedAt: string }> {
  const { data, error, response } = await getSupabaseClient().functions.invoke<unknown>('steam-library', {
    method: 'POST',
  })

  if (error) {
    throw await steamFunctionError(response)
  }

  const parsed = SteamLibrarySchema.safeParse(data)
  if (!parsed.success) {
    throw new DataError('invalidResponse')
  }
  return parsed.data
}
