import { useQuery } from '@tanstack/react-query'
import { Loader2, FileText } from 'lucide-react'
import { procurementApi } from '../../services/axiosInstance'
import { springPageItems } from '../../utils/apiNormalize'

export default function PurchaseOrders() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: async () => {
      const r = await procurementApi.get('/purchase-orders', { params: { page: 1, limit: 50 } })
      return springPageItems(r.data)
    },
    staleTime: 30_000,
  })

  const rows = data ?? []

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-dark-base dark:text-white">Purchase orders</h1>
        <p className="text-sm text-gray-500 mt-0.5">POs from procurement service</p>
      </div>

      {isLoading && (
        <div className="app-card p-12 flex flex-col items-center gap-2">
          <Loader2 className="animate-spin text-medium-green" size={28} />
          <p className="text-sm text-gray-500">Loading purchase orders…</p>
        </div>
      )}

      {isError && (
        <div className="app-card p-6 border-red-200 text-red-600 text-sm">
          Failed to load purchase orders.{' '}
          <button type="button" onClick={() => refetch()} className="underline font-medium">
            Retry
          </button>
        </div>
      )}

      {!isLoading && !isError && (
        <div className="app-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">PO</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Supplier</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Warehouse</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Delivery</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                      No purchase orders
                    </td>
                  </tr>
                ) : (
                  rows.map((po) => (
                    <tr key={po.purchaseOrderId} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                      <td className="px-4 py-3 font-mono text-xs">
                        <span className="inline-flex items-center gap-2 text-dark-base dark:text-white">
                          <FileText size={14} className="text-medium-green" />
                          {String(po.purchaseOrderId).slice(0, 8)}…
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{String(po.supplierId).slice(0, 8)}…</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{String(po.warehouseId).slice(0, 8)}…</td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40">
                          {po.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {po.totalAmount != null ? Number(po.totalAmount).toFixed(2) : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{po.expectedDelivery ?? '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
