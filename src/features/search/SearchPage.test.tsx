// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HttpResponse, delay, http } from 'msw'
import { setupServer } from 'msw/node'
import { SearchPage } from './SearchPage'

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
afterEach(() => {
  cleanup()
  server.resetHandlers()
})
afterAll(() => server.close())

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <SearchPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('SearchPage', () => {
  it('muestra el estado inicial', () => {
    renderPage()

    expect(screen.getByText('Escribe el nombre de un juego')).toBeDefined()
  })

  it('no realiza petición con una consulta vacía', async () => {
    let requests = 0
    server.use(
      http.get(`${BASE}/games`, () => {
        requests += 1
        return HttpResponse.json({ results: [] })
      }),
    )

    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByRole('searchbox'), '   ')
    await new Promise((resolve) => setTimeout(resolve, 500))

    expect(requests).toBe(0)
    expect(screen.getByText('Escribe el nombre de un juego')).toBeDefined()
  })

  it('muestra los resultados de IGDB', async () => {
    server.use(http.get(`${BASE}/games`, () => HttpResponse.json({ results: [sampleGame] })))

    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByRole('searchbox'), 'witcher')

    expect(await screen.findByText('The Witcher 3: Wild Hunt', {}, { timeout: 3000 })).toBeDefined()
  })

  it('muestra el estado de carga', async () => {
    server.use(
      http.get(`${BASE}/games`, async () => {
        await delay(400)
        return HttpResponse.json({ results: [sampleGame] })
      }),
    )

    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByRole('searchbox'), 'witcher')

    expect(
      await screen.findByLabelText('Cargando', {}, { timeout: 3000 }),
    ).toBeDefined()
    await screen.findByText('The Witcher 3: Wild Hunt', {}, { timeout: 3000 })
  })

  it('muestra el estado sin resultados', async () => {
    server.use(http.get(`${BASE}/games`, () => HttpResponse.json({ results: [] })))

    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByRole('searchbox'), 'zzzz')

    expect(await screen.findByText('Sin resultados', {}, { timeout: 3000 })).toBeDefined()
  })

  it('muestra el error y permite reintentar', async () => {
    let calls = 0
    server.use(
      http.get(`${BASE}/games`, () => {
        calls += 1
        if (calls === 1) {
          return new HttpResponse(null, { status: 500 })
        }
        return HttpResponse.json({ results: [sampleGame] })
      }),
    )

    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByRole('searchbox'), 'witcher')

    expect(
      await screen.findByText('No se ha podido cargar', {}, { timeout: 3000 }),
    ).toBeDefined()

    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByText('The Witcher 3: Wild Hunt', {}, { timeout: 3000 })).toBeDefined()
  })

  it('al cambiar la búsqueda usa la nueva consulta', async () => {
    server.use(
      http.get(`${BASE}/games`, ({ request }) => {
        const search = new URL(request.url).searchParams.get('search')
        if (search === 'witcher') {
          return HttpResponse.json({ results: [sampleGame] })
        }
        return HttpResponse.json({ results: [{ ...sampleGame, id: 101, name: 'Mario' }] })
      }),
    )

    const user = userEvent.setup()
    renderPage()
    const input = screen.getByRole('searchbox')

    await user.type(input, 'witcher')
    await screen.findByText('The Witcher 3: Wild Hunt', {}, { timeout: 3000 })

    await user.clear(input)
    await user.type(input, 'mario')

    expect(await screen.findByText('Mario', {}, { timeout: 3000 })).toBeDefined()
  })
})
