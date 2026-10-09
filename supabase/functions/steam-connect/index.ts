// Conecta la cuenta de Steam del usuario (SPEC-08).
//
// Flujo: la app manda al usuario al inicio de sesión oficial de Steam (OpenID 2.0). Steam lo
// devuelve a /settings con los parámetros openid.* en la URL y la app nos los reenvía aquí.
// Esta función pregunta a Steam si esa respuesta es auténtica (check_authentication), saca el
// SteamID, lee el nombre y el avatar del perfil público y guarda la conexión con la clave de
// servicio. No hace falta la clave de la Steam Web API para nada de esto.

import { createClient } from 'npm:@supabase/supabase-js@2'

const STEAM_OPENID_ENDPOINT = 'https://steamcommunity.com/openid/login'
const STEAM_CLAIMED_ID = /^https:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/
const TIMEOUT_MS = 8000

const DEFAULT_ALLOWED_ORIGINS = ['http://localhost:5173', 'http://localhost:4173']

type ErrorCode =
  | 'bad_request'
  | 'unauthorized'
  | 'invalid_steam_response'
  | 'already_linked'
  | 'upstream_error'
  | 'internal_error'
  | 'method_not_allowed'

const ERROR_STATUS: Record<ErrorCode, number> = {
  bad_request: 400,
  unauthorized: 401,
  invalid_steam_response: 400,
  already_linked: 409,
  upstream_error: 502,
  internal_error: 500,
  method_not_allowed: 405,
}

const ERROR_MESSAGES: Record<ErrorCode, string> = {
  bad_request: 'Parametros de la peticion no validos.',
  unauthorized: 'Sesion no valida.',
  invalid_steam_response: 'Steam no ha confirmado el inicio de sesion. Vuelve a intentarlo.',
  already_linked: 'Esta cuenta de Steam ya esta conectada a otro usuario.',
  upstream_error: 'No se ha podido contactar con Steam. Intentalo mas tarde.',
  internal_error: 'Error inesperado.',
  method_not_allowed: 'Metodo no permitido.',
}

function allowedOrigins(): string[] {
  const raw = Deno.env.get('ALLOWED_ORIGINS')
  if (!raw) {
    return DEFAULT_ALLOWED_ORIGINS
  }
  return raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
}

function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type, authorization, apikey, x-client-info',
    Vary: 'Origin',
  }

  if (origin && allowedOrigins().includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin
  }

  return headers
}

function jsonResponse(body: unknown, status: number, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
  })
}

function errorResponse(code: ErrorCode, origin: string | null): Response {
  return jsonResponse({ error: { code, message: ERROR_MESSAGES[code] } }, ERROR_STATUS[code], origin)
}

async function fetchWithTimeout(url: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

/** Solo los parámetros openid.* con valores de texto; cualquier otra cosa es una petición mal formada. */
function readOpenIdParams(body: unknown): Record<string, string> | null {
  if (typeof body !== 'object' || body === null) return null
  const params = (body as { params?: unknown }).params
  if (typeof params !== 'object' || params === null) return null

  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(params)) {
    if (!key.startsWith('openid.') || typeof value !== 'string' || value.length > 2000) return null
    result[key] = value
  }
  return result
}

/** Comprobaciones locales antes de preguntar a Steam: que la respuesta venga de Steam y vuelva a la app. */
function steamIdFromParams(params: Record<string, string>): string | null {
  if (params['openid.mode'] !== 'id_res') return null
  if (params['openid.op_endpoint'] !== STEAM_OPENID_ENDPOINT) return null
  if (params['openid.claimed_id'] !== params['openid.identity']) return null

  const returnTo = params['openid.return_to']
  try {
    if (!returnTo || !allowedOrigins().includes(new URL(returnTo).origin)) return null
  } catch {
    return null
  }

  const match = STEAM_CLAIMED_ID.exec(params['openid.claimed_id'] ?? '')
  return match ? match[1] : null
}

/** Steam confirma que la firma es suya y que el nonce no se ha usado antes. */
async function verifyWithSteam(params: Record<string, string>): Promise<boolean> {
  const form = new URLSearchParams({ ...params, 'openid.mode': 'check_authentication' })
  const response = await fetchWithTimeout(STEAM_OPENID_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
  })
  if (!response.ok) throw new Error('steam_unavailable')
  const text = await response.text()
  return /(^|\n)is_valid:true(\n|$)/.test(text)
}

function readCdata(xml: string, tag: string): string | null {
  const match = new RegExp(`<${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`).exec(xml)
  const value = match?.[1]?.trim()
  return value ? value : null
}

/** Nombre y avatar del perfil público. Si el perfil es privado o Steam no responde, se guarda sin ellos. */
async function readSteamProfile(steamId: string): Promise<{ displayName: string | null; avatarUrl: string | null }> {
  try {
    const response = await fetchWithTimeout(`https://steamcommunity.com/profiles/${steamId}?xml=1`)
    if (!response.ok) return { displayName: null, avatarUrl: null }
    const xml = await response.text()
    const avatar = readCdata(xml, 'avatarMedium')
    return {
      displayName: readCdata(xml, 'steamID')?.slice(0, 100) ?? null,
      avatarUrl: avatar && avatar.startsWith('https://') ? avatar.slice(0, 500) : null,
    }
  } catch {
    return { displayName: null, avatarUrl: null }
  }
}

Deno.serve(async (request: Request): Promise<Response> => {
  const origin = request.headers.get('origin')

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) })
  }

  if (request.method !== 'POST') {
    return errorResponse('method_not_allowed', origin)
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceRoleKey) {
      return errorResponse('internal_error', origin)
    }
    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })

    // Quién es el usuario de la app: se saca del JWT de su sesión, nunca del cuerpo.
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    const { data: userData, error: userError } = token
      ? await admin.auth.getUser(token)
      : { data: { user: null }, error: null }
    if (userError || !userData.user) {
      return errorResponse('unauthorized', origin)
    }

    const params = readOpenIdParams(await request.json().catch(() => null))
    if (!params) {
      return errorResponse('bad_request', origin)
    }

    const steamId = steamIdFromParams(params)
    if (!steamId) {
      return errorResponse('invalid_steam_response', origin)
    }

    let valid: boolean
    try {
      valid = await verifyWithSteam(params)
    } catch {
      return errorResponse('upstream_error', origin)
    }
    if (!valid) {
      return errorResponse('invalid_steam_response', origin)
    }

    const profile = await readSteamProfile(steamId)

    const { data, error } = await admin
      .from('platform_connections')
      .upsert(
        {
          user_id: userData.user.id,
          provider: 'steam',
          external_id: steamId,
          display_name: profile.displayName,
          avatar_url: profile.avatarUrl,
          connected_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,provider' },
      )
      .select('provider, external_id, display_name, avatar_url, connected_at, last_synced_at')
      .single()

    if (error) {
      return errorResponse(error.code === '23505' ? 'already_linked' : 'internal_error', origin)
    }

    return jsonResponse({ connection: data }, 200, origin)
  } catch {
    return errorResponse('internal_error', origin)
  }
})
