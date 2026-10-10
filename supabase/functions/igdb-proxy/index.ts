import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { BROWSE_MAX_OFFSET, buildBrowseConditions, parseRoute, type BrowseParams } from './routes.ts'

const IGDB_API_BASE = 'https://api.igdb.com/v4'
const TWITCH_TOKEN_URL = 'https://id.twitch.tv/oauth2/token'
const PAGE_SIZE = 20
const BROWSE_PAGE_SIZE = 24
const TIMEOUT_MS = 9000
const TOKEN_SAFETY_MARGIN_MS = 60_000

// Solo usuarios con sesión (no basta la clave pública) y con un límite por usuario (T-01).
// 300 peticiones por minuto sobran para un uso normal (el scroll infinito de Explorar pide
// 24 juegos por petición y la biblioteca, 100) y cortan a quien intente vaciar la cuota de IGDB.
const RATE_LIMIT_PER_WINDOW = 300
const RATE_LIMIT_WINDOW_SECONDS = 60
// El usuario de cada token se recuerda un minuto para no consultar Auth en cada petición.
const USER_CACHE_MS = 60_000
const USER_CACHE_MAX = 500

const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:4173',
]

type ErrorCode =
  | 'unauthorized'
  | 'bad_request'
  | 'not_found'
  | 'rate_limited'
  | 'upstream_error'
  | 'timeout'
  | 'internal_error'
  | 'method_not_allowed'

const ERROR_STATUS: Record<ErrorCode, number> = {
  unauthorized: 401,
  bad_request: 400,
  not_found: 404,
  rate_limited: 429,
  upstream_error: 502,
  timeout: 504,
  internal_error: 500,
  method_not_allowed: 405,
}

const ERROR_MESSAGES: Record<ErrorCode, string> = {
  unauthorized: 'Inicia sesion para consultar el catalogo.',
  bad_request: 'Parametros de la peticion no validos.',
  not_found: 'Juego no encontrado.',
  rate_limited: 'Demasiadas peticiones. Intentalo mas tarde.',
  upstream_error: 'No se ha podido obtener la informacion del servicio externo.',
  timeout: 'El servicio externo ha tardado demasiado en responder.',
  internal_error: 'Error inesperado.',
  method_not_allowed: 'Metodo no permitido.',
}

class ConfigError extends Error {}
class TimeoutError extends Error {}
class UpstreamError extends Error {}

interface IgdbCoverProjection {
  url: string
}

interface IgdbGenreProjection {
  name: string
}

interface IgdbPlatformProjection {
  id: number
  name: string
}

