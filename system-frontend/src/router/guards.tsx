import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth-store'
import type { RoleName } from '@/types/auth'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated())
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  return <>{children}</>
}

export function RoleGuard({ roles, children }: { roles: RoleName[]; children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)

  if (!user || !roles.includes(user.roleName)) {
    return <Navigate to="/unauthorized" replace />
  }
  return <>{children}</>
}
