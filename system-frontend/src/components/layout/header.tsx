import { useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth-store'
import { useUIStore } from '@/stores/ui-store'
import { StatusBadge } from '@/components/shared/status-badge'
import { cn } from '@/lib/utils'
import { Menu, LogOut, Search, Bell } from 'lucide-react'
import type { AuthUser } from '@/types/auth'

const SEGMENT_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  inventory: 'Inventory',
  products: 'Products',
  stock: 'Stock Levels',
  'low-stock': 'Low Stock',
  batches: 'Batches',
  warehouse: 'Warehouse',
  warehouses: 'Warehouses',
  locations: 'Locations',
  receipts: 'Receipts',
  movements: 'Movements',
  orders: 'Orders',
  new: 'Create',
  procurement: 'Procurement',
  suppliers: 'Suppliers',
  'purchase-orders': 'Purchase Orders',
  reports: 'Reports',
  users: 'Users',
}

function formatSegment(seg: string): string {
  return (
    SEGMENT_LABELS[seg] ??
    seg.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  )
}

function initialsForUser(user: AuthUser | null | undefined): string {
  if (!user) return '?'
  const a = user.firstName?.trim()?.[0] ?? ''
  const b = user.lastName?.trim()?.[0] ?? ''
  const s = `${a}${b}`.toUpperCase()
  return s || '?'
}

export function Header() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)

  const breadcrumb = useMemo(() => {
    const parts = location.pathname.split('/').filter(Boolean)
    if (parts.length === 0) return ['Home']
    return parts.map(formatSegment)
  }, [location.pathname])

  const contextLine = useMemo(() => {
    if (breadcrumb.length <= 2) return breadcrumb.join(' · ')
    return `${breadcrumb[0]} · … · ${breadcrumb[breadcrumb.length - 1]}`
  }, [breadcrumb])

  function handleLogout() {
    clearAuth()
    navigate('/login')
  }

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-3 sm:gap-4 sm:px-4 lg:px-6">
      <button
        type="button"
        onClick={toggleSidebar}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-800 sm:text-base">
          {user
            ? `Welcome back, ${user.firstName}`
            : 'Logistics workspace'}
        </p>
        <p className="truncate text-xs text-slate-500">{contextLine}</p>
        {user?.roleName === 'WAREHOUSE_STAFF' && user.warehouseId && (
          <div className="mt-1 inline-flex max-w-full rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-medium text-blue-700 ring-1 ring-blue-100">
            <span className="truncate">Warehouse: {user.warehouseId}</span>
          </div>
        )}
      </div>

      <div className="mx-2 hidden min-w-0 max-w-md flex-1 md:block">
        <label className="relative block w-full">
          <span className="sr-only">Search</span>
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <input
            type="search"
            placeholder="Search orders, SKUs, locations…"
            readOnly
            className="w-full rounded-lg border border-slate-200 bg-slate-50/90 py-2 pr-3 pl-9 text-sm text-slate-800 placeholder:text-slate-400 transition-shadow focus:border-blue-200 focus:bg-white focus:ring-2 focus:ring-blue-500/15 focus:outline-none"
          />
        </label>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <button
          type="button"
          className="relative flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-blue-500 ring-2 ring-white" />
        </button>

        {user && (
          <>
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-semibold text-white shadow-sm"
              aria-hidden
            >
              {initialsForUser(user)}
            </div>
            <div className="hidden min-w-0 flex-col sm:flex">
              <span className="max-w-[140px] truncate text-sm font-medium text-slate-800 lg:max-w-[200px]">
                {user.firstName} {user.lastName}
              </span>
              <StatusBadge status={user.roleName} className="mt-0.5 w-fit text-[10px]" />
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className={cn(
                'flex items-center justify-center gap-2 rounded-lg text-sm font-medium text-slate-600 transition-colors',
                'hover:bg-slate-100 hover:text-slate-900',
                'h-10 min-w-10 px-0 md:px-3',
              )}
              title="Sign out"
            >
              <LogOut className="h-5 w-5 shrink-0" />
              <span className="hidden md:inline">Sign out</span>
            </button>
          </>
        )}
      </div>
    </header>
  )
}