interface IgdbGameProjection {
  id: number
  name: string
  first_release_date: number | null
  total_rating: number | null
  cover: IgdbCoverProjection | null
  genres: IgdbGenreProjection[]
  platforms: IgdbPlatformProjection[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
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
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

function projectCover(value: unknown): IgdbCoverProjection | null {
  if (!isRecord(value) || typeof value.url !== 'string' || value.url.length === 0) {
    return null
  }
  return { url: value.url }
}

function projectGenres(value: unknown): IgdbGenreProjection[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.flatMap((item) => {
    if (!isRecord(item) || typeof item.name !== 'string' || item.name.length === 0) {
      return []
    }
    return [{ name: item.name }]
  })
}

function projectPlatforms(value: unknown): IgdbPlatformProjection[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.flatMap((item) => {
    if (!isRecord(item) || typeof item.id !== 'number' || typeof item.name !== 'string') {
      return []
    }
    return [{ id: item.id, name: item.name }]
  })
}

function projectGame(value: unknown): IgdbGameProjection | null {
  if (!isRecord(value) || typeof value.id !== 'number') {
    return null
  }

  return {
    id: value.id,
    name: typeof value.name === 'string' ? value.name : '',
    first_release_date:
      typeof value.first_release_date === 'number' ? value.first_release_date : null,
    total_rating: typeof value.total_rating === 'number' ? value.total_rating : null,
    cover: projectCover(value.cover),
    genres: projectGenres(value.genres),
    platforms: projectPlatforms(value.platforms),
  }
}

async function handleBrowse(p: BrowseParams, origin: string | null): Promise<Response> {
  const { where, sort } = buildBrowseConditions(p, Math.floor(Date.now() / 1000))
  // Se pide uno más de la cuenta para saber si hay más páginas sin otra petición.
  const listQuery = `fields ${buildGameFields()}; where ${where}; sort ${sort}; limit ${BROWSE_PAGE_SIZE + 1}; offset ${p.offset};`

  const [listResponse, countResponse] = await Promise.all([
    fetchIgdb('/games', listQuery),
    // El total solo se calcula en la primera página.
    p.offset === 0 ? fetchIgdb('/games/count', `where ${where};`) : Promise.resolve(null),
  ])

  if (listResponse.status === 429 || countResponse?.status === 429) {
    return errorResponse('rate_limited', origin)
  }
  if (!listResponse.ok) {
    return errorResponse('upstream_error', origin)
  }

  const payload: unknown = await listResponse.json().catch(() => null)
  if (!Array.isArray(payload)) {
    return errorResponse('upstream_error', origin)
  }

  const games = payload
    .map((item) => projectGame(item))
    .filter((game): game is IgdbGameProjection => game !== null)

  let total: number | null = null
  if (countResponse?.ok) {
    const countPayload: unknown = await countResponse.json().catch(() => null)
    if (isRecord(countPayload) && typeof countPayload.count === 'number') total = countPayload.count
  }

  return jsonResponse(
    {
      results: games.slice(0, BROWSE_PAGE_SIZE),
      has_more: games.length > BROWSE_PAGE_SIZE && p.offset + BROWSE_PAGE_SIZE <= BROWSE_MAX_OFFSET,
      total,
    },
    200,
    origin,
  )
}

interface CachedToken {
  token: string
  expiresAt: number
}

let cachedToken: CachedToken | null = null

function twitchCredentials(): { clientId: string; clientSecret: string } {
  const clientId = Deno.env.get('TWITCH_CLIENT_ID')
  const clientSecret = Deno.env.get('TWITCH_CLIENT_SECRET')
  if (!clientId || !clientSecret) {
    throw new ConfigError('Twitch credentials are not configured')
  }
  return { clientId, clientSecret }
}

async function requestTwitchToken(): Promise<CachedToken> {
  const { clientId, clientSecret } = twitchCredentials()

  // El secreto va en el cuerpo, no en la URL: las URL pueden quedar en registros intermedios (T-35).
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'client_credentials',
  })

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const response = await fetch(TWITCH_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: controller.signal,
    })
    if (!response.ok) {
      throw new UpstreamError('Twitch token request failed')
    }

    const payload: unknown = await response.json().catch(() => null)
    if (
      !isRecord(payload) ||
      typeof payload.access_token !== 'string' ||
      typeof payload.expires_in !== 'number'
    ) {
      throw new UpstreamError('Twitch token response is invalid')
    }

    return {
      token: payload.access_token,
      expiresAt: Date.now() + payload.expires_in * 1000,
    }
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') {
      throw new TimeoutError('Twitch token request timed out')
    }
    if (cause instanceof UpstreamError || cause instanceof ConfigError) {
      throw cause
    }
    throw new UpstreamError('Twitch token request failed')
  } finally {
    clearTimeout(timer)
  }
}

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt - TOKEN_SAFETY_MARGIN_MS > Date.now()) {
    return cachedToken.token
  }

  cachedToken = await requestTwitchToken()
  return cachedToken.token
}

async function sendIgdbRequest(path: string, query: string): Promise<Response> {
  const { clientId } = twitchCredentials()
  const token = await getAccessToken()

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    return await fetch(`${IGDB_API_BASE}${path}`, {
      method: 'POST',
      headers: {
        'Client-ID': clientId,
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'text/plain',
      },
      body: query,
      signal: controller.signal,
    })
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') {
      throw new TimeoutError('Upstream timeout')
    }
    throw new UpstreamError('Upstream request failed')
  } finally {
    clearTimeout(timer)
  }
}

