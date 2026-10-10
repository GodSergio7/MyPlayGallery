// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { gamesRepository, libraryRepository } from '@/data/repository'
import { DataError } from '@/data/errors'
import type { Game, LibraryEntry } from '@/shared/types/domain'
import { renderWithProviders } from '@/test/renderWithProviders'
import { EntryDetailPage } from './EntryDetailPage'

const base: Omit<LibraryEntry, 'id' | 'platformId' | 'platformName' | 'hoursPlayed'> = {
  externalId: 1942,
  status: 'playing',
  score: null,
  platinum: false,
  hundredPercent: false,
  startedOn: null,
  finishedOn: null,
  review: null,
  notes: null,
  createdAt: '2026-10-01T10:00:00Z',
  updatedAt: '2026-10-01T10:00:00Z',
}
const pc: LibraryEntry = { ...base, id: 'pc', platformId: 6, platformName: 'PC (Microsoft Windows)', hoursPlayed: 10 }
const ps5: LibraryEntry = { ...base, id: 'ps5', platformId: 167, platformName: 'PlayStation 5', hoursPlayed: 50 }

const game: Game = {
  externalId: 1942,
  title: 'The Witcher 3: Wild Hunt',
  coverUrl: null,
  released: '2015-05-18',
  rating: 93,
  genres: [],
  platforms: [
    { id: 6, name: 'PC (Microsoft Windows)' },
    { id: 167, name: 'PlayStation 5' },
  ],
}

function renderAt(path: string) {
  return renderWithProviders(<EntryDetailPage />, { path, pattern: '/library/:entryId' })
}

function mockLibrary() {
  vi.spyOn(libraryRepository, 'getById').mockImplementation(async (id) => [pc, ps5].find((entry) => entry.id === id))
  vi.spyOn(libraryRepository, 'listByGame').mockResolvedValue([pc, ps5])
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('EntryDetailPage', () => {
  it('al pasar a otra entrada sin guardar, no arrastra el formulario de la anterior (T-02)', async () => {
    mockLibrary()
    vi.spyOn(gamesRepository, 'getById').mockResolvedValue(game)
    const update = vi.spyOn(libraryRepository, 'update').mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderAt('/library/pc')

    await user.click(await screen.findByRole('button', { name: /editar/i }))
    const hours = screen.getByLabelText('Horas jugadas')
    await user.clear(hours)
    await user.type(hours, '999')

    // "También lo tienes en": pasa a la entrada de PS5 sin guardar
    await user.click(screen.getByRole('link', { name: /playstation 5/i }))

    expect(await screen.findByText('50 h')).toBeTruthy()
    expect(screen.queryByLabelText('Horas jugadas')).toBeNull()
    expect(screen.getByRole('button', { name: /editar/i })).toBeTruthy()
    expect(update).not.toHaveBeenCalled()
  })

  it('si IGDB falla, la entrada se ve con "Juego desconocido", un aviso y se puede editar (T-03)', async () => {
    mockLibrary()
    vi.spyOn(gamesRepository, 'getById').mockRejectedValue(new DataError('upstreamError'))
    const update = vi.spyOn(libraryRepository, 'update').mockResolvedValue(pc)
    const user = userEvent.setup()
    renderAt('/library/pc')

    expect(await screen.findByRole('heading', { name: 'Juego desconocido' })).toBeTruthy()
    expect(screen.getByText(/no se ha podido cargar la información del juego/i)).toBeTruthy()

    await user.click(screen.getByRole('button', { name: /editar/i }))
    // La plataforma guardada sigue disponible aunque IGDB no haya respondido
    expect(screen.getByRole('option', { name: 'PC (Microsoft Windows)' })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: /guardar cambios/i }))

    expect(update).toHaveBeenCalledWith(
      'pc',
      expect.objectContaining({ platformId: 6, platformName: 'PC (Microsoft Windows)', externalId: 1942 }),
    )
  })
})
