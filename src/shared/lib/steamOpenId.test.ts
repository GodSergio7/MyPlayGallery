import { describe, expect, it } from 'vitest'
import {
  isSteamOnlyEmail,
  readSteamReturn,
  STEAM_CONNECT_FLOW,
  STEAM_SIGN_IN_FLOW,
  steamLoginUrl,
} from './steamOpenId'

describe('steamLoginUrl', () => {
  it('al conectar, pide a Steam que vuelva a Ajustes en el mismo origen', () => {
    const url = new URL(steamLoginUrl(STEAM_CONNECT_FLOW, 'https://myplaygallery.vercel.app'))

    expect(url.origin + url.pathname).toBe('https://steamcommunity.com/openid/login')
    expect(url.searchParams.get('openid.mode')).toBe('checkid_setup')
    expect(url.searchParams.get('openid.return_to')).toBe(
      'https://myplaygallery.vercel.app/settings?conectar=steam',
    )
    expect(url.searchParams.get('openid.realm')).toBe('https://myplaygallery.vercel.app')
  })

  it('al entrar, vuelve al inicio con la marca de acceso', () => {
    const url = new URL(steamLoginUrl(STEAM_SIGN_IN_FLOW, 'https://myplaygallery.vercel.app'))

    expect(url.searchParams.get('openid.return_to')).toBe('https://myplaygallery.vercel.app/?acceso=steam')
  })
})

describe('readSteamReturn', () => {
  it('ignora la página normal', () => {
    expect(readSteamReturn(new URLSearchParams(''), STEAM_CONNECT_FLOW)).toEqual({ kind: 'none' })
  })

  it('no confunde la vuelta de un flujo con la del otro', () => {
    const search = new URLSearchParams('conectar=steam&openid.mode=id_res')
    expect(readSteamReturn(search, STEAM_SIGN_IN_FLOW)).toEqual({ kind: 'none' })
  })

  it('detecta que el usuario canceló en Steam', () => {
    expect(
      readSteamReturn(new URLSearchParams('acceso=steam&openid.mode=cancel'), STEAM_SIGN_IN_FLOW),
    ).toEqual({ kind: 'cancelled' })
  })

  it('recoge solo los parámetros openid.* de una respuesta', () => {
    const search = new URLSearchParams(
      'conectar=steam&openid.mode=id_res&openid.claimed_id=https%3A%2F%2Fsteamcommunity.com%2Fopenid%2Fid%2F76561197960435530&otro=x',
    )

    expect(readSteamReturn(search, STEAM_CONNECT_FLOW)).toEqual({
      kind: 'response',
      params: {
        'openid.mode': 'id_res',
        'openid.claimed_id': 'https://steamcommunity.com/openid/id/76561197960435530',
      },
    })
  })
})

describe('isSteamOnlyEmail', () => {
  it('reconoce el email interno de las cuentas creadas con Steam', () => {
    expect(isSteamOnlyEmail('steam-76561197960435530@steam.invalid')).toBe(true)
    expect(isSteamOnlyEmail('jugador@ejemplo.com')).toBe(false)
    expect(isSteamOnlyEmail(undefined)).toBe(false)
  })
})
