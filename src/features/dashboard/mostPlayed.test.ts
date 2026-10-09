import { describe, expect, it } from 'vitest'
import type { LibraryEntry } from '@/shared/types/domain'
import { mostPlayed } from './mostPlayed'

function entry(partial: Partial<LibraryEntry> & Pick<LibraryEntry, 'id' | 'externalId'>): LibraryEntry {
  return {
    platformId: 6,
    platformName: 'PC (Microsoft Windows)',
    status: 'playing',
    score: null,
    platinum: false,
    hundredPercent: false,
    hoursPlayed: null,
    startedOn: null,
    finishedOn: null,
    review: null,
    notes: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...partial,
  }
}

describe('mostPlayed', () => {
  it('ordena de más a menos horas y deja fuera los juegos sin horas', () => {
    const result = mostPlayed(
      [
        entry({ id: 'a', externalId: 1, hoursPlayed: 20 }),
        entry({ id: 'b', externalId: 2, hoursPlayed: 120 }),
        entry({ id: 'c', externalId: 3, hoursPlayed: null }),
        entry({ id: 'd', externalId: 4, hoursPlayed: 0 }),
      ],
      10,
    )

    expect(result.map((game) => game.externalId)).toEqual([2, 1])
  })

  it('suma las horas de un juego en varias plataformas y enlaza a la entrada con más horas', () => {
    const [game] = mostPlayed(
      [
        entry({ id: 'pc', externalId: 1, hoursPlayed: 30.25 }),
        entry({ id: 'ps5', externalId: 1, hoursPlayed: 50, platformId: 167, platformName: 'PlayStation 5' }),
      ],
      10,
    )

    expect(game).toEqual({
      externalId: 1,
      entryId: 'ps5',
      platforms: ['PC (Microsoft Windows)', 'PlayStation 5'],
      hours: 80.3,
    })
  })

  it('respeta el límite', () => {
    const entries = Array.from({ length: 15 }, (_, index) =>
      entry({ id: String(index), externalId: index + 1, hoursPlayed: index + 1 }),
    )

    expect(mostPlayed(entries, 10)).toHaveLength(10)
  })
})
