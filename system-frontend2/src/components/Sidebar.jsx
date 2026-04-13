import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Package, ShoppingCart, Warehouse,
  Truck, BarChart2, Users, LogOut,
  ChevronDown, ChevronRight, BoxSelect, MapPin,
  ClipboardList, ArrowLeftRight, Factory, FileText,
  AlertTriangle, Layers
} from 'lucide-react'
import useAuthStore from '../store/authStore'
import { identityApi } from '../services/axiosInstance'
import { useOrdersTotalQuery } from '../hooks/useOrdersTotal'

const navConfig = [
  {
    id: 'inventory',
    label: 'Inventory',
    icon: Package,
    roles: ['ADMIN', 'WAREHOUSE_STAFF', 'VIEWER'],
    children: [
      { label: 'Products',     path: '/inventory/products',  icon: BoxSelect,     roles: ['ADMIN', 'WAREHOUSE_STAFF', 'VIEWER'] },
      { label: 'Stock Levels', path: '/inventory/stock',     icon: Layers,        roles: ['ADMIN', 'WAREHOUSE_STAFF', 'VIEWER'] },
      { label: 'Low Stock',    path: '/inventory/low-stock', icon: AlertTriangle, roles: ['ADMIN', 'WAREHOUSE_STAFF', 'VIEWER'] },
      { label: 'Batches',      path: '/inventory/batches',   icon: ClipboardList, roles: ['ADMIN', 'WAREHOUSE_STAFF', 'VIEWER'] },
    ],
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    path: '/dashboard',
    roles: ['ADMIN', 'WAREHOUSE_STAFF', 'VIEWER'],
  },
  {
    id: 'orders',
    label: 'Orders',
    icon: ShoppingCart,
    roles: ['ADMIN', 'WAREHOUSE_STAFF', 'VIEWER'],
    children: [
      { label: 'All Orders',   path: '/orders',     icon: ShoppingCart, roles: ['ADMIN', 'WAREHOUSE_STAFF', 'VIEWER'] },
      { label: 'Create Order', path: '/orders/new', icon: FileText,     roles: ['ADMIN', 'WAREHOUSE_STAFF'] },
    ],
  },
  {
    id: 'warehouse',
    label: 'Warehouse',
    icon: Warehouse,
    roles: ['ADMIN', 'WAREHOUSE_STAFF', 'VIEWER'],
    children: [
      { label: 'Warehouses', path: '/warehouse/warehouses', icon: Warehouse,      roles: ['ADMIN'] },
      { label: 'Locations',  path: '/warehouse/locations',  icon: MapPin,         roles: ['ADMIN'] },
      { label: 'Receipts',   path: '/warehouse/receipts',   icon: ClipboardList,  roles: ['ADMIN', 'WAREHOUSE_STAFF', 'VIEWER'] },
      { label: 'Dispatch',   path: '/warehouse/dispatch',   icon: Truck,          roles: ['ADMIN', 'WAREHOUSE_STAFF'] },
      { label: 'Movements',  path: '/warehouse/movements',  icon: ArrowLeftRight, roles: ['ADMIN', 'WAREHOUSE_STAFF', 'VIEWER'] },
    ],
  },
  {
    id: 'procurement',
    label: 'Procurement',
    icon: Factory,
    roles: ['ADMIN', 'VIEWER'],
    children: [
      { label: 'Suppliers',       path: '/procurement/suppliers',       icon: Factory,  roles: ['ADMIN', 'VIEWER'] },
      { label: 'Purchase Orders', path: '/procurement/purchase-orders', icon: FileText, roles: ['ADMIN', 'VIEWER'] },
    ],
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: BarChart2,
    roles: ['ADMIN', 'WAREHOUSE_STAFF', 'VIEWER'],
    children: [
      { label: 'Inventory',   path: '/reports/inventory',   icon: Package,        roles: ['ADMIN', 'WAREHOUSE_STAFF', 'VIEWER'] },
      { label: 'Movements',   path: '/reports/movements',   icon: ArrowLeftRight, roles: ['ADMIN', 'WAREHOUSE_STAFF', 'VIEWER'] },
      { label: 'Orders',      path: '/reports/orders',      icon: ShoppingCart,   roles: ['ADMIN'] },
      { label: 'Procurement', path: '/reports/procurement', icon: Factory,        roles: ['ADMIN'] },
    ],
  },
  {
    id: 'users',
    label: 'Users',
    icon: Users,
    path: '/users',
    roles: ['ADMIN'],
  },
]

