import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth-store'
import { useUIStore } from '@/stores/ui-store'
import { cn } from '@/lib/utils'
import { StatusBadge } from '@/components/shared/status-badge'
import {
  LayoutDashboard,
  Package,
  BarChart3,
  AlertTriangle,
  Layers,
  Warehouse,
  MapPin,
  ClipboardList,
  ArrowLeftRight,
  ShoppingCart,
  Plus,
  Truck,
  FileText,
  PieChart,
  Users,
  X,
  ChevronRight,
  LogOut,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { AuthUser } from '@/types/auth'

interface NavItem {
  label: string
  to: string
  icon: LucideIcon
  adminOnly?: boolean
}

interface NavSection {
  title?: string
  items: NavItem[]
}

const navigation: NavSection[] = [
  {
    items: [{ label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard }],
  },
  {
    title: 'Inventory',
    items: [
      { label: 'Products', to: '/inventory/products', icon: Package },
      { label: 'Stock Levels', to: '/inventory/stock', icon: BarChart3 },
      { label: 'Low Stock', to: '/inventory/low-stock', icon: AlertTriangle },
      { label: 'Batches', to: '/inventory/batches', icon: Layers },
    ],
  },
  {
    title: 'Warehouse',
    items: [
      { label: 'Warehouses', to: '/warehouse/warehouses', icon: Warehouse },
      { label: 'Locations', to: '/warehouse/locations', icon: MapPin },
      { label: 'Receipts', to: '/warehouse/receipts', icon: ClipboardList },
      { label: 'Movements', to: '/warehouse/movements', icon: ArrowLeftRight },
    ],
  },
  {
    title: 'Orders',
    items: [
      { label: 'All Orders', to: '/orders', icon: ShoppingCart },
      { label: 'Create Order', to: '/orders/new', icon: Plus },
    ],
  },
  {
    title: 'Procurement',
    items: [
      { label: 'Suppliers', to: '/procurement/suppliers', icon: Truck },
      { label: 'Purchase Orders', to: '/procurement/purchase-orders', icon: FileText },
    ],
  },
  {
    items: [{ label: 'Reports', to: '/reports', icon: PieChart }],
  },
  {
    items: [{ label: 'Users', to: '/users', icon: Users, adminOnly: true }],
  },
]

function initialsForUser(user: AuthUser | null | undefined): string {
  if (!user) return '?'
  const a = user.firstName?.trim()?.[0] ?? ''
  const b = user.lastName?.trim()?.[0] ?? ''
  const s = `${a}${b}`.toUpperCase()
  return s || '?'
}

export function Sidebar() {
  const user = useAuthStore((s) => s.user)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const sidebarOpen = useUIStore((s) => s.sidebarOpen)
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen)
  const navigate = useNavigate()

  function handleSignOut() {
    clearAuth()
    navigate('/login')
    setSidebarOpen(false)
  }

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 backdrop-blur-[2px] transition-opacity duration-300 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          'fixed top-0 left-0 z-30 flex h-full w-[272px] flex-col border-r border-slate-800/80 bg-slate-950 shadow-xl transition-transform duration-300 ease-out lg:static lg:translate-x-0 lg:shadow-none',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-slate-800/80 px-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-900/40">
              <Truck className="h-[18px] w-[18px]" strokeWidth={2.25} />
            </div>
            <span className="truncate text-lg font-bold tracking-tight">
              <span className="bg-gradient-to-r from-blue-400 via-sky-400 to-cyan-400 bg-clip-text text-transparent">
                LogiTrack
              </span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-800 hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navigation.map((section, sIdx) => {
            const visibleItems = section.items.filter(
              (item) => !item.adminOnly || user?.roleName === 'ADMIN',
            )
            if (visibleItems.length === 0) return null

            return (
              <div key={sIdx} className={cn(sIdx > 0 && 'pt-5')}>
                {section.title && (
                  <p className="mb-2 px-3 text-[10px] font-semibold tracking-[0.2em] text-slate-500 uppercase">
                    {section.title}
                  </p>
                )}
                <ul className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const Icon = item.icon
                    return (
                      <li key={item.to}>
                        <NavLink
                          to={item.to}
                          end={item.to === '/orders'}
                          onClick={() => setSidebarOpen(false)}
                          className={({ isActive }) =>
                            cn(
                              'group relative flex items-center gap-3 rounded-lg py-2.5 pr-3 pl-3 text-sm font-medium transition-all duration-200',
                              isActive
                                ? 'border-l-[3px] border-blue-500 bg-slate-800/70 text-white shadow-sm shadow-black/10'
                                : 'border-l-[3px] border-transparent text-slate-400 hover:bg-slate-800/80 hover:text-slate-200',
                            )
                          }
                        >
                          {({ isActive }) => (
                            <>
                              <Icon
                                className="h-5 w-5 shrink-0 opacity-90 transition-opacity duration-200 group-hover:opacity-100"
                                strokeWidth={2}
                              />
                              <span className="min-w-0 flex-1 truncate">{item.label}</span>
                              <ChevronRight
                                className={cn(
                                  'h-4 w-4 shrink-0 transition-all duration-200',
                                  isActive
                                    ? 'text-blue-300/90 opacity-100'
                                    : 'text-slate-600 opacity-0 group-hover:translate-x-0.5 group-hover:opacity-100',
                                )}
                                aria-hidden
                              />
                            </>
                          )}
                        </NavLink>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </nav>

        {user && (
          <div className="shrink-0 border-t border-slate-800/80 p-3">
            <div className="rounded-xl bg-slate-900/80 p-3 ring-1 ring-slate-800/80">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-semibold text-white shadow-md"
                  aria-hidden
                >
                  {initialsForUser(user)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-100">
                    {user.firstName} {user.lastName}
                  </p>
                  <div className="mt-1">
                    <StatusBadge
                      status={user.roleName}
                      className="scale-90 origin-left text-[10px]"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-200"
                  title="Sign out"
                  aria-label="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  )
}
