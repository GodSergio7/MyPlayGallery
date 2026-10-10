import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import { LoadingState } from '@/shared/components/StateViews'
import { lazyNamed } from '@/shared/lib/lazyNamed'
import { useAuth } from './authContext'

// La pantalla de acceso (con su mosaico y su fondo WebGL) solo se descarga si no hay sesión.
const LoginPage = lazyNamed(() => import('@/features/auth/LoginPage'), 'LoginPage')

export function RequireAuth() {
  const { session, loading } = useAuth()

  if (loading) {
    return <LoadingState message="Comprobando tu sesión…" />
  }

  if (!session) {
    return (
      <Suspense fallback={<LoadingState message="Cargando…" />}>
        <LoginPage />
      </Suspense>
    )
  }

  return <Outlet />
}
