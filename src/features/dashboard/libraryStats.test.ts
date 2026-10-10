import { describe, expect, it } from 'vitest'
import type { LibraryEntry } from '@/shared/types/domain'
import { libraryStats } from './libraryStats'

function entry(partial: Partial<LibraryEntry>): LibraryEntry {
  return {
    id: Math.random().toString(36),
    externalId: 1,
    platformId: 6,
    platformName: 'PC (Microsoft Windows)',
    status: 'pending',
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

describe('libraryStats', () => {
  it('biblioteca vacía', () => {
    const stats = libraryStats([])
    expect(stats).toMatchObject({ total: 0, totalHours: 0, averageScore: null, scoredCount: 0 })
    expect(stats.statusCounts.every((status) => status.count === 0)).toBe(true)
  })

  it('suma horas, hace la media solo de las entradas con nota y cuenta logros y estados', () => {
    const stats = libraryStats([
      entry({ status: 'playing', score: 9, hoursPlayed: 10.25, platinum: true }),
      entry({ status: 'completed', score: 8, hoursPlayed: 20, hundredPercent: true }),
      entry({ status: 'completed', hoursPlayed: null }),
      entry({ status: 'abandoned', score: null }),
    ])

    expect(stats).toMatchObject({
      total: 4,
      totalHours: 30.3,
      averageScore: 8.5,
      scoredCount: 2,
      platinumCount: 1,
      hundredCount: 1,
      playingCount: 1,
    })
    expect(Object.fromEntries(stats.statusCounts.map((status) => [status.value, status.count]))).toEqual({
      pending: 0,
      playing: 1,
      completed: 2,
      abandoned: 1,
    })
  })
})
