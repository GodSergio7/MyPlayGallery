// Lee la biblioteca de Steam del usuario y la empareja con IGDB (SPEC-08, fase 2).
//
// 1. Busca la cuenta de Steam conectada del usuario (tabla platform_connections).
// 2. Pide a Steam sus juegos y minutos jugados (IPlayerService/GetOwnedGames) con STEAM_API_KEY.
// 3. Busca en IGDB qué juego corresponde a cada appid (external_games con origen Steam).
// 4. Para los juegos jugados, pide a Steam los logros conseguidos (ISteamUserStats/GetPlayerAchievements):
//    con todos conseguidos, la app propone el juego como completado y al 100%.
// 5. Apunta la fecha de la lectura en last_synced_at y devuelve la lista.
// No guarda nada en la biblioteca: el usuario revisa la lista en la app y elige qué añadir.

import { createClient } from 'npm:@supabase/supabase-js@2'

const STEAM_OWNED_GAMES = 'https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/'
const STEAM_ACHIEVEMENTS = 'https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v1/'
// Steam da los logros juego a juego: varias peticiones a la vez y un tope (los más jugados primero)
// para que bibliotecas enormes no agoten el tiempo de la función.
const ACHIEVEMENT_CONCURRENCY = 8
const ACHIEVEMENT_MAX_GAMES = 400
const ACHIEVEMENT_TIMEOUT_MS = 6000
const IGDB_API_BASE = 'https://api.igdb.com/v4'
const TWITCH_TOKEN_URL = 'https://id.twitch.tv/oauth2/token'
const IGDB_BATCH = 250
const STEAM_SOURCE_ID = 1
const TIMEOUT_MS = 12000
const TOKEN_SAFETY_MARGIN_MS = 60_000

const DEFAULT_ALLOWED_ORIGINS = ['http://localhost:5173', 'http://localhost:4173']

type ErrorCode =
  | 'unauthorized'
  | 'not_connected'
  | 'private_profile'
  | 'upstream_error'
  | 'internal_error'
  | 'method_not_allowed'

const ERROR_STATUS: Record<ErrorCode, number> = {
  unauthorized: 401,
  not_connected: 404,
  private_profile: 403,
  upstream_error: 502,
  internal_error: 500,
  method_not_allowed: 405,
}

const ERROR_MESSAGES: Record<ErrorCode, string> = {
  unauthorized: 'Sesion no valida.',
  not_connected: 'No hay ninguna cuenta de Steam conectada.',
  private_profile: 'Los detalles de juego del perfil de Steam no son publicos.',
  upstream_error: 'No se ha podido contactar con Steam o IGDB.',
  internal_error: 'Error inesperado.',
  method_not_allowed: 'Metodo no permitido.',
}

class UpstreamError extends Error {}

interface SteamGame {
  appId: number
  name: string
  minutes: number
  lastPlayedAt: string | null
  igdbId: number | null
  /** Logros conseguidos y totales; null si el juego no tiene logros o no se han podido leer. */
  achievements: { unlocked: number; total: number } | null
}

function allowedOrigins(): string[] {
  const raw = Deno.env.get('ALLOWED_ORIGINS')
  if (!raw) {
    return DEFAULT_ALLOWED_ORIGINS
  }
  return raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
}

function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type, authorization, apikey, x-client-info',
    Vary: 'Origin',
  }

  if (origin && allowedOrigins().includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin
  }

  return headers
}

function jsonResponse(body: unknown, status: number, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
  })
}

function errorResponse(code: ErrorCode, origin: string | null): Response {
  return jsonResponse({ error: { code, message: ERROR_MESSAGES[code] } }, ERROR_STATUS[code], origin)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

async function fetchWithTimeout(url: string | URL, init: RequestInit = {}, timeoutMs = TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } catch {
    throw new UpstreamError('request failed')
  } finally {
    clearTimeout(timer)
  }
}

// ---------------------------------------------------------------- Steam

