import { Link } from 'react-router-dom'
import { Button } from '@/shared/components/Button'
import { PageHeader } from '@/shared/components/PageHeader'
import { EmptyState } from '@/shared/components/StateViews'

// Provisional: el enlace del avatar de la barra lleva aquí hasta que exista el perfil de verdad.
export function ProfilePage() {
  return (
    <>
      <PageHeader title="Perfil" />
      <EmptyState
        title="Tu perfil llegará pronto"
        description="Mientras tanto, tu cuenta y tus conexiones están en Ajustes."
        action={
          <Link to="/settings">
            <Button variant="secondary">Ir a Ajustes</Button>
          </Link>
        }
      />
    </>
  )
}
