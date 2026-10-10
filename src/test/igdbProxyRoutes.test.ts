import { describe, expect, it } from 'vitest'
import { buildBrowseConditions, parseRoute } from '../../supabase/functions/igdb-proxy/routes.ts'

const route = (path: string) => parseRoute(new URL(`http://localhost/functions/v1/igdb-proxy${path}`))

describe('igdb-proxy · parseRoute', () => {
  it('búsqueda por nombre, limpiando comillas y saltos de línea', () => {
    expect(route('/games?search=zelda')).toEqual({ kind: 'search', search: 'zelda' })
    expect(route('/games?search=%22a%22%0Ab')).toEqual({ kind: 'search', search: 'a  b' })
  })

  it('rechaza búsquedas vacías o de más de 100 caracteres', () => {
    expect(route('/games?search=')).toEqual({ kind: 'bad_params' })
    expect(route(`/games?search=${'a'.repeat(101)}`)).toEqual({ kind: 'bad_params' })
  })

  it('juego por id: solo enteros positivos', () => {
    expect(route('/games/1942')).toEqual({ kind: 'detail', gameId: 1942 })
    for (const bad of ['/games/abc', '/games/0', '/games/1.5', '/games/-3']) {
      expect(route(bad)).toEqual({ kind: 'bad_params' })
    }
  })

  it('lote de ids: sin duplicados y como mucho 100', () => {
    expect(route('/games?ids=1,2,2,3')).toEqual({ kind: 'batch', gameIds: [1, 2, 3] })
    const many = Array.from({ length: 101 }, (_, index) => index + 1).join(',')
    expect(route(`/games?ids=${many}`)).toEqual({ kind: 'bad_params' })
    expect(route('/games?ids=1,x')).toEqual({ kind: 'bad_params' })
  })

  it('ficha completa', () => {
    expect(route('/games/1942/full')).toEqual({ kind: 'full', gameId: 1942 })
    expect(route('/games/abc/full')).toEqual({ kind: 'bad_params' })
  })

  it('rutas desconocidas', () => {
    expect(route('/otra/cosa/rara')).toEqual({ kind: 'bad_route' })
  })

  it('explorar: valores por defecto y filtros válidos', () => {
    expect(route('/games/browse')).toEqual({
      kind: 'browse',
      params: {
        q: null,
        letter: null,
        platform: null,
        genre: null,
        fromYear: null,
        toYear: null,
        minRating: null,
        sort: 'popular',
        offset: 0,
      },
    })
    expect(route('/games/browse?letter=e&platform=167&from=2010&to=2019&sort=top_rated&offset=24')).toMatchObject({
      kind: 'browse',
      params: { letter: 'E', platform: 167, fromYear: 2010, toYear: 2019, sort: 'top_rated', offset: 24 },
    })
  })

  it('explorar: rechaza orden, letra, años u offset no válidos', () => {
    for (const bad of [
      '/games/browse?sort=random',
      '/games/browse?letter=AB',
      '/games/browse?from=2020&to=2010',
      '/games/browse?from=1800',
      '/games/browse?offset=99999',
      '/games/browse?min_rating=abc',
    ]) {
      expect(route(bad)).toEqual({ kind: 'bad_params' })
    }
  })
})

describe('igdb-proxy · buildBrowseConditions', () => {
  const base = {
    q: null,
    letter: null,
    platform: null,
    genre: null,
    fromYear: null,
    toYear: null,
    minRating: null,
    sort: 'popular' as const,
    offset: 0,
  }

  it('sin filtros: juegos principales con portada, por popularidad', () => {
    expect(buildBrowseConditions(base, 0)).toEqual({
      where: 'game_type = (0,8,9) & cover != null & version_parent = null',
      sort: 'total_rating_count desc',
    })
  })

  it('la letra # busca títulos que empiezan por número', () => {
    expect(buildBrowseConditions({ ...base, letter: '#' }, 0).where).toContain('name ~ "0"* | name ~ "1"*')
  })

  it('con filtros se relaja el mínimo de valoraciones de "mejor valorados"', () => {
    expect(buildBrowseConditions({ ...base, sort: 'top_rated' }, 0).where).toContain('total_rating_count >= 100')
    expect(buildBrowseConditions({ ...base, sort: 'top_rated', platform: 167 }, 0).where).toContain(
      'total_rating_count >= 20',
    )
  })
})
