import { NavLink } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth-store'
import { useUIStore } from '@/stores/ui-store'
import { cn } from '@/lib/utils'
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
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

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
    items: [
      { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    ],
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
    items: [
      { label: 'Reports', to: '/reports', icon: PieChart },
    ],
  },
  {
    items: [
      { label: 'Users', to: '/users', icon: Users, adminOnly: true },
    ],
  },
]

export function Sidebar() {
  const user = useAuthStore((s) => s.user)
  const sidebarOpen = useUIStore((s) => s.sidebarOpen)
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen)

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed top-0 left-0 z-30 flex h-full w-[260px] flex-col border-r border-gray-200 bg-white transition-transform duration-200 lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-gray-200 px-5">
          <span className="text-xl font-bold text-blue-600">LogiTrack</span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 lg:hidden"
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
              <div key={sIdx} className={sIdx > 0 ? 'pt-4' : undefined}>
                {section.title && (
                  <p className="mb-1 px-3 text-xs font-semibold tracking-wider text-gray-400 uppercase">
                    {section.title}
                  </p>
                )}
                {visibleItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/orders'}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                      )
                    }
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    {item.label}
                  </NavLink>
                ))}
              </div>
            )
          })}
        </nav>
      </aside>
    </>
  )
}
