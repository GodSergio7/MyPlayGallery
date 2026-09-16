import { Link } from 'react-router-dom'
import { EmptyState } from '@/shared/components/StateViews'
import { Button } from '@/shared/components/Button'

export function NotFoundPage() {
  return (
    <EmptyState
      title="Página no encontrada"
      description="La dirección a la que has llegado no existe dentro de MyPlayGallery."
      action={
        <Link to="/">
          <Button>Volver al inicio</Button>
        </Link>
      }
    />
  )
}