function NavItem({ item, isCollapsed, isMobile, onNavigate, ordersTotal }) {
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const roleName = user?.roleName

  if (!item.roles.includes(roleName)) return null

  const isActive = item.path
    ? location.pathname === item.path
    : item.children?.some((c) => location.pathname.startsWith(c.path))

  const [open, setOpen] = useState(isActive)

  if (item.children) {
    const visibleChildren = item.children.filter((c) => c.roles.includes(roleName))
    if (visibleChildren.length === 0) return null

    return (
      <div>
        <button
          onClick={() => setOpen((o) => !o)}
          className={`
            w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
            transition-all duration-150 group
            ${isActive
              ? 'bg-gray-200/90 dark:bg-white/10 text-gray-900 dark:text-white'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
            }
          `}
        >
          <span className="relative flex-shrink-0">
            <item.icon
              size={18}
              className={`transition-colors ${
                isActive ? 'text-deep-green dark:text-medium-green' : 'text-gray-500 dark:text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300'
              }`}
            />
            {item.id === 'orders' && isCollapsed && !isMobile && typeof ordersTotal === 'number' && (
              <span className="absolute -top-1.5 -right-2 min-w-[14px] h-3.5 px-0.5 flex items-center justify-center rounded-full bg-medium-green text-[9px] font-bold text-white leading-none">
                {ordersTotal > 99 ? '99' : ordersTotal}
              </span>
            )}
          </span>
          {!(isCollapsed && !isMobile) && (
            <>
              <span className="flex-1 text-left">{item.label}</span>
              {item.id === 'orders' && typeof ordersTotal === 'number' && (
                <span className="shrink-0 min-w-[1.25rem] px-1.5 py-0.5 rounded-full bg-medium-green text-[10px] font-bold text-white tabular-nums">
                  {ordersTotal > 999 ? '999+' : ordersTotal}
                </span>
              )}
              {open
                ? <ChevronDown size={13} className="text-gray-500 dark:text-gray-600 shrink-0" />
                : <ChevronRight size={13} className="text-gray-500 dark:text-gray-600 shrink-0" />
              }
            </>
          )}
        </button>

        {open && !(isCollapsed && !isMobile) && (
          <div className="ml-7 mt-0.5 space-y-0.5">
            {visibleChildren.map((child) => {
              const childActive = location.pathname === child.path
              return (
                <button
                  key={child.path}
                  onClick={() => {
                    navigate(child.path)
                    onNavigate?.()
                  }}
                  className={`
                    w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium
                    transition-all duration-150
                    ${childActive
                      ? 'bg-medium-green text-white'
                      : 'text-gray-600 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5'
                    }
                  `}
                >
                  <child.icon size={13} className="flex-shrink-0" />
                  {child.label}
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <button
      onClick={() => {
        navigate(item.path)
        onNavigate?.()
      }}
      className={`
        w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
        transition-all duration-150 group
        ${isActive
          ? 'bg-medium-green text-white'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
        }
      `}
    >
      <item.icon
        size={18}
        className={`flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-500 dark:text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300'}`}
      />
      {!(isCollapsed && !isMobile) && <span>{item.label}</span>}
    </button>
  )
}

function Sidebar({ isCollapsed, isMobile, isMobileOpen, onCloseMobile }) {
  const navigate = useNavigate()
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const { data: ordersTotal } = useOrdersTotalQuery()

  const handleLogout = () => {
    identityApi.post('/auth/logout').catch(() => {})
    clearAuth()
    navigate('/login')
    onCloseMobile?.()
  }

  return (
    <aside
      className={`
        fixed inset-y-0 left-0 z-40 lg:static lg:z-auto h-screen flex flex-col
        bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800
        transition-all duration-300 ease-in-out transform
        w-60
        ${isMobile ? (isMobileOpen ? 'translate-x-0' : '-translate-x-full') : 'translate-x-0'}
        ${!isMobile && isCollapsed ? 'lg:w-16' : 'lg:w-60'}
        flex-shrink-0
      `}
    >
      <div className="flex items-center h-16 px-4 flex-shrink-0 border-b border-gray-100 dark:border-gray-800">
        {isCollapsed && !isMobile ? (
          <span className="text-deep-green dark:text-white font-bold text-lg">K</span>
        ) : (
          <div>
            <p className="text-gray-900 dark:text-white font-bold text-lg leading-tight">Kratex</p>
            <p className="text-gray-500 dark:text-gray-500 text-xs leading-tight">Warehouse Management</p>
          </div>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {navConfig.map((item) => (
          <NavItem
            key={item.id}
            item={item}
            isCollapsed={isCollapsed}
            isMobile={isMobile}
            onNavigate={isMobile ? onCloseMobile : undefined}
            ordersTotal={item.id === 'orders' ? (ordersTotal ?? 0) : undefined}
          />
        ))}
      </nav>

      {/* Logout */}
      <div className="px-2 pb-4">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-500 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 transition-all duration-150"
        >
          <LogOut size={18} className="flex-shrink-0" />
          {!(isCollapsed && !isMobile) && <span>Logout</span>}
        </button>
      </div>
    </aside>
  )
}

export default Sidebar