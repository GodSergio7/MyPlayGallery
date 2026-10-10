// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { importWithRetry } from './lazyNamed'

afterEach(() => {
  window.sessionStorage.clear()
  vi.restoreAllMocks()
})

describe('importWithRetry', () => {
  it('si la primera carga falla, la reintenta', async () => {
    const loader = vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce({ ok: true })

    await expect(importWithRetry(loader)).resolves.toEqual({ ok: true })
    expect(loader).toHaveBeenCalledTimes(2)
  })

  it('si sigue fallando, recarga la página una sola vez (p. ej. tras publicar una versión nueva)', async () => {
    const reload = vi.fn()
    vi.spyOn(window, 'location', 'get').mockReturnValue({ ...window.location, reload } as Location)
    const loader = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))

    void importWithRetry(loader)
    await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(1))

    // Tras la recarga, si vuelve a fallar ya no recarga más: deja ver el error
    await expect(importWithRetry(loader)).rejects.toThrow('Failed to fetch')
    expect(reload).toHaveBeenCalledTimes(1)
  })
})
