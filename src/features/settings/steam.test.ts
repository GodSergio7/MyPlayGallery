import { describe, expect, it } from 'vitest'
import { readSteamReturn, steamLoginUrl } from './steam'

describe('steamLoginUrl', () => {
  it('pide a Steam que vuelva a Ajustes en el mismo origen', () => {
    const url = new URL(steamLoginUrl('https://myplaygallery.vercel.app'))

    expect(url.origin + url.pathname).toBe('https://steamcommunity.com/openid/login')
    expect(url.searchParams.get('openid.mode')).toBe('checkid_setup')
    expect(url.searchParams.get('openid.return_to')).toBe(
      'https://myplaygallery.vercel.app/settings?conectar=steam',
    )
    expect(url.searchParams.get('openid.realm')).toBe('https://myplaygallery.vercel.app')
  })
})

describe('readSteamReturn', () => {
  it('ignora la página de Ajustes normal', () => {
    expect(readSteamReturn(new URLSearchParams(''))).toEqual({ kind: 'none' })
  })

  it('detecta que el usuario canceló en Steam', () => {
    expect(readSteamReturn(new URLSearchParams('conectar=steam&openid.mode=cancel'))).toEqual({
      kind: 'cancelled',
    })
  })

  it('recoge solo los parámetros openid.* de una respuesta', () => {
    const search = new URLSearchParams(
      'conectar=steam&openid.mode=id_res&openid.claimed_id=https%3A%2F%2Fsteamcommunity.com%2Fopenid%2Fid%2F76561197960435530&otro=x',
    )

    expect(readSteamReturn(search)).toEqual({
      kind: 'response',
      params: {
        'openid.mode': 'id_res',
        'openid.claimed_id': 'https://steamcommunity.com/openid/id/76561197960435530',
      },
    })
  })
})
