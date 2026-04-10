import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'

import Sidebar     from './components/Sidebar'
import Navbar      from './components/Navbar'
import ThemeToggle from './components/ThemeToggle'
import Login       from './pages/Login'
import Dashboard   from './pages/Dashboard'
import Users       from './pages/Users'
import useAuthStore from './store/authStore'

// Inventory sub-pages
import Products    from './pages/inventory/Products'
import StockLevels from './pages/inventory/StockLevels'
import LowStock    from './pages/inventory/LowStock'
import Batches     from './pages/inventory/Batches'

// Orders sub-pages
import AllOrders   from './pages/orders/AllOrders'
import CreateOrder from './pages/orders/CreateOrder'

// Warehouse sub-pages
import Warehouses  from './pages/warehouse/Warehouses'
import Locations   from './pages/warehouse/Locations'
import Receipts    from './pages/warehouse/Receipts'
import Dispatch    from './pages/warehouse/Dispatch'
import Movements   from './pages/warehouse/Movements'

// Procurement sub-pages
import Suppliers      from './pages/procurement/Suppliers'
import PurchaseOrders from './pages/procurement/PurchaseOrders'

// Reports sub-pages
import InventoryReport   from './pages/reports/InventoryReport'
import MovementsReport   from './pages/reports/MovementsReport'
import OrdersReport      from './pages/reports/OrdersReport'
import ProcurementReport from './pages/reports/ProcurementReport'

const pageTitles = {
  '/dashboard':                      'Dashboard',
  '/inventory/products':             'Products',
  '/inventory/stock':                'Stock Levels',
  '/inventory/low-stock':            'Low Stock',
  '/inventory/batches':              'Batches',
  '/orders':                         'All Orders',
  '/orders/new':                     'Create Order',
  '/warehouse/warehouses':           'Warehouses',
  '/warehouse/locations':            'Locations',
  '/warehouse/receipts':             'Receipts',
  '/warehouse/dispatch':             'Dispatch',
  '/warehouse/movements':            'Movements',
  '/procurement/suppliers':          'Suppliers',
  '/procurement/purchase-orders':    'Purchase Orders',
  '/reports/inventory':              'Inventory Report',
  '/reports/movements':              'Movements Report',
  '/reports/orders':                 'Orders Report',
  '/reports/procurement':            'Procurement Report',
  '/users':                          'User Management',
}

function ProtectedRoute({ children }) {
  const accessToken = useAuthStore((state) => state.accessToken)
  if (!accessToken) return <Navigate to="/login" replace />
  return children
}

function RoleRoute({ allowedRoles, children }) {
  const user = useAuthStore((state) => state.user)
  if (!user || !allowedRoles.includes(user.roleName)) {
    return <Navigate to="/unauthorized" replace />
  }
  return children
}

function UnauthorizedPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-light-bg dark:bg-gray-950 p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 text-center shadow-sm dark:shadow-gray-900/40">
        <h1 className="text-xl font-bold text-dark-base dark:text-white mb-2">Unauthorized</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">You do not have permission to access this page.</p>
      </div>
    </div>
  )
}

function AppLayout({ isMobile, isSidebarCollapsed, isMobileSidebarOpen, toggleSidebar, closeMobileSidebar }) {
  const location = useLocation()
  const pageTitle = pageTitles[location.pathname] || 'Dashboard'

  return (
    <div className="flex h-screen overflow-hidden bg-light-bg dark:bg-gray-950">
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        isMobile={isMobile}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={closeMobileSidebar}
      />

      {isMobile && isMobileSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={closeMobileSidebar}
        />
      )}

      <div className="flex flex-col flex-1 overflow-hidden">
        <Navbar
          pageTitle={pageTitle}
          onToggleSidebar={toggleSidebar}
        />

        <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6">
          <Routes>
            <Route path="/"            element={<Navigate to="/dashboard" />} />
            <Route path="/dashboard"   element={<Dashboard />} />
            <Route path="/users"       element={<RoleRoute allowedRoles={['ADMIN']}><Users /></RoleRoute>} />

            {/* Inventory */}
            <Route path="/inventory/products"  element={<Products />} />
            <Route path="/inventory/stock"     element={<StockLevels />} />
            <Route path="/inventory/low-stock" element={<LowStock />} />
            <Route path="/inventory/batches"   element={<Batches />} />

            {/* Orders */}
            <Route path="/orders"     element={<AllOrders />} />
            <Route path="/orders/new" element={<RoleRoute allowedRoles={['ADMIN', 'WAREHOUSE_STAFF']}><CreateOrder /></RoleRoute>} />

            {/* Warehouse */}
            <Route path="/warehouse/warehouses" element={<RoleRoute allowedRoles={['ADMIN']}><Warehouses /></RoleRoute>} />
            <Route path="/warehouse/locations"  element={<RoleRoute allowedRoles={['ADMIN']}><Locations /></RoleRoute>} />
            <Route path="/warehouse/receipts"   element={<Receipts />} />
            <Route path="/warehouse/dispatch"   element={<RoleRoute allowedRoles={['ADMIN', 'WAREHOUSE_STAFF']}><Dispatch /></RoleRoute>} />
            <Route path="/warehouse/movements"  element={<Movements />} />

            {/* Procurement */}
            <Route path="/procurement/suppliers"       element={<RoleRoute allowedRoles={['ADMIN', 'VIEWER']}><Suppliers /></RoleRoute>} />
            <Route path="/procurement/purchase-orders" element={<RoleRoute allowedRoles={['ADMIN', 'VIEWER']}><PurchaseOrders /></RoleRoute>} />

            {/* Reports */}
            <Route path="/reports/inventory"   element={<InventoryReport />} />
            <Route path="/reports/movements"   element={<MovementsReport />} />
            <Route path="/reports/orders"      element={<RoleRoute allowedRoles={['ADMIN']}><OrdersReport /></RoleRoute>} />
            <Route path="/reports/procurement" element={<RoleRoute allowedRoles={['ADMIN']}><ProcurementReport /></RoleRoute>} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

function App() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth < 1024
      setIsMobile(mobile)
      if (!mobile) setIsMobileSidebarOpen(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const toggleSidebar = () => {
    if (isMobile) setIsMobileSidebarOpen((prev) => !prev)
    else setIsSidebarCollapsed((prev) => !prev)
  }

  const closeMobileSidebar = () => setIsMobileSidebarOpen(false)

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <AppLayout
                isMobile={isMobile}
                isSidebarCollapsed={isSidebarCollapsed}
                isMobileSidebarOpen={isMobileSidebarOpen}
                toggleSidebar={toggleSidebar}
                closeMobileSidebar={closeMobileSidebar}
              />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App