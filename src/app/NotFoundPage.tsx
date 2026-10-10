import { EmptyState } from '@/shared/components/StateViews'
import { ButtonLink } from '@/shared/components/Button'
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle'

export function NotFoundPage() {
  useDocumentTitle('Página no encontrada')
  return (
    <EmptyState
      title="Esta página no existe"
      action={
        <ButtonLink to="/">Volver al inicio</ButtonLink>
      }
    />
  )
}
