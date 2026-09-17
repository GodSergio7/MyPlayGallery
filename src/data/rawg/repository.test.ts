import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { HttpResponse, delay, http } from 'msw'
import { setupServer } from 'msw/node'
import { rawgGamesRepository } from './repository'

const BASE = 'http://localhost:54321/functions/v1/rawg-proxy'

const sampleGame = {
  id: 4200,
  name: 'The Witcher 3: Wild Hunt',
  released: '2015-05-18',
  background_image: 'https://media.rawg.io/media/games/witcher.jpg',
  genres: [{ id: 5, name: 'RPG' }],
  platforms: [{ platform: { id: 4, name: 'PC' } }],
}

const server = setupServer()

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('rawgGamesRepository.search', () => {
  it('consulta la Edge Function y devuelve Game[]', async () => {
    server.use(http.get(`${BASE}/games`, () => HttpResponse.json({ results: [sampleGame] })))

    const games = await rawgGamesRepository.search('witcher')

    expect(games).toEqual([
      {
        rawgId: 4200,
        title: 'The Witcher 3: Wild Hunt',
        coverUrl: 'https://media.rawg.io/media/games/witcher.jpg',
        released: '2015-05-18',
        genres: ['RPG'],
        platforms: [{ id: 4, name: 'PC' }],
      },
    ])
  })

  it('devuelve [] sin llamar a la red cuando el término está vacío', async () => {
    await expect(rawgGamesRepository.search('   ')).resolves.toEqual([])
  })

  it('lanza invalidResponse si el payload no cumple el esquema', async () => {
    server.use(http.get(`${BASE}/games`, () => HttpResponse.json({ nope: true })))

    await expect(rawgGamesRepository.search('x')).rejects.toMatchObject({
      kind: 'invalidResponse',
    })
  })

  it('lanza rateLimited ante 429', async () => {
    server.use(http.get(`${BASE}/games`, () => new HttpResponse(null, { status: 429 })))

    await expect(rawgGamesRepository.search('x')).rejects.toMatchObject({ kind: 'rateLimited' })
  })

  it('lanza upstreamError ante 502', async () => {
    server.use(
      http.get(`${BASE}/games`, () =>
        HttpResponse.json({ error: { code: 'upstream_error', message: 'x' } }, { status: 502 }),
      ),
    )

    await expect(rawgGamesRepository.search('x')).rejects.toMatchObject({ kind: 'upstreamError' })
  })

  it('lanza internalError ante 500', async () => {
    server.use(http.get(`${BASE}/games`, () => new HttpResponse(null, { status: 500 })))

    await expect(rawgGamesRepository.search('x')).rejects.toMatchObject({ kind: 'internalError' })
  })

  it('lanza network si falla la red', async () => {
    server.use(http.get(`${BASE}/games`, () => HttpResponse.error()))

    await expect(rawgGamesRepository.search('x')).rejects.toMatchObject({ kind: 'network' })
  })

  it('propaga la cancelación como AbortError', async () => {
    server.use(
      http.get(`${BASE}/games`, async () => {
        await delay(1000)
        return HttpResponse.json({ results: [sampleGame] })
      }),
    )

    const controller = new AbortController()
    const promise = rawgGamesRepository.search('witcher', controller.signal)
    controller.abort()

    await expect(promise).rejects.toMatchObject({ name: 'AbortError' })
  })
})

describe('rawgGamesRepository.getById', () => {
  it('consulta la Edge Function y devuelve un Game', async () => {
    server.use(http.get(`${BASE}/games/:rawgId`, () => HttpResponse.json(sampleGame)))

    const game = await rawgGamesRepository.getById(4200)

    expect(game?.rawgId).toBe(4200)
    expect(game?.platforms).toEqual([{ id: 4, name: 'PC' }])
  })

  it('devuelve undefined ante 404', async () => {
    server.use(http.get(`${BASE}/games/:rawgId`, () => new HttpResponse(null, { status: 404 })))

    await expect(rawgGamesRepository.getById(999)).resolves.toBeUndefined()
  })

  it('lanza invalidResponse si el payload no cumple el esquema', async () => {
    server.use(http.get(`${BASE}/games/:rawgId`, () => HttpResponse.json({ id: 'x' })))

    await expect(rawgGamesRepository.getById(4200)).rejects.toMatchObject({
      kind: 'invalidResponse',
    })
  })

  it('lanza timeout ante 504', async () => {
    server.use(http.get(`${BASE}/games/:rawgId`, () => new HttpResponse(null, { status: 504 })))

    await expect(rawgGamesRepository.getById(4200)).rejects.toMatchObject({ kind: 'timeout' })
  })

  it('lanza unauthorized ante 401', async () => {
    server.use(http.get(`${BASE}/games/:rawgId`, () => new HttpResponse(null, { status: 401 })))

    await expect(rawgGamesRepository.getById(4200)).rejects.toMatchObject({ kind: 'unauthorized' })
  })
})
