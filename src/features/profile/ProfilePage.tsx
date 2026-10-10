import { ButtonLink } from '@/shared/components/Button'
import { PageHeader } from '@/shared/components/PageHeader'
import { EmptyState } from '@/shared/components/StateViews'
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle'

// Provisional: el enlace del avatar de la barra lleva aquí hasta que exista el perfil de verdad.
export function ProfilePage() {
  useDocumentTitle('Perfil')
  return (
    <>
      <PageHeader title="Perfil" />
      <EmptyState
        title="Tu perfil llegará pronto"
        description="Mientras tanto, tu cuenta y tus conexiones están en Ajustes."
        action={
          <ButtonLink to="/settings" variant="secondary">Ir a Ajustes</ButtonLink>
        }
      />
    </>
  )
}