async function fetchIgdb(path: string, query: string): Promise<Response> {
  let response = await sendIgdbRequest(path, query)

  if (response.status === 401) {
    cachedToken = null
    response = await sendIgdbRequest(path, query)
  }

  return response
}

function buildGameFields(): string {
  return 'name, first_release_date, total_rating, cover.url, genres.name, platforms.name'
}

function buildSearchQuery(term: string): string {
  return `search "${term}"; fields ${buildGameFields()}; limit ${PAGE_SIZE};`
}

function buildDetailQuery(gameId: number): string {
  return `fields ${buildGameFields()}; where id = ${gameId}; limit 1;`
}

function buildBatchQuery(gameIds: number[]): string {
  return `fields ${buildGameFields()}; where id = (${gameIds.join(',')}); limit ${gameIds.length};`
}

async function handleSearch(upstream: Response, origin: string | null): Promise<Response> {
  if (upstream.status === 429) {
    return errorResponse('rate_limited', origin)
  }
  if (!upstream.ok) {
    return errorResponse('upstream_error', origin)
  }

  const payload: unknown = await upstream.json().catch(() => null)
  if (!Array.isArray(payload)) {
    return errorResponse('upstream_error', origin)
  }

  const results = payload
    .map((item) => projectGame(item))
    .filter((game): game is IgdbGameProjection => game !== null)

  return jsonResponse({ results }, 200, origin)
}

// ---------------------------------------------------------------- Ficha completa

const FULL_LIMITS = { screenshots: 12, artworks: 4, videos: 4, similar: 10, websites: 12 }
const PEGI_ORGANIZATION = 2

const FULL_FIELDS = [
  'name', 'summary', 'storyline', 'first_release_date',
  'total_rating', 'total_rating_count', 'aggregated_rating', 'aggregated_rating_count', 'rating', 'rating_count',
  'cover.url', 'screenshots.url', 'artworks.url', 'videos.video_id', 'videos.name',
  'genres.name', 'themes.name', 'game_modes.name', 'player_perspectives.name', 'platforms.name',
  'involved_companies.company.name', 'involved_companies.developer', 'involved_companies.publisher',
  'franchises.name', 'collections.name', 'game_engines.name',
  'similar_games.name', 'similar_games.cover.url', 'similar_games.total_rating', 'similar_games.first_release_date',
  'websites.url', 'websites.type',
  'age_ratings.organization', 'age_ratings.rating_category.rating',
  'release_dates.date', 'release_dates.platform.name',
].join(', ')

const asNumber = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) ? value : null)
const asString = (value: unknown): string | null => (typeof value === 'string' && value.trim() ? value : null)
const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : [])

/** Lista de `{ id, name }` sin repetidos. */
function namedList(value: unknown): Array<{ id: number; name: string }> {
  const seen = new Set<number>()
  return asArray(value).flatMap((item) => {
    if (!isRecord(item) || typeof item.id !== 'number' || !asString(item.name) || seen.has(item.id)) return []
    seen.add(item.id)
    return [{ id: item.id, name: item.name as string }]
  })
}

const uniqueNames = (items: unknown[]): string[] => [
  ...new Set(items.flatMap((item) => (isRecord(item) && asString(item.name) ? [item.name as string] : []))),
]

const urlList = (value: unknown, limit: number): Array<{ url: string }> =>
  asArray(value)
    .flatMap((item) => (isRecord(item) && asString(item.url) ? [{ url: item.url as string }] : []))
    .slice(0, limit)

