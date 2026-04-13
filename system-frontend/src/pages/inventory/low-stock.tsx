import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { inventoryApi } from '@/api/inventory'
import { warehouseApi } from '@/api/warehouse'
import { PageHeader } from '@/components/shared/page-header'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { EmptyState } from '@/components/shared/empty-state'
import { ErrorState } from '@/components/shared/error-state'
import { useAuthStore } from '@/stores/auth-store'
import { getApiErrorMessage } from '@/hooks/use-api-error'
import type { LowStockItem } from '@/types/inventory'

export function LowStockPage() {
  const [warehouseId, setWarehouseId] = useState('')

  const isWarehouseStaff = useAuthStore((s) => s.isWarehouseStaff)
  const getWarehouseId = useAuthStore((s) => s.getWarehouseId)

  useEffect(() => {
    if (isWarehouseStaff()) {
      const wid = getWarehouseId()
      if (wid) setWarehouseId(wid)
    }
  }, [isWarehouseStaff, getWarehouseId])

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehouseApi.getWarehouses(),
  })

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['low-stock', warehouseId],
    queryFn: () => inventoryApi.getLowStock(warehouseId || undefined),
    refetchInterval: 60000,
  })

  function severityClass(item: LowStockItem) {
    const deficit = item.reorderThreshold - item.currentStock
    const ratio = item.reorderThreshold > 0 ? deficit / item.reorderThreshold : 1
    if (item.currentStock === 0 || ratio >= 0.75) return 'bg-red-50'
    if (ratio >= 0.4) return 'bg-amber-50'
    return 'bg-amber-50/50'
  }

  if (isError) {
    return <ErrorState message={getApiErrorMessage(error)} onRetry={refetch} />
  }

  const headers = [
    'Product',
    'SKU',
    'Warehouse',
    'Current Stock',
    'Reorder Threshold',
    'Deficit',
  ]

  return (
    <div>
      <PageHeader title="Low Stock Alerts" />

      <div className="mb-4">
        <select
          value={warehouseId}
          onChange={(e) => setWarehouseId(e.target.value)}
          disabled={isWarehouseStaff()}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
        >
          <option value="">All Warehouses</option>
          {warehouses?.map((w) => (
            <option key={w.warehouseId} value={w.warehouseId}>
              {w.name}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <LoadingSpinner className="py-32" label="Loading low stock data..." />
      ) : !data || data.length === 0 ? (
        <EmptyState title="No low stock alerts" description="All products are sufficiently stocked." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                {headers.map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-xs font-medium tracking-wide text-gray-500 uppercase"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((row: LowStockItem) => (
                <tr
                  key={`${row.productId}-${row.warehouseId}`}
                  className={severityClass(row)}
                >
                  <td className="px-4 py-3 font-medium text-gray-900">{row.productName}</td>
                  <td className="px-4 py-3 text-gray-700">{row.sku}</td>
                  <td className="px-4 py-3 text-gray-700">{row.warehouseName}</td>
                  <td className="px-4 py-3 text-gray-700">{row.currentStock}</td>
                  <td className="px-4 py-3 text-gray-700">{row.reorderThreshold}</td>
                  <td className="px-4 py-3 font-semibold text-red-600">
                    -{row.reorderThreshold - row.currentStock}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
