import type { ReactElement } from 'react'
import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

/**
 * Monta un elemento con TanStack Query (sin reintentos ni caché compartida entre tests)
 * y el router en la ruta indicada. `pattern` es la ruta con parámetros, p. ej. '/library/:entryId'.
 */
export function renderWithProviders(element: ReactElement, { path = '/', pattern = '*' } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={pattern} element={element} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