function projectFullGame(value: unknown) {
  if (!isRecord(value) || typeof value.id !== 'number') return null

  const companies = asArray(value.involved_companies).filter(isRecord)
  const companyNames = (role: 'developer' | 'publisher') =>
    uniqueNames(companies.filter((c) => c[role] === true).map((c) => c.company))

  const pegi = asArray(value.age_ratings)
    .filter(isRecord)
    .find((rating) => rating.organization === PEGI_ORGANIZATION)
  const pegiRating = pegi && isRecord(pegi.rating_category) ? asString(pegi.rating_category.rating) : null

  // Fecha de salida por plataforma: la más temprana de cada una.
  const releases = new Map<string, number>()
  for (const item of asArray(value.release_dates).filter(isRecord)) {
    const date = asNumber(item.date)
    const platform = isRecord(item.platform) ? asString(item.platform.name) : null
    if (date !== null && platform && (!releases.has(platform) || date < (releases.get(platform) as number))) {
      releases.set(platform, date)
    }
  }

  return {
    id: value.id,
    name: asString(value.name) ?? '',
    summary: asString(value.summary),
    storyline: asString(value.storyline),
    first_release_date: asNumber(value.first_release_date),
    total_rating: asNumber(value.total_rating),
    total_rating_count: asNumber(value.total_rating_count),
    aggregated_rating: asNumber(value.aggregated_rating),
    aggregated_rating_count: asNumber(value.aggregated_rating_count),
    rating: asNumber(value.rating),
    rating_count: asNumber(value.rating_count),
    cover: projectCover(value.cover),
    screenshots: urlList(value.screenshots, FULL_LIMITS.screenshots),
    artworks: urlList(value.artworks, FULL_LIMITS.artworks),
    videos: asArray(value.videos)
      .flatMap((item) =>
        isRecord(item) && typeof item.video_id === 'string' && /^[A-Za-z0-9_-]{6,20}$/.test(item.video_id)
          ? [{ video_id: item.video_id, name: asString(item.name) ?? 'Vídeo' }]
          : [],
      )
      .slice(0, FULL_LIMITS.videos),
    genres: namedList(value.genres),
    themes: namedList(value.themes),
    game_modes: namedList(value.game_modes),
    player_perspectives: namedList(value.player_perspectives),
    platforms: namedList(value.platforms),
    developers: companyNames('developer'),
    publishers: companyNames('publisher'),
    franchises: uniqueNames([...asArray(value.franchises), ...asArray(value.collections)]),
    engines: uniqueNames(asArray(value.game_engines)),
    similar_games: asArray(value.similar_games)
      .flatMap((item) => {
        if (!isRecord(item) || typeof item.id !== 'number' || !asString(item.name)) return []
        return [
          {
            id: item.id,
            name: item.name as string,
            cover: projectCover(item.cover),
            total_rating: asNumber(item.total_rating),
            first_release_date: asNumber(item.first_release_date),
          },
        ]
      })
      .slice(0, FULL_LIMITS.similar),
    websites: asArray(value.websites)
      .flatMap((item) =>
        isRecord(item) && typeof item.url === 'string' && /^https?:\/\//.test(item.url)
          ? [{ url: item.url, type: asNumber(item.type) }]
          : [],
      )
      .slice(0, FULL_LIMITS.websites),
    pegi: pegiRating,
    release_dates: [...releases.entries()]
      .map(([platform, date]) => ({ platform, date }))
      .sort((a, b) => a.date - b.date),
  }
}

function projectTimeToBeat(payload: unknown) {
  const item = Array.isArray(payload) ? payload.find(isRecord) : null
  if (!item) return null
  const hastily = asNumber(item.hastily)
  const normally = asNumber(item.normally)
  const completely = asNumber(item.completely)
  if (hastily === null && normally === null && completely === null) return null
  return { hastily, normally, completely, count: asNumber(item.count) }
}

async function handleFull(gameId: number, origin: string | null): Promise<Response> {
  const [gameResponse, timeResponse] = await Promise.all([
    fetchIgdb('/games', `fields ${FULL_FIELDS}; where id = ${gameId}; limit 1;`),
    fetchIgdb('/game_time_to_beats', `fields hastily, normally, completely, count; where game_id = ${gameId}; limit 1;`),
  ])

  if (gameResponse.status === 429) {
    return errorResponse('rate_limited', origin)
  }
  if (!gameResponse.ok) {
    return errorResponse('upstream_error', origin)
  }

  const payload: unknown = await gameResponse.json().catch(() => null)
  const game = Array.isArray(payload) && payload.length > 0 ? projectFullGame(payload[0]) : null
  if (!game) {
    return errorResponse('not_found', origin)
  }

  // La duración es opcional: si falla, la ficha se muestra igualmente.
  const timeToBeat = timeResponse.ok ? projectTimeToBeat(await timeResponse.json().catch(() => null)) : null

  return jsonResponse({ ...game, time_to_beat: timeToBeat }, 200, origin)
}

