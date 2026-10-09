// Inicio de sesión con Steam (OpenID 2.0). Steam devuelve al usuario a /settings con los
// parámetros openid.* en la URL; la Edge Function steam-connect los verifica con Steam.

const STEAM_OPENID_ENDPOINT = 'https://steamcommunity.com/openid/login'
const IDENTIFIER_SELECT = 'http://specs.openid.net/auth/2.0/identifier_select'

export const STEAM_RETURN_PATH = '/settings?conectar=steam'

export function steamLoginUrl(origin: string = window.location.origin): string {
  const params = new URLSearchParams({
    'openid.ns': 'http://specs.openid.net/auth/2.0',
    'openid.mode': 'checkid_setup',
    'openid.return_to': origin + STEAM_RETURN_PATH,
    'openid.realm': origin,
    'openid.identity': IDENTIFIER_SELECT,
    'openid.claimed_id': IDENTIFIER_SELECT,
  })
  return `${STEAM_OPENID_ENDPOINT}?${params.toString()}`
}

export type SteamReturn =
  | { kind: 'none' }
  | { kind: 'cancelled' }
  | { kind: 'response'; params: Record<string, string> }

/** Lee la vuelta desde Steam: nada, cancelado por el usuario o una respuesta que hay que verificar. */
export function readSteamReturn(search: URLSearchParams): SteamReturn {
  if (search.get('conectar') !== 'steam') return { kind: 'none' }

  const mode = search.get('openid.mode')
  if (mode === 'cancel') return { kind: 'cancelled' }
  if (mode !== 'id_res') return { kind: 'none' }

  const params: Record<string, string> = {}
  search.forEach((value, key) => {
    if (key.startsWith('openid.')) params[key] = value
  })
  return { kind: 'response', params }
}
