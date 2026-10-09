import { useState } from 'react'

export type ViewMode = 'grid' | 'list'

/** Vista elegida (cuadrícula o lista), recordada en este navegador con la clave indicada. */
export function useViewMode(storageKey: string): [ViewMode, (view: ViewMode) => void] {
  const [view, setView] = useState<ViewMode>(() => {
    try {
      return window.localStorage.getItem(storageKey) === 'list' ? 'list' : 'grid'
    } catch {
      return 'grid'
    }
  })

  function changeView(next: ViewMode) {
    setView(next)
    try {
      window.localStorage.setItem(storageKey, next)
    } catch {
      // Sin almacenamiento (modo privado): la vista dura lo que la página.
    }
  }

  return [view, changeView]
}
