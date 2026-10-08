import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { HttpResponse, delay, http } from 'msw'
import { setupServer } from 'msw/node'
import { igdbGamesRepository } from './repository'

const BASE = 'http://localhost:54321/functions/v1/igdb-proxy'

const sampleGame = {
  id: 1942,
  name: 'The Witcher 3: Wild Hunt',
  first_release_date: 1431907200,
  cover: { url: '//images.igdb.com/igdb/image/upload/t_thumb/hash.jpg' },
  genres: [{ name: 'RPG' }],
  platforms: [{ id: 6, name: 'PC (Microsoft Windows)' }],
}

const server = setupServer()

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('igdbGamesRepository.search', () => {
  it('consulta la Edge Function y devuelve Game[]', async () => {
    server.use(http.get(`${BASE}/games`, () => HttpResponse.json({ results: [sampleGame] })))

    const games = await igdbGamesRepository.search('witcher')

    expect(games).toEqual([
      {
        externalId: 1942,
        title: 'The Witcher 3: Wild Hunt',
        coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/hash.jpg',
        released: '2015-05-18',
        genres: ['RPG'],
        platforms: [{ id: 6, name: 'PC (Microsoft Windows)' }],
      },
    ])
  })

  it('devuelve [] sin llamar a la red cuando el término está vacío', async () => {
    await expect(igdbGamesRepository.search('   ')).resolves.toEqual([])
  })

  it('lanza invalidResponse si el payload no cumple el esquema', async () => {
    server.use(http.get(`${BASE}/games`, () => HttpResponse.json({ nope: true })))

    await expect(igdbGamesRepository.search('x')).rejects.toMatchObject({
      kind: 'invalidResponse',
    })
  })

  it('lanza rateLimited ante 429', async () => {
    server.use(http.get(`${BASE}/games`, () => new HttpResponse(null, { status: 429 })))

    await expect(igdbGamesRepository.search('x')).rejects.toMatchObject({ kind: 'rateLimited' })
  })

  it('lanza upstreamError ante 502', async () => {
    server.use(
      http.get(`${BASE}/games`, () =>
        HttpResponse.json({ error: { code: 'upstream_error', message: 'x' } }, { status: 502 }),
      ),
    )

    await expect(igdbGamesRepository.search('x')).rejects.toMatchObject({ kind: 'upstreamError' })
  })

  it('lanza internalError ante 500', async () => {
    server.use(http.get(`${BASE}/games`, () => new HttpResponse(null, { status: 500 })))

    await expect(igdbGamesRepository.search('x')).rejects.toMatchObject({ kind: 'internalError' })
  })

  it('lanza network si falla la red', async () => {
    server.use(http.get(`${BASE}/games`, () => HttpResponse.error()))

    await expect(igdbGamesRepository.search('x')).rejects.toMatchObject({ kind: 'network' })
  })

  it('propaga la cancelación como AbortError', async () => {
    server.use(
      http.get(`${BASE}/games`, async () => {
        await delay(1000)
        return HttpResponse.json({ results: [sampleGame] })
      }),
    )

    const controller = new AbortController()
    const promise = igdbGamesRepository.search('witcher', controller.signal)
    controller.abort()

    await expect(promise).rejects.toMatchObject({ name: 'AbortError' })
  })
})

describe('igdbGamesRepository.getById', () => {
  it('consulta la Edge Function y devuelve un Game', async () => {
    server.use(http.get(`${BASE}/games/:gameId`, () => HttpResponse.json(sampleGame)))

    const game = await igdbGamesRepository.getById(1942)

    expect(game?.externalId).toBe(1942)
    expect(game?.platforms).toEqual([{ id: 6, name: 'PC (Microsoft Windows)' }])
  })

  it('devuelve undefined ante 404', async () => {
    server.use(http.get(`${BASE}/games/:gameId`, () => new HttpResponse(null, { status: 404 })))

    await expect(igdbGamesRepository.getById(999)).resolves.toBeUndefined()
  })

  it('lanza invalidResponse si el payload no cumple el esquema', async () => {
    server.use(http.get(`${BASE}/games/:gameId`, () => HttpResponse.json({ id: 'x' })))

    await expect(igdbGamesRepository.getById(1942)).rejects.toMatchObject({
      kind: 'invalidResponse',
    })
  })

  it('lanza timeout ante 504', async () => {
    server.use(http.get(`${BASE}/games/:gameId`, () => new HttpResponse(null, { status: 504 })))

    await expect(igdbGamesRepository.getById(1942)).rejects.toMatchObject({ kind: 'timeout' })
  })

  it('lanza unauthorized ante 401', async () => {
    server.use(http.get(`${BASE}/games/:gameId`, () => new HttpResponse(null, { status: 401 })))

    await expect(igdbGamesRepository.getById(1942)).rejects.toMatchObject({ kind: 'unauthorized' })
  })
})

describe('igdbGamesRepository.getByIds', () => {
  it('pide los juegos en una sola llamada, sin ids duplicados', async () => {
    let requestedIds: string | null = null
    server.use(
      http.get(`${BASE}/games`, ({ request }) => {
        requestedIds = new URL(request.url).searchParams.get('ids')
        return HttpResponse.json({ results: [sampleGame] })
      }),
    )

    const games = await igdbGamesRepository.getByIds([1942, 7346, 1942])

    expect(requestedIds).toBe('1942,7346')
    expect(games.map((game) => game.externalId)).toEqual([1942])
  })

  it('devuelve [] sin llamar a la red cuando no hay ids', async () => {
    await expect(igdbGamesRepository.getByIds([])).resolves.toEqual([])
  })

  it('lanza invalidResponse si el payload no cumple el esquema', async () => {
    server.use(http.get(`${BASE}/games`, () => HttpResponse.json({ nope: true })))

    await expect(igdbGamesRepository.getByIds([1942])).rejects.toMatchObject({
      kind: 'invalidResponse',
    })
  })
})
