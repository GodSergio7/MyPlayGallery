const IGDB_API_BASE = 'https://api.igdb.com/v4'
const TWITCH_TOKEN_URL = 'https://id.twitch.tv/oauth2/token'
const PAGE_SIZE = 20
const MAX_IDS = 100
const BROWSE_PAGE_SIZE = 24
const BROWSE_MAX_OFFSET = 4800
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
  total_rating: number | null
  cover: IgdbCoverProjection | null
  genres: IgdbGenreProjection[]
  platforms: IgdbPlatformProjection[]
}

type Route =
  | { kind: 'search'; search: string }
  | { kind: 'detail'; gameId: number }
  | { kind: 'batch'; gameIds: number[] }
  | { kind: 'browse'; params: BrowseParams }
  | { kind: 'full'; gameId: number }
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
    total_rating: typeof value.total_rating === 'number' ? value.total_rating : null,
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

// ---------------------------------------------------------------- Explorar el catálogo

const BROWSE_SORTS = ['popular', 'top_rated', 'newest', 'oldest', 'upcoming', 'name_asc', 'name_desc'] as const
type BrowseSort = (typeof BROWSE_SORTS)[number]

interface BrowseParams {
  q: string | null
  letter: string | null // 'A'..'Z' o '#' (empieza por número)
  platform: number | null
  genre: number | null
  fromYear: number | null
  toYear: number | null
  minRating: number | null
  sort: BrowseSort
  offset: number
}

/** Entero opcional dentro de un rango. `undefined` = valor presente pero no válido. */
function optionalInt(params: URLSearchParams, key: string, min: number, max: number): number | null | undefined {
  const raw = params.get(key)
  if (raw === null || raw === '') return null
  if (!/^[0-9]+$/.test(raw)) return undefined
  const value = Number(raw)
  return Number.isSafeInteger(value) && value >= min && value <= max ? value : undefined
}

function parseBrowse(params: URLSearchParams): Route {
  const sortRaw = params.get('sort') ?? 'popular'
  if (!(BROWSE_SORTS as readonly string[]).includes(sortRaw)) return { kind: 'bad_params' }

  const qRaw = params.get('q')
  const q = qRaw === null ? null : sanitizeSearchTerm(qRaw)
  if (q !== null && q.length > 100) return { kind: 'bad_params' }

  const letterRaw = (params.get('letter') ?? '').toUpperCase()
  if (letterRaw !== '' && !/^[A-Z#]$/.test(letterRaw)) return { kind: 'bad_params' }

  const platform = optionalInt(params, 'platform', 1, 1_000_000)
  const genre = optionalInt(params, 'genre', 1, 1_000_000)
  const fromYear = optionalInt(params, 'from', 1950, 2100)
  const toYear = optionalInt(params, 'to', 1950, 2100)
  const minRating = optionalInt(params, 'min_rating', 1, 100)
  const offset = optionalInt(params, 'offset', 0, BROWSE_MAX_OFFSET)

  if ([platform, genre, fromYear, toYear, minRating, offset].some((value) => value === undefined)) {
    return { kind: 'bad_params' }
  }
  if (fromYear != null && toYear != null && fromYear > toYear) return { kind: 'bad_params' }

  return {
    kind: 'browse',
    params: {
      q: q || null,
      letter: letterRaw || null,
      platform: platform ?? null,
      genre: genre ?? null,
      fromYear: fromYear ?? null,
      toYear: toYear ?? null,
      minRating: minRating ?? null,
      sort: sortRaw as BrowseSort,
      offset: offset ?? 0,
    },
  }
}

const yearStart = (year: number) => Math.floor(Date.UTC(year, 0, 1) / 1000)

/** Condiciones `where` (sin la palabra clave) y orden de la consulta de exploración. */
function buildBrowseConditions(p: BrowseParams, now: number): { where: string; sort: string } {
  // Solo juegos principales, remakes y remasters con portada; sin ediciones/versiones duplicadas.
  const where = ['game_type = (0,8,9)', 'cover != null', 'version_parent = null']

  if (p.q) where.push(`name ~ *"${p.q}"*`)
  if (p.letter === '#') {
    where.push(`(${Array.from({ length: 10 }, (_, d) => `name ~ "${d}"*`).join(' | ')})`)
  } else if (p.letter) {
    where.push(`name ~ "${p.letter}"*`)
  }
  if (p.platform) where.push(`platforms = (${p.platform})`)
  if (p.genre) where.push(`genres = (${p.genre})`)
  if (p.fromYear) where.push(`first_release_date >= ${yearStart(p.fromYear)}`)
  if (p.toYear) where.push(`first_release_date < ${yearStart(p.toYear + 1)}`)
  if (p.minRating) where.push(`total_rating >= ${p.minRating}`)

  // Con filtros estrechos se relajan los mínimos de calidad para no dejar la lista vacía.
  const narrow = Boolean(p.q || p.letter || p.platform || p.genre || p.fromYear || p.toYear || p.minRating)

  switch (p.sort) {
    case 'top_rated':
      where.push(`total_rating_count >= ${narrow ? 20 : 100}`)
      return { where: where.join(' & '), sort: 'total_rating desc' }
    case 'newest':
      where.push(`first_release_date < ${now}`)
      if (!narrow) where.push('total_rating_count >= 5')
      return { where: where.join(' & '), sort: 'first_release_date desc' }
    case 'oldest':
      where.push('first_release_date != null')
      return { where: where.join(' & '), sort: 'first_release_date asc' }
    case 'upcoming':
      where.push(`first_release_date > ${now}`)
      if (!narrow) where.push('hypes >= 10')
      return { where: where.join(' & '), sort: 'first_release_date asc' }
    case 'name_asc':
      return { where: where.join(' & '), sort: 'name asc' }
    case 'name_desc':
      return { where: where.join(' & '), sort: 'name desc' }
    case 'popular':
    default:
      return { where: where.join(' & '), sort: 'total_rating_count desc' }
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

  if (rest.length === 3 && rest[0] === 'games' && rest[2] === 'full') {
    const detail = parseGameId(rest[1])
    return detail.kind === 'detail' ? { kind: 'full', gameId: detail.gameId } : detail
  }

  if (rest.length === 2 && rest[0] === 'games' && rest[1] === 'browse') {
    return parseBrowse(url.searchParams)
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
