const IGDB_API_BASE = 'https://api.igdb.com/v4'
const TWITCH_TOKEN_URL = 'https://id.twitch.tv/oauth2/token'
const PAGE_SIZE = 20
const MAX_IDS = 100
const TIMEOUT_MS = 9000
const TOKEN_SAFETY_MARGIN_MS = 60_000

const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:4173',
]

type ErrorCode =
  | 'bad_request'
  | 'not_found'
  | 'rate_limited'
  | 'upstream_error'
  | 'timeout'
  | 'internal_error'
  | 'method_not_allowed'

const ERROR_STATUS: Record<ErrorCode, number> = {
  bad_request: 400,
  not_found: 404,
  rate_limited: 429,
  upstream_error: 502,
  timeout: 504,
  internal_error: 500,
  method_not_allowed: 405,
}

const ERROR_MESSAGES: Record<ErrorCode, string> = {
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
  cover: IgdbCoverProjection | null
  genres: IgdbGenreProjection[]
  platforms: IgdbPlatformProjection[]
}

type Route =
  | { kind: 'search'; search: string }
  | { kind: 'detail'; gameId: number }
  | { kind: 'batch'; gameIds: number[] }
  | { kind: 'bad_route' }
  | { kind: 'bad_params' }

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
    cover: projectCover(value.cover),
    genres: projectGenres(value.genres),
    platforms: projectPlatforms(value.platforms),
  }
}

function sanitizeSearchTerm(value: string): string {
  return value.replace(/[\\"]/g, ' ').replace(/[\r\n]+/g, ' ').trim()
}

function parseGameId(value: string): Route {
  if (!/^[0-9]+$/.test(value)) {
    return { kind: 'bad_params' }
  }
  const gameId = Number(value)
  if (!Number.isSafeInteger(gameId) || gameId <= 0) {
    return { kind: 'bad_params' }
  }
  return { kind: 'detail', gameId }
}

function parseGameIds(value: string): Route {
  const parts = value.split(',').map((part) => part.trim())
  if (parts.length > MAX_IDS || !parts.every((part) => /^[0-9]+$/.test(part))) {
    return { kind: 'bad_params' }
  }
  const gameIds = [...new Set(parts.map(Number))]
  if (!gameIds.every((gameId) => Number.isSafeInteger(gameId) && gameId > 0)) {
    return { kind: 'bad_params' }
  }
  return { kind: 'batch', gameIds }
}

function parseRoute(url: URL): Route {
  const segments = url.pathname.split('/').filter(Boolean)
  const functionIndex = segments.indexOf('igdb-proxy')
  const rest = functionIndex >= 0 ? segments.slice(functionIndex + 1) : segments

  if (rest.length === 0 && url.searchParams.has('gameId')) {
    return parseGameId(url.searchParams.get('gameId') ?? '')
  }

  if (rest.length === 1 && rest[0] === 'games' && url.searchParams.has('ids')) {
    return parseGameIds(url.searchParams.get('ids') ?? '')
  }

  if (rest.length === 0 || (rest.length === 1 && rest[0] === 'games')) {
    const search = sanitizeSearchTerm(url.searchParams.get('search') ?? '')
    if (search.length < 1 || search.length > 100) {
      return { kind: 'bad_params' }
    }
    return { kind: 'search', search }
  }

  if (rest.length === 2 && rest[0] === 'games') {
    return parseGameId(rest[1])
  }

  return { kind: 'bad_route' }
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

  const url = new URL(TWITCH_TOKEN_URL)
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('client_secret', clientSecret)
  url.searchParams.set('grant_type', 'client_credentials')

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const response = await fetch(url, { method: 'POST', signal: controller.signal })
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
  return 'name, first_release_date, cover.url, genres.name, platforms.name'
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

Deno.serve(async (request: Request): Promise<Response> => {
  const origin = request.headers.get('origin')

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) })
  }

  if (request.method !== 'GET') {
    return errorResponse('method_not_allowed', origin)
  }

  try {
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
