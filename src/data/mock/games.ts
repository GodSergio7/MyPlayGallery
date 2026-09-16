import type { Game, Platform } from '@/shared/types/domain'
import { PLATFORMS } from './platforms'
import { makeCover } from './covers'

function pickPlatforms(...ids: number[]): Platform[] {
  return ids
    .map((id) => PLATFORMS.find((platform) => platform.id === id))
    .filter((platform): platform is Platform => platform !== undefined)
}

interface GameSeed {
  rawgId: number
  title: string
  released: string
  genres: string[]
  platformIds: number[]
}

const SEEDS: GameSeed[] = [
  {
    rawgId: 4200,
    title: 'The Witcher 3: Wild Hunt',
    released: '2015-05-18',
    genres: ['RPG', 'Action', 'Open World'],
    platformIds: [4, 18, 187, 1, 186, 7],
  },
  {
    rawgId: 3498,
    title: 'Grand Theft Auto V',
    released: '2013-09-17',
    genres: ['Action', 'Adventure', 'Open World'],
    platformIds: [4, 18, 187, 1, 186],
  },
  {
    rawgId: 28,
    title: 'Red Dead Redemption 2',
    released: '2018-10-26',
    genres: ['Action', 'Adventure', 'Open World'],
    platformIds: [4, 18, 1],
  },
  {
    rawgId: 58175,
    title: 'God of War',
    released: '2018-04-20',
    genres: ['Action', 'Adventure'],
    platformIds: [4, 18, 187],
  },
  {
    rawgId: 326243,
    title: 'Elden Ring',
    released: '2022-02-25',
    genres: ['RPG', 'Action', 'Souls-like'],
    platformIds: [4, 187, 1, 186],
  },
  {
    rawgId: 9767,
    title: 'Hollow Knight',
    released: '2017-02-24',
    genres: ['Metroidvania', 'Platformer', 'Indie'],
    platformIds: [4, 18, 1, 7],
  },
  {
    rawgId: 41494,
    title: 'Cyberpunk 2077',
    released: '2020-12-10',
    genres: ['RPG', 'Action', 'Open World'],
    platformIds: [4, 187, 1, 186],
  },
  {
    rawgId: 2462,
    title: 'The Legend of Zelda: Breath of the Wild',
    released: '2017-03-03',
    genres: ['Adventure', 'Open World'],
    platformIds: [7],
  },
  {
    rawgId: 452645,
    title: 'Stardew Valley',
    released: '2016-02-26',
    genres: ['Simulation', 'RPG', 'Indie'],
    platformIds: [4, 18, 1, 7],
  },
  {
    rawgId: 16944,
    title: 'The Last of Us Part II',
    released: '2020-06-19',
    genres: ['Action', 'Adventure', 'Survival'],
    platformIds: [18, 187],
  },
  {
    rawgId: 2352,
    title: 'Minecraft',
    released: '2011-11-18',
    genres: ['Sandbox', 'Survival', 'Indie'],
    platformIds: [4, 18, 1, 186, 7],
  },
  {
    rawgId: 4291,
    title: 'Sekiro: Shadows Die Twice',
    released: '2019-03-22',
    genres: ['Action', 'Souls-like'],
    platformIds: [4, 1, 186],
  },
  {
    rawgId: 274755,
    title: 'Hades',
    released: '2020-09-17',
    genres: ['Roguelike', 'Action', 'Indie'],
    platformIds: [4, 7, 1],
  },
]

export const GAMES: Game[] = SEEDS.map((seed, index) => ({
  rawgId: seed.rawgId,
  title: seed.title,
  coverUrl: makeCover(seed.title, index),
  released: seed.released,
  genres: seed.genres,
  platforms: pickPlatforms(...seed.platformIds),
}))
