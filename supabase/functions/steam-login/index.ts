// Inicio de sesión con Steam (SPEC-09).
//
// Supabase Auth no admite Steam (usa OpenID 2.0), así que el flujo es propio:
// 1. La app manda al usuario al inicio de sesión oficial de Steam y nos reenvía su respuesta (openid.*).
// 2. Preguntamos a Steam si la respuesta es auténtica (check_authentication) y sacamos el SteamID.
// 3. Si esa cuenta de Steam ya está conectada a un usuario, entra como él. Si no, se crea un usuario
//    nuevo con un email interno que no recibe correo (steam-<id>@steam.invalid) y se le conecta Steam.
// 4. Generamos un enlace de acceso de un solo uso (no se envía por correo) y devolvemos su token;
//    la app lo canjea por la sesión con verifyOtp.
// Esta función no exige sesión (verify_jwt = false): es justo la que la crea.

import { createClient } from 'npm:@supabase/supabase-js@2'

const STEAM_OPENID_ENDPOINT = 'https://steamcommunity.com/openid/login'
const STEAM_CLAIMED_ID = /^https:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/
const TIMEOUT_MS = 8000

const DEFAULT_ALLOWED_ORIGINS = ['http://localhost:5173', 'http://localhost:4173']

type ErrorCode = 'bad_request' | 'invalid_steam_response' | 'upstream_error' | 'internal_error' | 'method_not_allowed'

const ERROR_STATUS: Record<ErrorCode, number> = {
  bad_request: 400,
  invalid_steam_response: 400,
  upstream_error: 502,
  internal_error: 500,
  method_not_allowed: 405,
}

const ERROR_MESSAGES: Record<ErrorCode, string> = {
  bad_request: 'Parametros de la peticion no validos.',
  invalid_steam_response: 'Steam no ha confirmado el inicio de sesion. Vuelve a intentarlo.',
  upstream_error: 'No se ha podido contactar con Steam. Intentalo mas tarde.',
  internal_error: 'Error inesperado.',
  method_not_allowed: 'Metodo no permitido.',
}

/** Email interno de las cuentas creadas con Steam. .invalid es un dominio reservado: nunca recibe correo. */
function steamEmail(steamId: string): string {
  return `steam-${steamId}@steam.invalid`
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

    // ¿Esta cuenta de Steam ya está conectada a algún usuario?
    const { data: existing, error: lookupError } = await admin
      .from('platform_connections')
      .select('user_id')
      .eq('provider', 'steam')
      .eq('external_id', steamId)
      .maybeSingle()
    if (lookupError) {
      return errorResponse('internal_error', origin)
    }

    let email: string
    let created = false
    if (existing) {
      const { data: userData, error: userError } = await admin.auth.admin.getUserById(existing.user_id)
      if (userError || !userData.user?.email) {
        return errorResponse('internal_error', origin)
      }
      email = userData.user.email
    } else {
      // Usuario nuevo solo con Steam. Si ya existía (p. ej. se borró su conexión), se reutiliza.
      email = steamEmail(steamId)
      const { error: createError } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { steam_id: steamId, display_name: profile.displayName },
      })
      if (createError && createError.code !== 'email_exists' && createError.status !== 422) {
        return errorResponse('internal_error', origin)
      }
      created = !createError
    }

    // Enlace de acceso de un solo uso: no se envía, la app canjea su token por la sesión.
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
    if (linkError || !linkData.user || !linkData.properties?.hashed_token) {
      return errorResponse('internal_error', origin)
    }

    // Conexión de Steam al día (nombre y avatar actuales).
    const { error: connectionError } = await admin.from('platform_connections').upsert(
      {
        user_id: linkData.user.id,
        provider: 'steam',
        external_id: steamId,
        display_name: profile.displayName,
        avatar_url: profile.avatarUrl,
        connected_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,provider' },
    )
    if (connectionError) {
      return errorResponse('internal_error', origin)
    }

    return jsonResponse({ tokenHash: linkData.properties.hashed_token, created }, 200, origin)
  } catch {
    return errorResponse('internal_error', origin)
  }
})
