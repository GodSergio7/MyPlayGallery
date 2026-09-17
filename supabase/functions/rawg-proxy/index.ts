const RAWG_API_BASE = 'https://api.rawg.io/api'
const PAGE_SIZE = 20
const TIMEOUT_MS = 9000

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

interface RawgGenreProjection {
  id: number | null
  name: string
}

interface RawgPlatformProjection {
  platform: {
    id: number
    name: string
  }
}

interface RawgGameProjection {
  id: number
  name: string
  released: string | null
  background_image: string | null
  genres: RawgGenreProjection[]
  platforms: RawgPlatformProjection[]
}

type Route =
  | { kind: 'search'; search: string; page: number }
  | { kind: 'detail'; rawgId: number }
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

function projectGenres(value: unknown): RawgGenreProjection[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.flatMap((item) => {
    if (!isRecord(item) || typeof item.name !== 'string' || item.name.length === 0) {
      return []
    }
    return [{ id: typeof item.id === 'number' ? item.id : null, name: item.name }]
  })
}

function projectPlatforms(value: unknown): RawgPlatformProjection[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.flatMap((item) => {
    if (!isRecord(item) || !isRecord(item.platform)) {
      return []
    }
    const platform = item.platform
    if (typeof platform.id !== 'number' || typeof platform.name !== 'string') {
      return []
    }
    return [{ platform: { id: platform.id, name: platform.name } }]
  })
}

function projectGame(value: unknown): RawgGameProjection | null {
  if (!isRecord(value) || typeof value.id !== 'number') {
    return null
  }

  return {
    id: value.id,
    name: typeof value.name === 'string' ? value.name : '',
    released: typeof value.released === 'string' ? value.released : null,
    background_image: typeof value.background_image === 'string' ? value.background_image : null,
    genres: projectGenres(value.genres),
    platforms: projectPlatforms(value.platforms),
  }
}

function parseRawgId(value: string): Route {
  if (!/^[0-9]+$/.test(value)) {
    return { kind: 'bad_params' }
  }
  const rawgId = Number(value)
  if (!Number.isSafeInteger(rawgId) || rawgId <= 0) {
    return { kind: 'bad_params' }
  }
  return { kind: 'detail', rawgId }
}

function parseRoute(url: URL): Route {
  const segments = url.pathname.split('/').filter(Boolean)
  const functionIndex = segments.indexOf('rawg-proxy')
  const rest = functionIndex >= 0 ? segments.slice(functionIndex + 1) : segments

  if (rest.length === 0 && url.searchParams.has('rawgId')) {
    return parseRawgId(url.searchParams.get('rawgId') ?? '')
  }

  if (rest.length === 0 || (rest.length === 1 && rest[0] === 'games')) {
    const search = (url.searchParams.get('search') ?? '').trim()
    if (search.length < 1 || search.length > 100) {
      return { kind: 'bad_params' }
    }

    const pageParam = url.searchParams.get('page')
    if (pageParam === null) {
      return { kind: 'search', search, page: 1 }
    }
    if (!/^[0-9]+$/.test(pageParam)) {
      return { kind: 'bad_params' }
    }
    const page = Number(pageParam)
    if (!Number.isSafeInteger(page) || page < 1) {
      return { kind: 'bad_params' }
    }
    return { kind: 'search', search, page }
  }

  if (rest.length === 2 && rest[0] === 'games') {
    return parseRawgId(rest[1])
  }

  return { kind: 'bad_route' }
}

async function fetchRawg(path: string, params: Record<string, string>): Promise<Response> {
  const key = Deno.env.get('RAWG_API_KEY')
  if (!key) {
    throw new ConfigError('RAWG_API_KEY is not configured')
  }

  const url = new URL(`${RAWG_API_BASE}${path}`)
  url.searchParams.set('key', key)
  for (const [name, value] of Object.entries(params)) {
    url.searchParams.set(name, value)
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    return await fetch(url, {
      method: 'GET',
      headers: { accept: 'application/json' },
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

async function handleSearch(upstream: Response, origin: string | null): Promise<Response> {
  if (upstream.status === 404) {
    return errorResponse('not_found', origin)
  }
  if (upstream.status === 429) {
    return errorResponse('rate_limited', origin)
  }
  if (!upstream.ok) {
    return errorResponse('upstream_error', origin)
  }

  const payload: unknown = await upstream.json().catch(() => null)
  if (!isRecord(payload) || !Array.isArray(payload.results)) {
    return errorResponse('upstream_error', origin)
  }

  const results = payload.results
    .map((item) => projectGame(item))
    .filter((game): game is RawgGameProjection => game !== null)

  return jsonResponse({ results }, 200, origin)
}

async function handleDetail(upstream: Response, origin: string | null): Promise<Response> {
  if (upstream.status === 404) {
    return errorResponse('not_found', origin)
  }
  if (upstream.status === 429) {
    return errorResponse('rate_limited', origin)
  }
  if (!upstream.ok) {
    return errorResponse('upstream_error', origin)
  }

  const payload: unknown = await upstream.json().catch(() => null)
  const game = projectGame(payload)
  if (!game) {
    return errorResponse('upstream_error', origin)
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
      const upstream = await fetchRawg('/games', {
        search: route.search,
        page: String(route.page),
        page_size: String(PAGE_SIZE),
      })
      return await handleSearch(upstream, origin)
    }

    const upstream = await fetchRawg(`/games/${route.rawgId}`, {})
    return await handleDetail(upstream, origin)
  } catch (cause) {
    if (cause instanceof TimeoutError) {
      return errorResponse('timeout', origin)
    }
    if (cause instanceof UpstreamError) {
      return errorResponse('upstream_error', origin)
    }
    return errorResponse('internal_error', origin)
  }
})
