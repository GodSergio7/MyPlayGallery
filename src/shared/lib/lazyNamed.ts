import { lazy, type ComponentType } from 'react'

const RELOAD_KEY = 'myplaygallery.chunk-reload'

/**
 * Carga un módulo bajo demanda. Si falla (red inestable, o se publicó una versión nueva y los
 * archivos antiguos ya no existen), lo reintenta una vez y, si sigue fallando, recarga la página
 * una sola vez para traer la versión actual. Si aun así falla, el error llega al ErrorBoundary.
 */
export async function importWithRetry<M>(loader: () => Promise<M>): Promise<M> {
  try {
    const module = await loader()
    try {
      window.sessionStorage.removeItem(RELOAD_KEY)
    } catch {
      // sin almacenamiento: no pasa nada
    }
    return module
  } catch {
    try {
      return await loader()
    } catch (error) {
      let alreadyReloaded = true
      try {
        alreadyReloaded = window.sessionStorage.getItem(RELOAD_KEY) === '1'
        if (!alreadyReloaded) window.sessionStorage.setItem(RELOAD_KEY, '1')
      } catch {
        // sin almacenamiento no se puede evitar un bucle de recargas: se deja ver el error
      }
      if (!alreadyReloaded) {
        window.location.reload()
        return new Promise<M>(() => {}) // la página se está recargando
      }
      throw error
    }
  }
}

/**
 * React.lazy para módulos con exportaciones con nombre:
 * `lazyNamed(() => import('./Pagina'), 'Pagina')` carga el archivo solo cuando se necesita.
 */
export function lazyNamed<M extends Record<string, unknown>, K extends keyof M & string>(
  loader: () => Promise<M>,
  name: K,
) {
  return lazy(async () => ({ default: (await importWithRetry(loader))[name] as ComponentType<object> }))
}