async function handleDetail(upstream: Response, origin: string | null): Promise<Response> {
  if (upstream.status === 429) {
    return errorResponse('rate_limited', origin)
  }
  if (!upstream.ok) {
    return errorResponse('upstream_error', origin)
  }

  const payload: unknown = await upstream.json().catch(() => null)
  if (!Array.isArray(payload)) {
    return errorResponse('upstream_error', origin)
  }

  const game = payload.length > 0 ? projectGame(payload[0]) : null
  if (!game) {
    return errorResponse('not_found', origin)
  }

  return jsonResponse(game, 200, origin)
}

// ---------------------------------------------------------------- Sesión y límite (T-01)

let adminClient: SupabaseClient | null = null

function getAdminClient(): SupabaseClient {
  if (adminClient) return adminClient
  const url = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !serviceRoleKey) throw new ConfigError('Supabase credentials are not configured')
  adminClient = createClient(url, serviceRoleKey, { auth: { persistSession: false } })
  return adminClient
}

const userCache = new Map<string, { userId: string; expiresAt: number }>()

/** Id del usuario de la sesión, o null si la petición trae solo la clave pública o un token no válido. */
async function sessionUserId(request: Request): Promise<string | null> {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return null

  const cached = userCache.get(token)
  if (cached && cached.expiresAt > Date.now()) return cached.userId

  const { data, error } = await getAdminClient().auth.getUser(token)
  if (error || !data.user) return null

  if (userCache.size >= USER_CACHE_MAX) userCache.clear()
  userCache.set(token, { userId: data.user.id, expiresAt: Date.now() + USER_CACHE_MS })
  return data.user.id
}

/** Suma la petición al contador del usuario (en Postgres, común a todas las copias de la función). */
async function withinRateLimit(userId: string): Promise<boolean> {
  const { data, error } = await getAdminClient().rpc('hit_rate_limit', {
    p_user: userId,
    p_limit: RATE_LIMIT_PER_WINDOW,
    p_window_seconds: RATE_LIMIT_WINDOW_SECONDS,
  })
  // Si el contador falla, no se bloquea al usuario: la sesión ya se ha comprobado.
  if (error) return true
  return data === true
}

Deno.serve(async (request: Request): Promise<Response> => {
  const origin = request.headers.get('origin')

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) })
  }

  if (request.method !== 'GET') {
    return errorResponse('method_not_allowed', origin)
  }

  try {
    const userId = await sessionUserId(request)
    if (!userId) {
      return errorResponse('unauthorized', origin)
    }
    if (!(await withinRateLimit(userId))) {
      const response = errorResponse('rate_limited', origin)
      response.headers.set('Retry-After', String(RATE_LIMIT_WINDOW_SECONDS))
      return response
    }

    const route = parseRoute(new URL(request.url))

    if (route.kind === 'bad_route') {
      return errorResponse('not_found', origin)
    }
    if (route.kind === 'bad_params') {
      return errorResponse('bad_request', origin)
    }

    if (route.kind === 'search') {
      const upstream = await fetchIgdb('/games', buildSearchQuery(route.search))
      return await handleSearch(upstream, origin)
    }

    if (route.kind === 'batch') {
      const upstream = await fetchIgdb('/games', buildBatchQuery(route.gameIds))
      return await handleSearch(upstream, origin)
    }

    if (route.kind === 'full') {
      return await handleFull(route.gameId, origin)
    }

    if (route.kind === 'browse') {
      return await handleBrowse(route.params, origin)
    }

    const upstream = await fetchIgdb('/games', buildDetailQuery(route.gameId))
    return await handleDetail(upstream, origin)
  } catch (cause) {
    if (cause instanceof ConfigError) {
      return errorResponse('internal_error', origin)
    }
    if (cause instanceof TimeoutError) {
      return errorResponse('timeout', origin)
    }
    if (cause instanceof UpstreamError) {
      return errorResponse('upstream_error', origin)
    }
    return errorResponse('internal_error', origin)
  }
})
