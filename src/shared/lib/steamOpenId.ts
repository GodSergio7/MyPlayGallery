// Inicio de sesión con Steam (OpenID 2.0), común a dos flujos:
// - Conectar Steam desde Ajustes: vuelve a /settings?conectar=steam (Edge Function steam-connect).
// - Entrar con Steam desde la pantalla de acceso: vuelve a /?acceso=steam (Edge Function steam-login).
// Steam devuelve los parámetros openid.* en la URL y la función correspondiente los verifica con Steam.

const STEAM_OPENID_ENDPOINT = 'https://steamcommunity.com/openid/login'
const IDENTIFIER_SELECT = 'http://specs.openid.net/auth/2.0/identifier_select'

/** Marca en la URL que indica a qué flujo pertenece la vuelta de Steam. */
export interface SteamFlow {
  path: string
  param: string
}

export const STEAM_CONNECT_FLOW: SteamFlow = { path: '/settings', param: 'conectar' }
export const STEAM_SIGN_IN_FLOW: SteamFlow = { path: '/', param: 'acceso' }

export function steamLoginUrl(flow: SteamFlow, origin: string = window.location.origin): string {
  const params = new URLSearchParams({
    'openid.ns': 'http://specs.openid.net/auth/2.0',
    'openid.mode': 'checkid_setup',
    'openid.return_to': `${origin}${flow.path}?${flow.param}=steam`,
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

/** Lee la vuelta desde Steam de un flujo: nada, cancelado por el usuario o una respuesta que hay que verificar. */
export function readSteamReturn(search: URLSearchParams, flow: SteamFlow): SteamReturn {
  if (search.get(flow.param) !== 'steam') return { kind: 'none' }

  const mode = search.get('openid.mode')
  if (mode === 'cancel') return { kind: 'cancelled' }
  if (mode !== 'id_res') return { kind: 'none' }

  const params: Record<string, string> = {}
  search.forEach((value, key) => {
    if (key.startsWith('openid.')) params[key] = value
  })
  return { kind: 'response', params }
}

/** Email interno de las cuentas creadas al entrar con Steam (nunca recibe correo). */
export function isSteamOnlyEmail(email: string | null | undefined): boolean {
  return !!email && email.endsWith('@steam.invalid')
}
