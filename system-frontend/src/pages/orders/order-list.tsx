import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Plus } from 'lucide-react'
import { ordersApi } from '@/api/orders'
import { warehouseApi } from '@/api/warehouse'
import { useAuthStore } from '@/stores/auth-store'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { StatusBadge } from '@/components/shared/status-badge'
import { Pagination } from '@/components/shared/pagination'
import { ErrorState } from '@/components/shared/error-state'
import type { Order, OrderStatus, OrderPriority } from '@/types/orders'

const STATUSES: (OrderStatus | 'ALL')[] = [
  'ALL',
  'DRAFT',
  'PENDING',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'FAILED',
]

const PRIORITIES: (OrderPriority | 'ALL')[] = ['ALL', 'STANDARD', 'HIGH', 'URGENT']

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)

export function OrderListPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const isAdmin = useAuthStore((s) => s.isAdmin)
  const isWarehouseStaff = useAuthStore((s) => s.isWarehouseStaff)

  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL')
  const [warehouseFilter, setWarehouseFilter] = useState<string>(
    isWarehouseStaff() ? (user?.warehouseId ?? '') : '',
  )
  const [page, setPage] = useState(1)

  const warehousesQuery = useQuery({
    queryKey: ['warehouses'],
    queryFn: warehouseApi.getWarehouses,
    enabled: isAdmin(),
  })

  const ordersQuery = useQuery({
    queryKey: [
      'orders',
      {
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        priority: priorityFilter !== 'ALL' ? priorityFilter : undefined,
        warehouseId: warehouseFilter || undefined,
        page,
      },
    ],
    queryFn: () =>
      ordersApi.getOrders({
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        priority: priorityFilter !== 'ALL' ? priorityFilter : undefined,
        warehouseId: warehouseFilter || undefined,
        page,
      }),
  })

  const orders = ordersQuery.data?.data ?? []
  const pagination = ordersQuery.data?.pagination

  const columns = [
    {
      key: 'orderId',
      header: 'Order ID',
      render: (row: Order & Record<string, unknown>) => (
        <Link
          to={`/orders/${row.orderId}`}
          className="font-medium text-blue-600 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {row.orderId.slice(0, 8)}…
        </Link>
      ),
    },
    {
      key: 'customerId',
      header: 'Customer',
      render: (row: Order & Record<string, unknown>) => (
        <span
          className="cursor-pointer"
          onClick={() => navigate(`/orders/${row.orderId}`)}
        >
          {row.customerId.slice(0, 8)}…
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: Order & Record<string, unknown>) => (
        <span
          className="cursor-pointer"
          onClick={() => navigate(`/orders/${row.orderId}`)}
        >
          <StatusBadge status={row.status} />
        </span>
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (row: Order & Record<string, unknown>) => (
        <span
          className="cursor-pointer"
          onClick={() => navigate(`/orders/${row.orderId}`)}
        >
          <StatusBadge status={row.priority} />
        </span>
      ),
    },
    {
      key: 'totalAmount',
      header: 'Total',
      render: (row: Order & Record<string, unknown>) => (
        <span
          className="cursor-pointer font-medium text-gray-900"
          onClick={() => navigate(`/orders/${row.orderId}`)}
        >
          {formatCurrency(row.totalAmount)}
        </span>
      ),
    },
    {
      key: 'expectedDelivery',
      header: 'Expected Delivery',
      render: (row: Order & Record<string, unknown>) => (
        <span
          className="cursor-pointer"
          onClick={() => navigate(`/orders/${row.orderId}`)}
        >
          {row.expectedDelivery
            ? format(new Date(row.expectedDelivery), 'MMM d, yyyy')
            : '—'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (row: Order & Record<string, unknown>) => (
        <span
          className="cursor-pointer"
          onClick={() => navigate(`/orders/${row.orderId}`)}
        >
          {format(new Date(row.createdAt), 'MMM d, yyyy')}
        </span>
      ),
    },
  ]

  if (ordersQuery.isError) {
    return (
      <div>
        <PageHeader title="Orders" />
        <div className="mt-6">
          <ErrorState
            message="Failed to load orders."
            onRetry={() => ordersQuery.refetch()}
          />
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Orders">
        {(isAdmin() || isWarehouseStaff()) && (
          <Link
            to="/orders/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
          >
            <Plus size={16} />
            New Order
          </Link>
        )}
      </PageHeader>

      <div className="mt-6 space-y-4">
        <div className="flex flex-wrap gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => {
                setStatusFilter(s)
                setPage(1)
              }}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {s === 'ALL' ? 'All' : s.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <select
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value)
              setPage(1)
            }}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p === 'ALL' ? 'All Priorities' : p}
              </option>
            ))}
          </select>

          {isAdmin() && (
            <select
              value={warehouseFilter}
              onChange={(e) => {
                setWarehouseFilter(e.target.value)
                setPage(1)
              }}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Warehouses</option>
              {(warehousesQuery.data ?? []).map((w) => (
                <option key={w.warehouseId} value={w.warehouseId}>
                  {w.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="mt-4">
        <DataTable
          columns={columns}
          data={orders as (Order & Record<string, unknown>)[]}
          loading={ordersQuery.isLoading}
          emptyMessage="No orders found"
          keyExtractor={(row) => (row as unknown as Order).orderId}
        />
      </div>

      {pagination && (
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  )
}