/** null si el perfil no deja ver sus juegos (Steam devuelve una respuesta vacía). */
async function fetchOwnedGames(
  steamId: string,
  apiKey: string,
): Promise<Omit<SteamGame, 'igdbId' | 'achievements'>[] | null> {
  const url = new URL(STEAM_OWNED_GAMES)
  url.searchParams.set('key', apiKey)
  url.searchParams.set('steamid', steamId)
  url.searchParams.set('include_appinfo', '1')
  url.searchParams.set('include_played_free_games', '1')
  url.searchParams.set('format', 'json')

  const response = await fetchWithTimeout(url)
  if (!response.ok) throw new UpstreamError('steam failed')

  const payload: unknown = await response.json().catch(() => null)
  const body = isRecord(payload) && isRecord(payload.response) ? payload.response : null
  if (!body || !Array.isArray(body.games)) return null

  const games: Omit<SteamGame, 'igdbId' | 'achievements'>[] = []
  for (const item of body.games) {
    if (!isRecord(item) || typeof item.appid !== 'number') continue
    const lastPlayed = typeof item.rtime_last_played === 'number' ? item.rtime_last_played : 0
    games.push({
      appId: item.appid,
      name: typeof item.name === 'string' && item.name ? item.name : `App ${item.appid}`,
      minutes: typeof item.playtime_forever === 'number' ? item.playtime_forever : 0,
      lastPlayedAt: lastPlayed > 0 ? new Date(lastPlayed * 1000).toISOString() : null,
    })
  }
  return games
}

/**
 * Logros de un juego. Steam responde con error (400) si el juego no tiene logros;
 * eso, un fallo o un tiempo agotado cuentan como "sin datos" y no tumban la importación.
 */
async function fetchAchievements(
  steamId: string,
  apiKey: string,
  appId: number,
): Promise<{ unlocked: number; total: number } | null> {
  const url = new URL(STEAM_ACHIEVEMENTS)
  url.searchParams.set('key', apiKey)
  url.searchParams.set('steamid', steamId)
  url.searchParams.set('appid', String(appId))

  try {
    const response = await fetchWithTimeout(url, {}, ACHIEVEMENT_TIMEOUT_MS)
    if (!response.ok) return null
    const payload: unknown = await response.json().catch(() => null)
    const stats = isRecord(payload) && isRecord(payload.playerstats) ? payload.playerstats : null
    if (!stats || stats.success !== true || !Array.isArray(stats.achievements)) return null

    const total = stats.achievements.length
    if (total === 0) return null
    const unlocked = stats.achievements.filter((item) => isRecord(item) && item.achieved === 1).length
    return { unlocked, total }
  } catch {
    return null
  }
}

/** Ejecuta las tareas con un máximo de `limit` a la vez, conservando el orden de los resultados. */
async function mapWithLimit<T, R>(items: T[], limit: number, task: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length)
  let next = 0
  async function worker() {
    while (next < items.length) {
      const index = next++
      results[index] = await task(items[index])
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

// ---------------------------------------------------------------- IGDB

let cachedToken: { token: string; expiresAt: number } | null = null

function twitchCredentials(): { clientId: string; clientSecret: string } {
  const clientId = Deno.env.get('TWITCH_CLIENT_ID')
  const clientSecret = Deno.env.get('TWITCH_CLIENT_SECRET')
  if (!clientId || !clientSecret) throw new Error('Twitch credentials are not configured')
  return { clientId, clientSecret }
}

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt - TOKEN_SAFETY_MARGIN_MS > Date.now()) {
    return cachedToken.token
  }
  const { clientId, clientSecret } = twitchCredentials()
  // El secreto va en el cuerpo, no en la URL: las URL pueden quedar en registros intermedios (T-35).
  const response = await fetchWithTimeout(TWITCH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: 'client_credentials' }),
  })
  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok || !isRecord(payload) || typeof payload.access_token !== 'string' || typeof payload.expires_in !== 'number') {
    throw new UpstreamError('twitch token failed')
  }
  cachedToken = { token: payload.access_token, expiresAt: Date.now() + payload.expires_in * 1000 }
  return cachedToken.token
}

