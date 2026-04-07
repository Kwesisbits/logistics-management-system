import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth-store'
import { useUIStore } from '@/stores/ui-store'
import { Menu, LogOut } from 'lucide-react'
import { StatusBadge } from '@/components/shared/status-badge'

export function Header() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)

  function handleLogout() {
    clearAuth()
    navigate('/login')
  }

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-gray-200 bg-white px-4 lg:px-6">
      <button
        onClick={toggleSidebar}
        className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {user?.roleName === 'WAREHOUSE_STAFF' && user.warehouseId && (
        <div className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
          Warehouse: {user.warehouseId}
        </div>
      )}

      <div className="flex-1" />

      <div className="flex items-center gap-3">
        {user && (
          <>
            <span className="hidden text-sm font-medium text-gray-700 sm:inline">
              {user.firstName} {user.lastName}
            </span>
            <StatusBadge status={user.roleName} />
          </>
        )}
        <button
          onClick={handleLogout}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
          title="Logout"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </header>
  )
}
