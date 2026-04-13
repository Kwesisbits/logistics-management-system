import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Download } from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts'
import { reportsApi } from '@/api/reports'
import { warehouseApi } from '@/api/warehouse'
import { useAuthStore } from '@/stores/auth-store'
import { useUIStore } from '@/stores/ui-store'
import { getApiErrorMessage } from '@/hooks/use-api-error'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { Pagination } from '@/components/shared/pagination'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { EmptyState } from '@/components/shared/empty-state'
import { ErrorState } from '@/components/shared/error-state'
import { cn } from '@/lib/utils'
import type { InventorySnapshot } from '@/types/reports'

type Tab = 'inventory' | 'movements' | 'orders'

const TABS: { value: Tab; label: string }[] = [
  { value: 'inventory', label: 'Inventory Snapshot' },
  { value: 'movements', label: 'Movement Trends' },
  { value: 'orders', label: 'Order Summary' },
]

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)

export function ReportsPage() {
  const isAdmin = useAuthStore((s) => s.isAdmin)
  const addToast = useUIStore((s) => s.addToast)

  const [activeTab, setActiveTab] = useState<Tab>('inventory')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [warehouseId, setWarehouseId] = useState('')
  const [page, setPage] = useState(1)

  const filterParams = {
    ...(warehouseId ? { warehouseId } : {}),
    ...(dateFrom ? { from: dateFrom } : {}),
    ...(dateTo ? { to: dateTo } : {}),
  }

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehouseApi.getWarehouses(),
  })

  const {
    data: inventoryData,
    isLoading: inventoryLoading,
    isError: inventoryError,
    error: inventoryErr,
    refetch: refetchInventory,
  } = useQuery({
    queryKey: ['inventory-snapshot', warehouseId, page],
    queryFn: () =>
      reportsApi.getInventorySnapshot({
        page,
        limit: 20,
        ...(warehouseId ? { warehouseId } : {}),
      }),
    enabled: activeTab === 'inventory',
  })

  const {
    data: trends,
    isLoading: trendsLoading,
    isError: trendsError,
    error: trendsErr,
    refetch: refetchTrends,
  } = useQuery({
    queryKey: ['movement-trends', warehouseId, dateFrom, dateTo],
    queryFn: () => reportsApi.getMovementTrends(filterParams),
    enabled: activeTab === 'movements',
  })

  const {
    data: orderSummary,
    isLoading: ordersLoading,
    isError: ordersError,
    error: ordersErr,
    refetch: refetchOrders,
  } = useQuery({
    queryKey: ['order-summary', warehouseId, dateFrom, dateTo],
    queryFn: () => reportsApi.getOrderSummary(filterParams),
    enabled: activeTab === 'orders',
  })

  const { data: fulfilmentRate } = useQuery({
    queryKey: ['fulfilment-rate', warehouseId, dateFrom, dateTo],
    queryFn: () => reportsApi.getFulfilmentRate(filterParams),
    enabled: isAdmin() && activeTab === 'orders',
  })

  const handleExport = async () => {
    try {
      const data = await reportsApi.exportReport('inventory', filterParams)
      const blob =
        data instanceof Blob ? data : new Blob([data], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `inventory-snapshot-${format(new Date(), 'yyyy-MM-dd')}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      addToast('success', 'Report exported successfully')
    } catch (err) {
      addToast('error', getApiErrorMessage(err))
    }
  }

  const inventoryColumns = [
    {
      key: 'productName',
      header: 'Product',
      render: (row: InventorySnapshot) => row.productName,
    },
    { key: 'sku', header: 'SKU' },
    {
      key: 'warehouseName',
      header: 'Warehouse',
      render: (row: InventorySnapshot) => row.warehouseName,
    },
    { key: 'onHand', header: 'On Hand' },
    { key: 'reserved', header: 'Reserved' },
    { key: 'available', header: 'Available' },
  ]

  const statusChartData = orderSummary
    ? Object.entries(orderSummary.byStatus).map(([name, value]) => ({
        name: name.replace(/_/g, ' '),
        count: value,
      }))
    : []

  return (
    <>
      <PageHeader title="Reports" />

      <div className="mb-4 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500">
            From
          </label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500">
            Warehouse
          </label>
          <select
            value={warehouseId}
            onChange={(e) => {
              setWarehouseId(e.target.value)
              setPage(1)
            }}
            className="mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">All Warehouses</option>
            {warehouses?.map((w) => (
              <option key={w.warehouseId} value={w.warehouseId}>
                {w.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-6 flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={cn(
              'rounded-md px-4 py-2 text-sm font-medium transition-colors',
              activeTab === tab.value
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'inventory' && (
        <>
          {isAdmin() && (
            <div className="mb-4 flex justify-end">
              <button
                onClick={handleExport}
                className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <Download size={16} />
                Export CSV
              </button>
            </div>
          )}

          {inventoryLoading ? (
            <LoadingSpinner
              className="py-16"
              label="Loading inventory snapshot…"
            />
          ) : inventoryError ? (
            <ErrorState
              message={getApiErrorMessage(inventoryErr)}
              onRetry={refetchInventory}
            />
          ) : (
            <>
              <DataTable
                columns={inventoryColumns}
                data={inventoryData?.data ?? []}
                keyExtractor={(row) =>
                  `${row.productId}-${row.warehouseId}`
                }
                emptyMessage="No inventory data available"
              />
              {inventoryData && (
                <Pagination
                  page={inventoryData.pagination.page}
                  totalPages={inventoryData.pagination.totalPages}
                  onPageChange={setPage}
                />
              )}
            </>
          )}
        </>
      )}

      {activeTab === 'movements' && (
        <>
          {trendsLoading ? (
            <LoadingSpinner
              className="py-16"
              label="Loading movement trends…"
            />
          ) : trendsError ? (
            <ErrorState
              message={getApiErrorMessage(trendsErr)}
              onRetry={refetchTrends}
            />
          ) : !trends || trends.length === 0 ? (
            <EmptyState title="No movement data for the selected period" />
          ) : (
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(d: string) =>
                      format(new Date(d), 'MMM d')
                    }
                  />
                  <YAxis />
                  <Tooltip
                    labelFormatter={(d) =>
                      format(new Date(String(d)), 'MMM d, yyyy')
                    }
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="inbound"
                    stroke="#3b82f6"
                    name="Inbound"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="outbound"
                    stroke="#ef4444"
                    name="Outbound"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}

      {activeTab === 'orders' && (
        <>
          {ordersLoading ? (
            <LoadingSpinner
              className="py-16"
              label="Loading order summary…"
            />
          ) : ordersError ? (
            <ErrorState
              message={getApiErrorMessage(ordersErr)}
              onRetry={refetchOrders}
            />
          ) : !orderSummary ? (
            <EmptyState title="No order data available" />
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-lg border border-gray-200 bg-white p-5">
                  <p className="text-sm font-medium text-gray-500">
                    Total Orders
                  </p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">
                    {orderSummary.totalOrders.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-5">
                  <p className="text-sm font-medium text-gray-500">
                    Total Revenue
                  </p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">
                    {formatCurrency(orderSummary.totalRevenue)}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-5">
                  <p className="text-sm font-medium text-gray-500">
                    Average Order Value
                  </p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">
                    {formatCurrency(orderSummary.averageOrderValue)}
                  </p>
                </div>
              </div>

              {isAdmin() && fulfilmentRate && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-5">
                  <p className="text-sm font-medium text-blue-700">
                    Fulfilment Rate
                  </p>
                  <p className="mt-1 text-2xl font-bold text-blue-900">
                    {(fulfilmentRate.rate * 100).toFixed(1)}%
                  </p>
                  <p className="mt-1 text-sm text-blue-600">
                    {fulfilmentRate.fulfilled} of {fulfilmentRate.total} orders
                    fulfilled
                    {fulfilmentRate.period && ` — ${fulfilmentRate.period}`}
                  </p>
                </div>
              )}

              {statusChartData.length > 0 && (
                <div className="rounded-lg border border-gray-200 bg-white p-6">
                  <h3 className="mb-4 text-sm font-medium text-gray-900">
                    Orders by Status
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={statusChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar
                        dataKey="count"
                        fill="#3b82f6"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </>
  )
}
