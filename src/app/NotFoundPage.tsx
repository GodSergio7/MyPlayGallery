import { Link } from 'react-router-dom'
import { EmptyState } from '@/shared/components/StateViews'
import { Button } from '@/shared/components/Button'

export function NotFoundPage() {
  return (
    <EmptyState
      title="Esta página no existe"
      action={
        <Link to="/">
          <Button>Volver al inicio</Button>
        </Link>
      }
    />
  )
}
