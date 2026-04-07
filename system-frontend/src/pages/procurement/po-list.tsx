import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { format } from 'date-fns'
import { procurementApi } from '@/api/procurement'
import { warehouseApi } from '@/api/warehouse'
import { useAuthStore } from '@/stores/auth-store'
import { getApiErrorMessage } from '@/hooks/use-api-error'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { StatusBadge } from '@/components/shared/status-badge'
import { Pagination } from '@/components/shared/pagination'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { ErrorState } from '@/components/shared/error-state'
import { cn } from '@/lib/utils'
import type { PurchaseOrder, POStatus } from '@/types/procurement'

const STATUS_TABS: { value: POStatus | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'DRAFTED', label: 'Drafted' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'PARTIALLY_RECEIVED', label: 'Partially Received' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)

export function PurchaseOrderListPage() {
  const isAdmin = useAuthStore((s) => s.isAdmin)

  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<POStatus | ''>('')
  const [supplierId, setSupplierId] = useState('')
  const [warehouseId, setWarehouseId] = useState('')

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers'],
    queryFn: procurementApi.getSuppliers,
  })

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: warehouseApi.getWarehouses,
  })

  const {
    data: poData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['purchase-orders', page, status, supplierId, warehouseId],
    queryFn: () =>
      procurementApi.getPurchaseOrders({
        page,
        limit: 20,
        ...(status ? { status } : {}),
        ...(supplierId ? { supplierId } : {}),
        ...(warehouseId ? { warehouseId } : {}),
      }),
  })

  const columns = [
    {
      key: 'purchaseOrderId',
      header: 'PO ID',
      render: (row: PurchaseOrder) => (
        <Link
          to={`/procurement/purchase-orders/${row.purchaseOrderId}`}
          className="font-mono text-blue-600 hover:underline"
        >
          {row.purchaseOrderId.slice(0, 8)}…
        </Link>
      ),
    },
    {
      key: 'supplier',
      header: 'Supplier',
      render: (row: PurchaseOrder) =>
        row.supplierName ?? row.supplierId.slice(0, 8),
    },
    {
      key: 'warehouse',
      header: 'Warehouse',
      render: (row: PurchaseOrder) => {
        const wh = warehouses?.find((w) => w.warehouseId === row.warehouseId)
        return wh?.name ?? row.warehouseId.slice(0, 8)
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: PurchaseOrder) => <StatusBadge status={row.status} />,
    },
    {
      key: 'totalAmount',
      header: 'Total',
      render: (row: PurchaseOrder) => formatCurrency(row.totalAmount),
    },
    {
      key: 'expectedDelivery',
      header: 'Expected Delivery',
      render: (row: PurchaseOrder) =>
        row.expectedDelivery
          ? format(new Date(row.expectedDelivery), 'MMM d, yyyy')
          : '—',
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (row: PurchaseOrder) =>
        format(new Date(row.createdAt), 'MMM d, yyyy'),
    },
  ]

  return (
    <>
      <PageHeader
        title="Purchase Orders"
        actions={
          isAdmin() ? (
            <Link
              to="/procurement/purchase-orders/new"
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus size={16} />
              New PO
            </Link>
          ) : undefined
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-4">
        <select
          value={supplierId}
          onChange={(e) => {
            setSupplierId(e.target.value)
            setPage(1)
          }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">All Suppliers</option>
          {suppliers?.map((s) => (
            <option key={s.supplierId} value={s.supplierId}>
              {s.name}
            </option>
          ))}
        </select>

        <select
          value={warehouseId}
          onChange={(e) => {
            setWarehouseId(e.target.value)
            setPage(1)
          }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">All Warehouses</option>
          {warehouses?.map((w) => (
            <option key={w.warehouseId} value={w.warehouseId}>
              {w.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4 flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              setStatus(tab.value)
              setPage(1)
            }}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              status === tab.value
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <LoadingSpinner className="py-32" label="Loading purchase orders…" />
      ) : isError ? (
        <ErrorState message={getApiErrorMessage(error)} onRetry={refetch} />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={poData?.data ?? []}
            keyExtractor={(row) => row.purchaseOrderId}
            emptyMessage="No purchase orders found"
          />
          {poData && (
            <Pagination
              page={poData.pagination.page}
              totalPages={poData.pagination.totalPages}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </>
  )
}
