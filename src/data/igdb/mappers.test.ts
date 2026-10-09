import { describe, expect, it } from 'vitest'
import {
  mapIgdbBrowsePage,
  mapIgdbCoverUrl,
  mapIgdbGame,
  mapIgdbGameList,
  mapIgdbPlatform,
} from './mappers'
import type { IgdbGame } from './schemas'

const igdbGame: IgdbGame = {
  id: 1942,
  name: 'The Witcher 3: Wild Hunt',
  first_release_date: 1431907200,
  total_rating: 92.6,
  cover: { url: '//images.igdb.com/igdb/image/upload/t_thumb/hash.jpg' },
  genres: [{ name: 'RPG' }, { name: 'Adventure' }],
  platforms: [
    { id: 6, name: 'PC (Microsoft Windows)' },
    { id: 167, name: 'PlayStation 5' },
  ],
}

describe('mapIgdbGame', () => {
  it('transforma IgdbGame en Game', () => {
    expect(mapIgdbGame(igdbGame)).toEqual({
      externalId: 1942,
      title: 'The Witcher 3: Wild Hunt',
      coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/hash.jpg',
      released: '2015-05-18',
      rating: 93,
      genres: ['RPG', 'Adventure'],
      platforms: [
        { id: 6, name: 'PC (Microsoft Windows)' },
        { id: 167, name: 'PlayStation 5' },
      ],
    })
  })

  it('normaliza valores nulos y arrays vacíos', () => {
    const game = mapIgdbGame({
      id: 1,
      name: 'Juego sin datos',
      first_release_date: null,
      total_rating: null,
      cover: null,
      genres: [],
      platforms: [],
    })

    expect(game.coverUrl).toBe(null)
    expect(game.released).toBe(null)
    expect(game.rating).toBe(null)
    expect(game.genres).toEqual([])
    expect(game.platforms).toEqual([])
  })

  it('mapea una plataforma suelta', () => {
    expect(mapIgdbPlatform({ id: 130, name: 'Nintendo Switch' })).toEqual({
      id: 130,
      name: 'Nintendo Switch',
    })
  })
})

describe('mapIgdbCoverUrl', () => {
  it('convierte la URL relativa y sube el tamaño de portada', () => {
    expect(
      mapIgdbCoverUrl({ url: '//images.igdb.com/igdb/image/upload/t_thumb/hash.jpg' }),
    ).toBe('https://images.igdb.com/igdb/image/upload/t_cover_big/hash.jpg')
  })

  it('mantiene las URLs absolutas sin el modificador de tamaño por defecto', () => {
    expect(mapIgdbCoverUrl({ url: 'https://images.igdb.com/igdb/image/upload/custom.jpg' })).toBe(
      'https://images.igdb.com/igdb/image/upload/custom.jpg',
    )
  })

  it('devuelve null sin portada', () => {
    expect(mapIgdbCoverUrl(null)).toBe(null)
  })
})

describe('mapIgdbGameList', () => {
  it('mapea la lista completa', () => {
    const games = mapIgdbGameList({ results: [igdbGame] })

    expect(games).toHaveLength(1)
    expect(games[0].externalId).toBe(1942)
  })

  it('mapea una lista vacía', () => {
    expect(mapIgdbGameList({ results: [] })).toEqual([])
  })
})

describe('mapIgdbBrowsePage', () => {
  it('transforma una página de exploración', () => {
    const page = mapIgdbBrowsePage({ results: [igdbGame], has_more: true, total: 270873 })

    expect(page.hasMore).toBe(true)
    expect(page.total).toBe(270873)
    expect(page.games.map((game) => game.title)).toEqual(['The Witcher 3: Wild Hunt'])
  })
})
