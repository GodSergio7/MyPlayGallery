import { lazy, type ComponentType } from 'react'

/**
 * React.lazy para módulos con exportaciones con nombre:
 * `lazyNamed(() => import('./Pagina'), 'Pagina')` carga el archivo solo cuando se necesita.
 */
export function lazyNamed<M extends Record<string, unknown>, K extends keyof M & string>(
  loader: () => Promise<M>,
  name: K,
) {
  return lazy(async () => ({ default: (await loader())[name] as ComponentType<object> }))
}
