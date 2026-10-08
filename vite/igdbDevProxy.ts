import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin, ViteDevServer } from 'vite'

// Sirve la Edge Function igdb-proxy dentro del servidor de desarrollo de Vite,
// en la misma ruta que expone Supabase (/functions/v1/igdb-proxy). Así el
// cliente funciona en local sin desplegar nada: basta con apuntar
// VITE_SUPABASE_URL al propio servidor de Vite. Se ejecuta el mismo código de
// supabase/functions/igdb-proxy/index.ts con un shim mínimo de Deno.

const ROUTE_PREFIX = '/functions/v1/igdb-proxy'
const FUNCTION_ENTRY = '/supabase/functions/igdb-proxy/index.ts'

type Handler = (request: Request) => Response | Promise<Response>

function matchesRoute(url: string): boolean {
  return (
    url === ROUTE_PREFIX ||
    url.startsWith(`${ROUTE_PREFIX}/`) ||
    url.startsWith(`${ROUTE_PREFIX}?`)
  )
}

async function loadHandler(
  server: ViteDevServer,
  env: Record<string, string>,
): Promise<Handler> {
  let handler: Handler | null = null

  ;(globalThis as Record<string, unknown>).Deno = {
    env: { get: (key: string) => env[key] },
    serve: (fn: Handler) => {
      handler = fn
    },
  }

  await server.ssrLoadModule(FUNCTION_ENTRY)

  if (!handler) {
    throw new Error('igdb-proxy no ha registrado ningún handler con Deno.serve')
  }
  return handler
}

function toRequest(req: IncomingMessage): Request {
  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) {
      value.forEach((item) => headers.append(key, item))
    } else if (value !== undefined) {
      headers.set(key, value)
    }
  }

  return new Request(new URL(req.url ?? '/', 'http://localhost'), {
    method: req.method,
    headers,
  })
}

async function sendResponse(res: ServerResponse, response: Response): Promise<void> {
  res.statusCode = response.status
  response.headers.forEach((value, key) => res.setHeader(key, value))
  res.end(Buffer.from(await response.arrayBuffer()))
}

export function igdbDevProxy(env: Record<string, string>): Plugin {
  return {
    name: 'igdb-dev-proxy',
    apply: 'serve',
    configureServer(server) {
      if (!env.TWITCH_CLIENT_ID || !env.TWITCH_CLIENT_SECRET) {
        server.config.logger.warn(
          '[igdb-dev-proxy] Faltan TWITCH_CLIENT_ID o TWITCH_CLIENT_SECRET en .env.local: la búsqueda de juegos fallará.',
        )
      }

      let handlerPromise: Promise<Handler> | null = null

      server.watcher.on('change', (file) => {
        if (file.replaceAll('\\', '/').endsWith(FUNCTION_ENTRY)) {
          handlerPromise = null
        }
      })

      server.middlewares.use(async (req, res, next) => {
        if (!matchesRoute(req.url ?? '')) {
          next()
          return
        }

        try {
          handlerPromise ??= loadHandler(server, env)
          const handler = await handlerPromise
          await sendResponse(res, await handler(toRequest(req)))
        } catch (error) {
          handlerPromise = null
          server.config.logger.error(`[igdb-dev-proxy] ${String(error)}`)
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: { code: 'internal_error', message: 'Error inesperado.' } }))
        }
      })
    },
  }
}
