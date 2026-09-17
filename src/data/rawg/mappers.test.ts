import { describe, expect, it } from 'vitest'
import { mapRawgGame, mapRawgGameList, mapRawgGamePlatform } from './mappers'
import type { RawgGame } from './schemas'

const rawgGame: RawgGame = {
  id: 4200,
  name: 'The Witcher 3: Wild Hunt',
  released: '2015-05-18',
  background_image: 'https://media.rawg.io/media/games/witcher.jpg',
  genres: [{ name: 'RPG' }, { name: 'Action' }],
  platforms: [
    { platform: { id: 4, name: 'PC' } },
    { platform: { id: 187, name: 'PlayStation 5' } },
  ],
}

describe('mapRawgGame', () => {
  it('transforma RawgGame en Game', () => {
    expect(mapRawgGame(rawgGame)).toEqual({
      rawgId: 4200,
      title: 'The Witcher 3: Wild Hunt',
      coverUrl: 'https://media.rawg.io/media/games/witcher.jpg',
      released: '2015-05-18',
      genres: ['RPG', 'Action'],
      platforms: [
        { id: 4, name: 'PC' },
        { id: 187, name: 'PlayStation 5' },
      ],
    })
  })

  it('normaliza valores nulos y arrays vacíos', () => {
    const game = mapRawgGame({
      id: 1,
      name: 'Juego sin datos',
      released: null,
      background_image: null,
      genres: [],
      platforms: [],
    })

    expect(game.coverUrl).toBe(null)
    expect(game.released).toBe(null)
    expect(game.genres).toEqual([])
    expect(game.platforms).toEqual([])
  })

  it('mapea una plataforma suelta', () => {
    expect(mapRawgGamePlatform({ platform: { id: 7, name: 'Nintendo Switch' } })).toEqual({
      id: 7,
      name: 'Nintendo Switch',
    })
  })
})

describe('mapRawgGameList', () => {
  it('mapea la lista completa', () => {
    const games = mapRawgGameList({ results: [rawgGame] })

    expect(games).toHaveLength(1)
    expect(games[0].rawgId).toBe(4200)
  })

  it('mapea una lista vacía', () => {
    expect(mapRawgGameList({ results: [] })).toEqual([])
  })
})
