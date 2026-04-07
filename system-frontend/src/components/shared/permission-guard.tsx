import type { ReactNode } from 'react'
import { useAuthStore } from '@/stores/auth-store'

interface PermissionGuardProps {
  resource: string
  action: string
  children: ReactNode
}

export function PermissionGuard({ resource, action, children }: PermissionGuardProps) {
  const hasPermission = useAuthStore((s) => s.hasPermission)

  if (!hasPermission(resource, action)) return null

  return <>{children}</>
}
