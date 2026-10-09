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

// Mensajes en español para los códigos de error de steam-connect.
const STEAM_ERRORS: Record<string, string> = {
  invalid_steam_response: 'Steam no ha confirmado el inicio de sesión. Vuelve a intentarlo.',
  already_linked: 'Esa cuenta de Steam ya está conectada a otro usuario de MyPlayGallery.',
  upstream_error: 'No se ha podido contactar con Steam. Inténtalo dentro de un rato.',
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
    const body: unknown = await response?.json().catch(() => null)
    const code =
      typeof body === 'object' && body !== null
        ? (body as { error?: { code?: unknown } }).error?.code
        : undefined
    if (typeof code === 'string' && STEAM_ERRORS[code]) {
      throw new DataError('badRequest', STEAM_ERRORS[code])
    }
    throw response ? dataErrorFromStatus(response.status) : new DataError('network')
  }

  const parsed = z.object({ connection: ConnectionRowSchema }).safeParse(data)
  if (!parsed.success) {
    throw new DataError('invalidResponse')
  }
  return mapRow(parsed.data.connection)
}
