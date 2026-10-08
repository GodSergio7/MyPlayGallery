import { Outlet } from 'react-router-dom'
import { LoginPage } from '@/features/auth/LoginPage'
import { LoadingState } from '@/shared/components/StateViews'
import { useAuth } from './authContext'

export function RequireAuth() {
  const { session, loading } = useAuth()

  if (loading) {
    return <LoadingState message="Comprobando tu sesión…" />
  }

  if (!session) {
    return <LoginPage />
  }

  return <Outlet />
}
