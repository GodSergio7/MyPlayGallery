import { describe, expect, it } from 'vitest'
import { igdbImageUrl, mapIgdbFullGame } from './mappers'
import { IgdbFullGameSchema } from './schemas'

const raw = {
  id: 119133,
  name: 'Elden Ring',
  summary: 'An action RPG.',
  storyline: null,
  first_release_date: 1645747200,
  total_rating: 95.15,
  total_rating_count: 2320,
  aggregated_rating: 96.9,
  aggregated_rating_count: 10,
  rating: null,
  rating_count: null,
  cover: { url: '//images.igdb.com/igdb/image/upload/t_thumb/co4jni.jpg' },
  screenshots: [{ url: '//images.igdb.com/igdb/image/upload/t_thumb/scagdo.jpg' }],
  artworks: [{ url: '//images.igdb.com/igdb/image/upload/t_thumb/ar3m1o.jpg' }],
  videos: [{ video_id: 'D1mDo1CEMuE', name: 'Trailer' }],
  genres: [{ id: 12, name: 'Role-playing (RPG)' }],
  themes: [{ id: 17, name: 'Fantasy' }],
  game_modes: [{ id: 1, name: 'Single player' }],
  player_perspectives: [{ id: 2, name: 'Third person' }],
  platforms: [{ id: 167, name: 'PlayStation 5' }],
  developers: ['FromSoftware'],
  publishers: ['Bandai Namco Entertainment'],
  franchises: ['Elden Ring'],
  engines: [],
  similar_games: [
    { id: 2155, name: 'Dark Souls', cover: null, total_rating: 88.6, first_release_date: 1316736000 },
  ],
  websites: [{ url: 'https://store.steampowered.com/app/1245620', type: 13 }],
  pegi: '16',
  release_dates: [{ platform: 'PlayStation 5', date: 1645747200 }],
  time_to_beat: { hastily: 166400, normally: 428000, completely: 628294, count: 27 },
}

describe('igdbImageUrl', () => {
  it('hace la URL absoluta y cambia el tamaño', () => {
    expect(igdbImageUrl('//images.igdb.com/igdb/image/upload/t_thumb/abc.jpg', 't_1080p')).toBe(
      'https://images.igdb.com/igdb/image/upload/t_1080p/abc.jpg',
    )
  })
})

describe('mapIgdbFullGame', () => {
  it('valida y transforma la ficha completa', () => {
    const parsed = IgdbFullGameSchema.parse(raw)
    const game = mapIgdbFullGame(parsed)

    expect(game.title).toBe('Elden Ring')
    expect(game.released).toBe('2022-02-25')
    expect(game.coverUrl).toContain('/t_cover_big_2x/co4jni.jpg')
    // La captura tiene prioridad sobre el artwork como fondo de la cabecera.
    expect(game.heroImageUrl).toContain('/t_1080p/scagdo.jpg')
    expect(game.scores).toEqual({
      total: { value: 95, count: 2320 },
      critics: { value: 97, count: 10 },
      users: null,
    })
    expect(game.screenshots[0]).toEqual({
      thumbUrl: expect.stringContaining('/t_screenshot_med/'),
      fullUrl: expect.stringContaining('/t_1080p/'),
    })
    expect(game.videos).toEqual([{ youtubeId: 'D1mDo1CEMuE', name: 'Trailer' }])
    expect(game.similarGames).toEqual([
      { externalId: 2155, title: 'Dark Souls', coverUrl: null, rating: 89, released: '2011-09-23' },
    ])
    expect(game.releaseDates).toEqual([{ platform: 'PlayStation 5', date: '2022-02-25' }])
    // Segundos → horas redondeadas.
    expect(game.timeToBeat).toEqual({ main: 46, extra: 119, completionist: 175 })
  })

  it('sin capturas usa el artwork y sin duración devuelve null', () => {
    const game = mapIgdbFullGame(IgdbFullGameSchema.parse({ ...raw, screenshots: [], time_to_beat: null }))

    expect(game.heroImageUrl).toContain('/t_1080p/ar3m1o.jpg')
    expect(game.timeToBeat).toBe(null)
  })

  it('rechaza una respuesta incompleta', () => {
    expect(IgdbFullGameSchema.safeParse({ id: 1, name: 'x' }).success).toBe(false)
  })
})
