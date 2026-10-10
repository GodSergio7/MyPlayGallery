import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { HttpResponse, http } from 'msw'
import { setupServer } from 'msw/node'
import { DataError } from '@/data/errors'
import { createEntry, getEntry, listEntries, updateEntryFromSteam } from './libraryRepository'

const REST = 'http://localhost:54321/rest/v1/library_entries'

const row = {
  id: '6f1c2b1e-0000-4000-8000-000000000001',
  external_id: 1942,
  platform_id: 6,
  platform_name: 'PC (Microsoft Windows)',
  status: 'playing',
  score: '9.5', // Postgres devuelve numeric como texto
  platinum: false,
  hundred_percent: true,
  hours_played: '120.5',
  started_on: '2026-03-01',
  finished_on: null,
  review: null,
  notes: 'Pendiente el DLC',
  created_at: '2026-10-01T10:00:00Z',
  updated_at: '2026-10-08T10:00:00Z',
}

const server = setupServer()

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('libraryRepository (Supabase)', () => {
  it('lista las entradas y convierte las filas al dominio', async () => {
    server.use(http.get(REST, () => HttpResponse.json([row])))

    const [entry] = await listEntries()

    expect(entry).toEqual({
      id: row.id,
      externalId: 1942,
      platformId: 6,
      platformName: 'PC (Microsoft Windows)',
      status: 'playing',
      score: 9.5,
      platinum: false,
      hundredPercent: true,
      hoursPlayed: 120.5,
      startedOn: '2026-03-01',
      finishedOn: null,
      review: null,
      notes: 'Pendiente el DLC',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })
  })

  it('una respuesta con forma inesperada es un error de datos, no un fallo silencioso', async () => {
    server.use(http.get(REST, () => HttpResponse.json([{ id: 1 }])))

    await expect(listEntries()).rejects.toMatchObject({ kind: 'invalidResponse' })
  })

  it('un id que no es uuid equivale a "no existe"', async () => {
    server.use(
      http.get(REST, () => HttpResponse.json({ code: '22P02', message: 'invalid input syntax for type uuid' }, { status: 400 })),
    )

    await expect(getEntry('no-es-un-uuid')).resolves.toBeUndefined()
  })

  it('el mismo juego en la misma plataforma da un mensaje claro', async () => {
    server.use(http.post(REST, () => HttpResponse.json({ code: '23505', message: 'duplicate key' }, { status: 409 })))

    const promise = createEntry({
      externalId: 1942,
      platformId: 6,
      platformName: 'PC (Microsoft Windows)',
      status: 'pending',
      score: null,
      platinum: false,
      hundredPercent: false,
      hoursPlayed: null,
      startedOn: null,
      finishedOn: null,
      review: null,
      notes: null,
    })

    await expect(promise).rejects.toBeInstanceOf(DataError)
    await expect(promise).rejects.toThrow('Ya tienes este juego en esa plataforma.')
  })

  it('la sincronización con Steam solo envía los campos que cambian', async () => {
    let body: unknown = null
    server.use(
      http.patch(REST, async ({ request }) => {
        body = await request.json()
        return new HttpResponse(null, { status: 204 })
      }),
    )

    await updateEntryFromSteam(row.id, { hundredPercent: true, status: 'completed' })

    expect(body).toEqual({ hundred_percent: true, status: 'completed' })
  })
})