async function igdbQuery(path: string, query: string): Promise<Response> {
  const { clientId } = twitchCredentials()
  const token = await getAccessToken()
  return fetchWithTimeout(`${IGDB_API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Client-ID': clientId,
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'text/plain',
    },
    body: query,
  })
}

/** appid de Steam → id de juego en IGDB. Si un appid tiene varias fichas, se queda la primera. */
async function matchWithIgdb(appIds: number[]): Promise<Map<number, number>> {
  const matches = new Map<number, number>()

  for (let start = 0; start < appIds.length; start += IGDB_BATCH) {
    const chunk = appIds.slice(start, start + IGDB_BATCH)
    const uids = chunk.map((id) => `"${id}"`).join(',')
    // external_game_source (no el antiguo "category", que ya devuelve vacío) identifica el origen Steam.
    const response = await igdbQuery(
      '/external_games',
      `fields game,uid; where external_game_source = ${STEAM_SOURCE_ID} & uid = (${uids}); limit 500;`,
    )
    if (!response.ok) throw new UpstreamError('igdb failed')

    const rows: unknown = await response.json().catch(() => null)
    if (!Array.isArray(rows)) throw new UpstreamError('igdb invalid')
    for (const row of rows) {
      if (!isRecord(row) || typeof row.game !== 'number' || typeof row.uid !== 'string') continue
      const appId = Number(row.uid)
      if (Number.isInteger(appId) && !matches.has(appId)) matches.set(appId, row.game)
    }
  }

  return matches
}

// ---------------------------------------------------------------- Handler

Deno.serve(async (request: Request): Promise<Response> => {
  const origin = request.headers.get('origin')

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) })
  }

  if (request.method !== 'POST') {
    return errorResponse('method_not_allowed', origin)
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const steamKey = Deno.env.get('STEAM_API_KEY')
    if (!supabaseUrl || !serviceRoleKey || !steamKey) {
      return errorResponse('internal_error', origin)
    }
    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })

    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    const { data: userData, error: userError } = token
      ? await admin.auth.getUser(token)
      : { data: { user: null }, error: null }
    if (userError || !userData.user) {
      return errorResponse('unauthorized', origin)
    }

    const { data: connection } = await admin
      .from('platform_connections')
      .select('id, external_id')
      .eq('user_id', userData.user.id)
      .eq('provider', 'steam')
      .maybeSingle()
    if (!connection) {
      return errorResponse('not_connected', origin)
    }

    const owned = await fetchOwnedGames(connection.external_id, steamKey)
    if (owned === null) {
      return errorResponse('private_profile', origin)
    }

    const matches = owned.length > 0 ? await matchWithIgdb(owned.map((game) => game.appId)) : new Map()

    // Logros solo de los juegos jugados que tienen ficha en IGDB (los únicos que se pueden importar).
    const withAchievements = owned
      .filter((game) => game.minutes > 0 && matches.has(game.appId))
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, ACHIEVEMENT_MAX_GAMES)
    const achievementResults = await mapWithLimit(withAchievements, ACHIEVEMENT_CONCURRENCY, (game) =>
      fetchAchievements(connection.external_id, steamKey, game.appId),
    )
    const achievementsByApp = new Map(withAchievements.map((game, index) => [game.appId, achievementResults[index]]))

    const games: SteamGame[] = owned.map((game) => ({
      ...game,
      igdbId: matches.get(game.appId) ?? null,
      achievements: achievementsByApp.get(game.appId) ?? null,
    }))

    const syncedAt = new Date().toISOString()
    await admin.from('platform_connections').update({ last_synced_at: syncedAt }).eq('id', connection.id)

    return jsonResponse({ games, syncedAt }, 200, origin)
  } catch (cause) {
    return errorResponse(cause instanceof UpstreamError ? 'upstream_error' : 'internal_error', origin)
  }
})
