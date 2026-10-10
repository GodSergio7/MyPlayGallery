// Validación de las rutas y parámetros de igdb-proxy (T-22).
// Código puro, sin Deno ni red: lo usa la función y lo prueban los tests (src/test/igdbProxyRoutes.test.ts).

export const MAX_IDS = 100
export const BROWSE_MAX_OFFSET = 4800

export type Route =
  | { kind: 'search'; search: string }
  | { kind: 'detail'; gameId: number }
  | { kind: 'batch'; gameIds: number[] }
  | { kind: 'browse'; params: BrowseParams }
  | { kind: 'full'; gameId: number }
  | { kind: 'bad_route' }
  | { kind: 'bad_params' }

export function sanitizeSearchTerm(value: string): string {
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

export const BROWSE_SORTS = ['popular', 'top_rated', 'newest', 'oldest', 'upcoming', 'name_asc', 'name_desc'] as const
export type BrowseSort = (typeof BROWSE_SORTS)[number]

export interface BrowseParams {
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
export function buildBrowseConditions(p: BrowseParams, now: number): { where: string; sort: string } {
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

export function parseRoute(url: URL): Route {
  const segments = url.pathname.split('/').filter(Boolean)
  const functionIndex = segments.indexOf('igdb-proxy')
  const rest = functionIndex >= 0 ? segments.slice(functionIndex + 1) : segments

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
