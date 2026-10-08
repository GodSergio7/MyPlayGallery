import { describe, expect, it } from 'vitest'
import { IgdbGameListResponseSchema, IgdbGameSchema } from './schemas'

const fullGame = {
  id: 1942,
  name: 'The Witcher 3: Wild Hunt',
  first_release_date: 1431907200,
  cover: { url: '//images.igdb.com/igdb/image/upload/t_thumb/hash.jpg' },
  genres: [{ name: 'RPG' }, { name: 'Adventure' }],
  platforms: [{ id: 6, name: 'PC (Microsoft Windows)' }],
}

function omitField(input: Record<string, unknown>, field: string): Record<string, unknown> {
  const copy: Record<string, unknown> = { ...input }
  delete copy[field]
  return copy
}

describe('IgdbGameSchema', () => {
  it('valida un payload completo y descarta campos no declarados', () => {
    const result = IgdbGameSchema.safeParse(fullGame)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.id).toBe(1942)
      expect(result.data.genres).toEqual([{ name: 'RPG' }, { name: 'Adventure' }])
      expect(result.data.platforms).toEqual([{ id: 6, name: 'PC (Microsoft Windows)' }])
      expect(result.data.cover).toEqual({
        url: '//images.igdb.com/igdb/image/upload/t_thumb/hash.jpg',
      })
    }
  })

  it('usa [] cuando genres está ausente', () => {
    const result = IgdbGameSchema.safeParse(omitField(fullGame, 'genres'))

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.genres).toEqual([])
    }
  })

  it('usa [] cuando platforms está ausente', () => {
    const result = IgdbGameSchema.safeParse(omitField(fullGame, 'platforms'))

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.platforms).toEqual([])
    }
  })

  it('normaliza first_release_date null o ausente a null', () => {
    const withNull = IgdbGameSchema.safeParse({ ...fullGame, first_release_date: null })
    const without = IgdbGameSchema.safeParse(omitField(fullGame, 'first_release_date'))

    expect(withNull.success && withNull.data.first_release_date).toBe(null)
    expect(without.success && without.data.first_release_date).toBe(null)
  })

  it('normaliza cover null o ausente a null', () => {
    const withNull = IgdbGameSchema.safeParse({ ...fullGame, cover: null })
    const without = IgdbGameSchema.safeParse(omitField(fullGame, 'cover'))

    expect(withNull.success && withNull.data.cover).toBe(null)
    expect(without.success && without.data.cover).toBe(null)
  })

  it('rechaza un payload inválido', () => {
    expect(IgdbGameSchema.safeParse({ id: 'no-es-numero', name: 123 }).success).toBe(false)
    expect(IgdbGameSchema.safeParse(null).success).toBe(false)
  })
})

describe('IgdbGameListResponseSchema', () => {
  it('valida una respuesta de búsqueda', () => {
    const result = IgdbGameListResponseSchema.safeParse({ results: [fullGame] })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.results).toHaveLength(1)
    }
  })

  it('acepta una lista vacía', () => {
    const result = IgdbGameListResponseSchema.safeParse({ results: [] })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.results).toEqual([])
    }
  })

  it('rechaza una respuesta sin results', () => {
    expect(IgdbGameListResponseSchema.safeParse({}).success).toBe(false)
  })

  it('rechaza una respuesta con resultados inválidos', () => {
    expect(IgdbGameListResponseSchema.safeParse({ results: [{ id: 'x' }] }).success).toBe(false)
  })
})
