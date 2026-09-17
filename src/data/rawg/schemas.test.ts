import { describe, expect, it } from 'vitest'
import { RawgGameListResponseSchema, RawgGameSchema } from './schemas'

const fullGame = {
  id: 4200,
  name: 'The Witcher 3: Wild Hunt',
  released: '2015-05-18',
  background_image: 'https://media.rawg.io/media/games/witcher.jpg',
  genres: [{ id: 5, name: 'RPG' }, { name: 'Action' }],
  platforms: [{ platform: { id: 4, name: 'PC' } }],
}

function omitField(input: Record<string, unknown>, field: string): Record<string, unknown> {
  const copy: Record<string, unknown> = { ...input }
  delete copy[field]
  return copy
}

describe('RawgGameSchema', () => {
  it('valida un payload completo y descarta campos no declarados', () => {
    const result = RawgGameSchema.safeParse(fullGame)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.id).toBe(4200)
      expect(result.data.genres).toEqual([{ name: 'RPG' }, { name: 'Action' }])
      expect(result.data.platforms).toEqual([{ platform: { id: 4, name: 'PC' } }])
    }
  })

  it('usa [] cuando genres está ausente', () => {
    const result = RawgGameSchema.safeParse(omitField(fullGame, 'genres'))

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.genres).toEqual([])
    }
  })

  it('usa [] cuando platforms está ausente', () => {
    const result = RawgGameSchema.safeParse(omitField(fullGame, 'platforms'))

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.platforms).toEqual([])
    }
  })

  it('normaliza released null o ausente a null', () => {
    const withNull = RawgGameSchema.safeParse({ ...fullGame, released: null })
    const without = RawgGameSchema.safeParse(omitField(fullGame, 'released'))

    expect(withNull.success && withNull.data.released).toBe(null)
    expect(without.success && without.data.released).toBe(null)
  })

  it('normaliza background_image null o ausente a null', () => {
    const withNull = RawgGameSchema.safeParse({ ...fullGame, background_image: null })
    const without = RawgGameSchema.safeParse(omitField(fullGame, 'background_image'))

    expect(withNull.success && withNull.data.background_image).toBe(null)
    expect(without.success && without.data.background_image).toBe(null)
  })

  it('rechaza un payload inválido', () => {
    expect(RawgGameSchema.safeParse({ id: 'no-es-numero', name: 123 }).success).toBe(false)
    expect(RawgGameSchema.safeParse(null).success).toBe(false)
  })
})

describe('RawgGameListResponseSchema', () => {
  it('valida una respuesta de búsqueda', () => {
    const result = RawgGameListResponseSchema.safeParse({ results: [fullGame] })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.results).toHaveLength(1)
    }
  })

  it('acepta una lista vacía', () => {
    const result = RawgGameListResponseSchema.safeParse({ results: [] })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.results).toEqual([])
    }
  })

  it('rechaza una respuesta sin results', () => {
    expect(RawgGameListResponseSchema.safeParse({}).success).toBe(false)
  })

  it('rechaza una respuesta con resultados inválidos', () => {
    expect(RawgGameListResponseSchema.safeParse({ results: [{ id: 'x' }] }).success).toBe(false)
  })
})
