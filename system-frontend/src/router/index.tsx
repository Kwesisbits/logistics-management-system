import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AuthGuard, RoleGuard } from './guards'
import { AppLayout } from '@/components/layout/app-layout'
import { LoginPage } from '@/pages/auth/login'
import { UnauthorizedPage } from '@/pages/auth/unauthorized'
import { NotFoundPage } from '@/pages/auth/not-found'
import { DashboardPage } from '@/pages/dashboard/dashboard'
import { ProductListPage } from '@/pages/inventory/product-list'
import { ProductFormPage } from '@/pages/inventory/product-form'
import { StockLevelsPage } from '@/pages/inventory/stock-levels'
import { LowStockPage } from '@/pages/inventory/low-stock'
import { BatchListPage } from '@/pages/inventory/batch-list'
import { WarehouseListPage } from '@/pages/warehouse/warehouse-list'
import { LocationListPage } from '@/pages/warehouse/location-list'
import { ReceiptListPage } from '@/pages/warehouse/receipt-list'
import { ReceiptCreatePage } from '@/pages/warehouse/receipt-create'
import { MovementListPage } from '@/pages/warehouse/movement-list'
import { OrderListPage } from '@/pages/orders/order-list'
import { OrderDetailPage } from '@/pages/orders/order-detail'
import { OrderCreatePage } from '@/pages/orders/order-create'
import { SupplierListPage } from '@/pages/procurement/supplier-list'
import { PurchaseOrderListPage } from '@/pages/procurement/po-list'
import { PurchaseOrderDetailPage } from '@/pages/procurement/po-detail'
import { PurchaseOrderCreatePage } from '@/pages/procurement/po-create'
import { ReportsPage } from '@/pages/reports/reports'
import { UserListPage } from '@/pages/users/user-list'
import { UserCreatePage } from '@/pages/users/user-create'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/unauthorized', element: <UnauthorizedPage /> },
  {
    path: '/',
    element: (
      <AuthGuard>
        <AppLayout />
      </AuthGuard>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },

      { path: 'inventory/products', element: <ProductListPage /> },
      { path: 'inventory/products/new', element: <RoleGuard roles={['ADMIN']}><ProductFormPage /></RoleGuard> },
      { path: 'inventory/products/:productId/edit', element: <RoleGuard roles={['ADMIN']}><ProductFormPage /></RoleGuard> },
      { path: 'inventory/stock', element: <StockLevelsPage /> },
      { path: 'inventory/low-stock', element: <LowStockPage /> },
      { path: 'inventory/batches', element: <BatchListPage /> },

      { path: 'warehouse/warehouses', element: <WarehouseListPage /> },
      { path: 'warehouse/locations', element: <LocationListPage /> },
      { path: 'warehouse/receipts', element: <ReceiptListPage /> },
      { path: 'warehouse/receipts/new', element: <RoleGuard roles={['ADMIN', 'WAREHOUSE_STAFF']}><ReceiptCreatePage /></RoleGuard> },
      { path: 'warehouse/movements', element: <MovementListPage /> },

      { path: 'orders', element: <OrderListPage /> },
      { path: 'orders/new', element: <RoleGuard roles={['ADMIN', 'WAREHOUSE_STAFF']}><OrderCreatePage /></RoleGuard> },
      { path: 'orders/:orderId', element: <OrderDetailPage /> },

      { path: 'procurement/suppliers', element: <SupplierListPage /> },
      { path: 'procurement/purchase-orders', element: <PurchaseOrderListPage /> },
      { path: 'procurement/purchase-orders/new', element: <RoleGuard roles={['ADMIN']}><PurchaseOrderCreatePage /></RoleGuard> },
      { path: 'procurement/purchase-orders/:poId', element: <PurchaseOrderDetailPage /> },

      { path: 'reports', element: <ReportsPage /> },

      { path: 'users', element: <RoleGuard roles={['ADMIN']}><UserListPage /></RoleGuard> },
      { path: 'users/new', element: <RoleGuard roles={['ADMIN']}><UserCreatePage /></RoleGuard> },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
])
