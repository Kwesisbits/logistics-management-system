import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ShoppingCart,
  ClipboardList,
  Truck,
  Plus,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Calendar,
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

function useGreeting() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])
  const phrase = useMemo(() => {
    const h = now.getHours()
    if (h >= 5 && h < 12) return 'Good morning'
    if (h >= 12 && h < 17) return 'Good afternoon'
    return 'Good evening'
  }, [now])
  return { now, phrase }
}

function CountSkeleton() {
  return (
    <div className="space-y-2">
      <div className="h-8 w-16 rounded-lg bg-slate-200/90 animate-pulse" />
      <div className="h-3.5 w-28 max-w-full rounded-md bg-slate-100 animate-pulse-soft" />
    </div>
  )
}

export function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const isAdmin = useAuthStore((s) => s.isAdmin)
  const isWarehouseStaff = useAuthStore((s) => s.isWarehouseStaff)
  const { now, phrase } = useGreeting()

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
  const ordersTodayCount = ordersTodayQuery.data?.pagination?.total ?? 0
  const pendingReceiptsCount = pendingReceiptsQuery.data?.pagination?.total ?? 0
  const activePOsCount = activePOsQuery.data?.pagination?.total ?? 0

  const summaryCards = [
    {
      label: 'Low Stock Items',
      count: lowStockCount,
      icon: AlertTriangle,
      iconBg: lowStockCount > 0 ? 'bg-red-100' : 'bg-gray-100',
      iconColor: lowStockCount > 0 ? 'text-red-600' : 'text-gray-500',
      loading: lowStockQuery.isLoading,
      href: '/inventory/low-stock',
      accent: 'border-l-red-500',
    },
    {
      label: 'Orders Today',
      count: ordersTodayCount,
      icon: ShoppingCart,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      loading: ordersTodayQuery.isLoading,
      href: '/orders',
      accent: 'border-l-blue-500',
    },
    {
      label: 'Pending Receipts',
      count: pendingReceiptsCount,
      icon: ClipboardList,
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      loading: pendingReceiptsQuery.isLoading,
      href: '/warehouse/receipts',
      accent: 'border-l-amber-500',
    },
    {
      label: 'Active POs',
      count: activePOsCount,
      icon: Truck,
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      loading: activePOsQuery.isLoading,
      href: '/procurement/purchase-orders',
      accent: 'border-l-green-500',
    },
  ] as const

  const dateTimeActions = (
    <div className="flex w-full shrink-0 flex-col gap-3 rounded-xl border border-slate-200/60 bg-white/80 px-4 py-3 shadow-sm backdrop-blur-sm sm:w-auto sm:flex-row sm:items-center sm:gap-6">
      <div className="flex items-center gap-2 text-slate-700">
        <span className="flex size-9 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
          <Calendar className="size-4" aria-hidden />
        </span>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Date</p>
          <p className="text-sm font-semibold text-slate-900">{format(now, 'EEEE, MMMM d, yyyy')}</p>
        </div>
      </div>
      <div className="hidden h-10 w-px bg-slate-200 sm:block" aria-hidden />
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Time</p>
        <p className="font-mono text-lg font-semibold tabular-nums text-slate-900">
          {format(now, 'h:mm a')}
        </p>
      </div>
    </div>
  )

  return (
    <div className="pb-8">
      {/* Greeting */}
      <section className="mb-8 overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white via-slate-50/80 to-blue-50/40 p-6 shadow-sm sm:p-8">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-slate-600 shadow-sm ring-1 ring-slate-200/60 backdrop-blur-sm">
          <TrendingUp className="size-3.5 text-blue-600" aria-hidden />
          Operations overview
        </div>
        <PageHeader
          title={`${phrase}, ${user?.firstName ?? 'User'}`}
          description="Here's a snapshot of inventory, orders, warehouse receipts, and procurement so you can spot what needs attention."
          actions={dateTimeActions}
        />
      </section>

      {/* Summary Cards */}
      <div className="animate-slide-up grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <Link
            key={card.label}
            to={card.href}
            className={`group relative overflow-hidden rounded-xl border border-slate-200/80 border-l-4 bg-white p-5 shadow-sm transition-all duration-200 ease-out hover:scale-[1.02] hover:shadow-lg ${card.accent}`}
          >
            <div className="flex items-center gap-4">
              <div
                className={`flex size-12 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105 ${card.iconBg}`}
              >
                <card.icon size={22} className={card.iconColor} />
              </div>
              <div className="min-w-0 flex-1">
                {card.loading ? (
                  <CountSkeleton />
                ) : (
                  <>
                    <p className="text-2xl font-bold tracking-tight text-slate-900">{card.count}</p>
                    <p className="text-sm text-slate-500">{card.label}</p>
                  </>
                )}
              </div>
              <ArrowRight
                className="size-4 shrink-0 text-slate-300 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-slate-500"
                aria-hidden
              />
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      {(isAdmin() || isWarehouseStaff()) && (
        <div className="mt-10">
          <h2 className="mb-4 text-lg font-semibold tracking-tight text-slate-900">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            {isAdmin() && (
              <>
                <QuickAction
                  to="/inventory/products/new"
                  label="New Product"
                  gradientClass="from-violet-500 to-purple-600 shadow-violet-500/25"
                />
                <QuickAction
                  to="/procurement/purchase-orders/new"
                  label="New PO"
                  gradientClass="from-sky-500 to-blue-600 shadow-blue-500/25"
                />
                <QuickAction
                  to="/users/new"
                  label="New User"
                  gradientClass="from-rose-500 to-pink-600 shadow-rose-500/25"
                />
              </>
            )}
            {isWarehouseStaff() && (
              <>
                <QuickAction
                  to="/warehouse/receipts/new"
                  label="Receive Goods"
                  gradientClass="from-amber-500 to-orange-600 shadow-amber-500/25"
                />
                <QuickAction
                  to="/orders/new"
                  label="New Order"
                  gradientClass="from-emerald-500 to-teal-600 shadow-emerald-500/25"
                />
                <QuickAction
                  to="/warehouse/receipts/new"
                  label="New Receipt"
                  gradientClass="from-cyan-500 to-sky-600 shadow-cyan-500/25"
                />
              </>
            )}
          </div>
        </div>
      )}

      {/* Recent Orders */}
      <div className="mt-10">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">Recent Orders</h2>
          <Link
            to="/orders"
            className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 transition-colors hover:text-blue-700"
          >
            View all orders
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          {recentOrdersQuery.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner label="Loading orders…" />
            </div>
          ) : recentOrdersQuery.isError ? (
            <div className="px-6 py-12 text-center text-sm text-red-600">
              Failed to load recent orders.
            </div>
          ) : !recentOrdersQuery.data?.data?.length ? (
            <div className="px-6 py-12 text-center text-sm text-slate-500">No orders found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 text-slate-700">
                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Order ID
                    </th>
                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Status
                    </th>
                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Priority
                    </th>
                    <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Total
                    </th>
                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(recentOrdersQuery.data?.data ?? []).map((order, index) => (
                    <tr
                      key={order.orderId}
                      className={`border-t border-slate-100 transition-colors hover:bg-blue-50/40 ${
                        index % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'
                      }`}
                    >
                      <td className="px-5 py-3.5">
                        <Link
                          to={`/orders/${order.orderId}`}
                          className="font-medium text-blue-600 hover:underline"
                        >
                          {order.orderId.slice(0, 8)}…
                        </Link>
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={order.priority} />
                      </td>
                      <td className="px-5 py-3.5 text-right font-medium text-slate-900">
                        ${order.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">
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

export function QuickAction({
  to,
  label,
  gradientClass,
}: {
  to: string
  label: string
  gradientClass: string
}) {
  return (
    <Link
      to={to}
      className={`inline-flex items-center gap-2 rounded-full bg-gradient-to-r px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:scale-[1.03] hover:shadow-lg active:scale-[0.99] ${gradientClass}`}
    >
      <Plus className="size-4 shrink-0 opacity-90" aria-hidden />
      {label}
    </Link>
  )
}
