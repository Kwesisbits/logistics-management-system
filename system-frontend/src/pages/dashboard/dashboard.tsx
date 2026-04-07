import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ShoppingCart,
  ClipboardList,
  Truck,
  Plus,
  AlertTriangle,
} from 'lucide-react'
import { format } from 'date-fns'
import { inventoryApi } from '@/api/inventory'
import { ordersApi } from '@/api/orders'
import { warehouseApi } from '@/api/warehouse'
import { procurementApi } from '@/api/procurement'
import { useAuthStore } from '@/stores/auth-store'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { LoadingSpinner } from '@/components/shared/loading-spinner'

export function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const isAdmin = useAuthStore((s) => s.isAdmin)
  const isWarehouseStaff = useAuthStore((s) => s.isWarehouseStaff)

  const lowStockQuery = useQuery({
    queryKey: ['low-stock'],
    queryFn: () => inventoryApi.getLowStock(),
    refetchInterval: 60000,
  })

  const ordersTodayQuery = useQuery({
    queryKey: ['orders', { page: 1, limit: 1 }],
    queryFn: () => ordersApi.getOrders({ page: 1, limit: 1 }),
  })

  const pendingReceiptsQuery = useQuery({
    queryKey: ['receipts', { status: 'PENDING', page: 1, limit: 1 }],
    queryFn: () => warehouseApi.getReceipts({ status: 'PENDING', page: 1, limit: 1 }),
  })

  const activePOsQuery = useQuery({
    queryKey: ['purchase-orders', { status: 'SUBMITTED', page: 1, limit: 1 }],
    queryFn: () => procurementApi.getPurchaseOrders({ status: 'SUBMITTED', page: 1, limit: 1 }),
  })

  const recentOrdersQuery = useQuery({
    queryKey: ['orders', { page: 1, limit: 5, sortBy: 'createdAt', order: 'desc' }],
    queryFn: () =>
      ordersApi.getOrders({ page: 1, limit: 5, sortBy: 'createdAt', order: 'desc' }),
  })

  const lowStockCount = lowStockQuery.data?.length ?? 0
  const ordersTodayCount = ordersTodayQuery.data?.pagination.total ?? 0
  const pendingReceiptsCount = pendingReceiptsQuery.data?.pagination.total ?? 0
  const activePOsCount = activePOsQuery.data?.pagination.total ?? 0

  const summaryCards = [
    {
      label: 'Low Stock Items',
      count: lowStockCount,
      icon: AlertTriangle,
      iconBg: lowStockCount > 0 ? 'bg-red-100' : 'bg-gray-100',
      iconColor: lowStockCount > 0 ? 'text-red-600' : 'text-gray-500',
      loading: lowStockQuery.isLoading,
      href: '/inventory/low-stock',
    },
    {
      label: 'Orders Today',
      count: ordersTodayCount,
      icon: ShoppingCart,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      loading: ordersTodayQuery.isLoading,
      href: '/orders',
    },
    {
      label: 'Pending Receipts',
      count: pendingReceiptsCount,
      icon: ClipboardList,
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      loading: pendingReceiptsQuery.isLoading,
      href: '/warehouse/receipts',
    },
    {
      label: 'Active POs',
      count: activePOsCount,
      icon: Truck,
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      loading: activePOsQuery.isLoading,
      href: '/procurement/purchase-orders',
    },
  ]

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user?.firstName ?? 'User'}`}
        description="Here's an overview of your logistics operations."
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <Link
            key={card.label}
            to={card.href}
            className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex items-center gap-4">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${card.iconBg}`}
              >
                <card.icon size={20} className={card.iconColor} />
              </div>
              <div>
                {card.loading ? (
                  <LoadingSpinner size={20} />
                ) : (
                  <p className="text-2xl font-bold text-gray-900">{card.count}</p>
                )}
                <p className="text-sm text-gray-500">{card.label}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      {(isAdmin() || isWarehouseStaff()) && (
        <div className="mt-8">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            {isAdmin() && (
              <>
                <QuickAction to="/inventory/products/new" label="New Product" />
                <QuickAction to="/procurement/purchase-orders/new" label="New PO" />
                <QuickAction to="/users/new" label="New User" />
              </>
            )}
            {isWarehouseStaff() && (
              <>
                <QuickAction to="/warehouse/receipts/new" label="Receive Goods" />
                <QuickAction to="/orders/new" label="New Order" />
                <QuickAction to="/warehouse/receipts/new" label="New Receipt" />
              </>
            )}
          </div>
        </div>
      )}

      {/* Recent Orders */}
      <div className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Recent Orders</h2>
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          {recentOrdersQuery.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner label="Loading orders…" />
            </div>
          ) : recentOrdersQuery.isError ? (
            <div className="px-6 py-12 text-center text-sm text-red-600">
              Failed to load recent orders.
            </div>
          ) : !recentOrdersQuery.data?.data.length ? (
            <div className="px-6 py-12 text-center text-sm text-gray-500">
              No orders found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 font-medium text-gray-600">Order ID</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Priority</th>
                    <th className="px-4 py-3 font-medium text-gray-600 text-right">Total</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentOrdersQuery.data.data.map((order) => (
                    <tr key={order.orderId} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link
                          to={`/orders/${order.orderId}`}
                          className="font-medium text-blue-600 hover:underline"
                        >
                          {order.orderId.slice(0, 8)}…
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={order.priority} />
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">
                        ${order.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {format(new Date(order.createdAt), 'MMM d, yyyy')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function QuickAction({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
    >
      <Plus size={16} />
      {label}
    </Link>
  )
}
