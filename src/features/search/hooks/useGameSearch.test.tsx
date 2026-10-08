// @vitest-environment jsdom
import type { ReactNode } from 'react'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HttpResponse, delay, http } from 'msw'
import { setupServer } from 'msw/node'
import { gamesRepository } from '@/data/repository'
import { useGameSearch } from './useGameSearch'

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

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useGameSearch', () => {
  it('no realiza petición si la consulta está vacía', () => {
    const spy = vi.spyOn(gamesRepository, 'search')

    renderHook(() => useGameSearch('   '), { wrapper: createWrapper() })

    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('llama a gamesRepository.search y devuelve Game[]', async () => {
    server.use(http.get(`${BASE}/games`, () => HttpResponse.json({ results: [sampleGame] })))
    const spy = vi.spyOn(gamesRepository, 'search')

    const { result } = renderHook(() => useGameSearch('witcher'), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.games).toHaveLength(1))
    expect(spy).toHaveBeenCalledWith('witcher', expect.anything())
    expect(result.current.games[0].externalId).toBe(1942)
    expect(result.current.isError).toBe(false)
    spy.mockRestore()
  })

  it('pasa el AbortSignal de TanStack Query al repository', async () => {
    server.use(http.get(`${BASE}/games`, () => HttpResponse.json({ results: [] })))
    const spy = vi.spyOn(gamesRepository, 'search')

    const { result } = renderHook(() => useGameSearch('zelda'), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(spy.mock.calls[0]?.[1]).toBeInstanceOf(AbortSignal)
    spy.mockRestore()
  })

  it('cancelar una búsqueda no expone error', async () => {
    server.use(
      http.get(`${BASE}/games`, async ({ request }) => {
        const search = new URL(request.url).searchParams.get('search')
        if (search === 'aaa') {
          await delay(3000)
          return HttpResponse.json({ results: [sampleGame] })
        }
        return HttpResponse.json({ results: [] })
      }),
    )

    const { result, rerender } = renderHook(
      (props: { query: string }) => useGameSearch(props.query),
      { wrapper: createWrapper(), initialProps: { query: 'aaa' } },
    )

    rerender({ query: 'bbb' })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.isError).toBe(false)
    expect(result.current.games).toEqual([])
  })
})
