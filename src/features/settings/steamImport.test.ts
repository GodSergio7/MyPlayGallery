import { describe, expect, it } from 'vitest'
import type { SteamOwnedGame } from '@/data/supabase/connectionsRepository'
import type { LibraryEntry } from '@/shared/types/domain'
import { buildImportPlan, hasAllAchievements, minutesToHours, proposeStatus } from './steamImport'

const NOW = Date.parse('2026-10-09T12:00:00Z')
const daysAgo = (days: number) => new Date(NOW - days * 24 * 60 * 60 * 1000).toISOString()

function steam(partial: Partial<SteamOwnedGame> & Pick<SteamOwnedGame, 'appId'>): SteamOwnedGame {
  return {
    name: `Juego ${partial.appId}`,
    minutes: 0,
    lastPlayedAt: null,
    igdbId: partial.appId,
    achievements: null,
    ...partial,
  }
}

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

describe('minutesToHours', () => {
  it('redondea a una décima', () => {
    expect(minutesToHours(0)).toBe(0)
    expect(minutesToHours(90)).toBe(1.5)
    expect(minutesToHours(125)).toBe(2.1)
  })
})

describe('hasAllAchievements', () => {
  it('solo con todos los logros de un juego que tiene logros', () => {
    expect(hasAllAchievements({ unlocked: 50, total: 50 })).toBe(true)
    expect(hasAllAchievements({ unlocked: 49, total: 50 })).toBe(false)
    expect(hasAllAchievements(null)).toBe(false)
  })
})

describe('proposeStatus', () => {
  it('sin abrir → Pendiente', () => {
    expect(proposeStatus({ minutes: 0, lastPlayedAt: null, achievements: null }, NOW)).toBe('pending')
  })

  it('todos los logros → Completado, aunque lo jugaras ayer', () => {
    expect(
      proposeStatus({ minutes: 3000, lastPlayedAt: daysAgo(1), achievements: { unlocked: 40, total: 40 } }, NOW),
    ).toBe('completed')
  })

  it('jugado hace poco sin todos los logros → Jugando', () => {
    expect(
      proposeStatus({ minutes: 600, lastPlayedAt: daysAgo(3), achievements: { unlocked: 10, total: 40 } }, NOW),
    ).toBe('playing')
  })

  it('sin todos los logros y sin tocar desde hace tiempo → Abandonado, aunque tenga muchas horas', () => {
    expect(
      proposeStatus({ minutes: 6000, lastPlayedAt: daysAgo(200), achievements: { unlocked: 39, total: 40 } }, NOW),
    ).toBe('abandoned')
  })

  it('un juego sin logros nunca se propone como Completado', () => {
    expect(proposeStatus({ minutes: 6000, lastPlayedAt: daysAgo(200), achievements: null }, NOW)).toBe('abandoned')
  })
})

describe('buildImportPlan', () => {
  it('separa nuevos, actualizaciones, al día y sin ficha', () => {
    const plan = buildImportPlan(
      [
        steam({ appId: 1, minutes: 600 }),
        steam({ appId: 2, minutes: 3000 }),
        steam({ appId: 3, minutes: 60 }),
        steam({ appId: 4, name: 'Herramienta de Steam', igdbId: null }),
      ],
      [entry({ id: 'e2', externalId: 2, hoursPlayed: 20 }), entry({ id: 'e3', externalId: 3, hoursPlayed: 5 })],
      NOW,
    )

    expect(plan.total).toBe(4)
    expect(plan.newGames.map((game) => game.igdbId)).toEqual([1])
    expect(plan.updates).toEqual([
      { entryId: 'e2', igdbId: 2, steamName: 'Juego 2', currentHours: 20, steamHours: 50, completeAll: false },
    ])
    expect(plan.upToDate).toBe(1)
    expect(plan.unmatched).toEqual(['Herramienta de Steam'])
  })

  it('un juego nuevo con todos los logros entra como Completado y al 100%', () => {
    const plan = buildImportPlan(
      [steam({ appId: 1, minutes: 900, lastPlayedAt: daysAgo(90), achievements: { unlocked: 30, total: 30 } })],
      [],
      NOW,
    )

    expect(plan.newGames[0]).toMatchObject({ status: 'completed', hundredPercent: true })
  })

  it('marca al 100% un juego que ya tienes si en Steam has conseguido todos los logros', () => {
    const plan = buildImportPlan(
      [steam({ appId: 1, minutes: 600, achievements: { unlocked: 12, total: 12 } })],
      [entry({ id: 'e1', externalId: 1, hoursPlayed: 10 })],
      NOW,
    )

    expect(plan.updates).toEqual([
      { entryId: 'e1', igdbId: 1, steamName: 'Juego 1', currentHours: 10, steamHours: null, completeAll: true },
    ])
  })

  it('no vuelve a proponer el 100% si ya está marcado', () => {
    const plan = buildImportPlan(
      [steam({ appId: 1, minutes: 600, achievements: { unlocked: 12, total: 12 } })],
      [entry({ id: 'e1', externalId: 1, hoursPlayed: 10, hundredPercent: true })],
      NOW,
    )

    expect(plan.updates).toEqual([])
    expect(plan.upToDate).toBe(1)
  })

  it('un juego que ya tienes en otra plataforma se añade como nuevo en PC', () => {
    const plan = buildImportPlan(
      [steam({ appId: 1, minutes: 60 })],
      [entry({ id: 'ps5', externalId: 1, platformId: 167, platformName: 'PlayStation 5' })],
      NOW,
    )

    expect(plan.newGames).toHaveLength(1)
  })

  it('si dos appid son el mismo juego, se queda el más jugado', () => {
    const plan = buildImportPlan(
      [steam({ appId: 10, igdbId: 7, minutes: 30 }), steam({ appId: 11, igdbId: 7, minutes: 900 })],
      [],
      NOW,
    )

    expect(plan.newGames).toHaveLength(1)
    expect(plan.newGames[0].hours).toBe(15)
  })

  it('ordena los nuevos por horas jugadas', () => {
    const plan = buildImportPlan(
      [steam({ appId: 1, minutes: 10 }), steam({ appId: 2, minutes: 500 }), steam({ appId: 3, minutes: 0 })],
      [],
      NOW,
    )

    expect(plan.newGames.map((game) => game.igdbId)).toEqual([2, 1, 3])
  })
})
