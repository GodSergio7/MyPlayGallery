import { useEffect } from 'react'

const APP_NAME = 'MyPlayGallery'

/**
 * Título de la pestaña: "Página · MyPlayGallery" (T-26). Sin título, solo el nombre de la app.
 * Al salir de la página se restaura el anterior.
 */
export function useDocumentTitle(title: string | undefined) {
  useEffect(() => {
    const previous = document.title
    document.title = title ? `${title} · ${APP_NAME}` : APP_NAME
    return () => {
      document.title = previous
    }
  }, [title])
}
