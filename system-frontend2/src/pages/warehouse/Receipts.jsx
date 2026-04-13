import { useQuery } from '@tanstack/react-query'
import { Loader2, ClipboardList } from 'lucide-react'
import useAuthStore from '../../store/authStore'
import { warehouseApi } from '../../services/axiosInstance'
import { springPageItems } from '../../utils/apiNormalize'

export default function Receipts() {
  const user = useAuthStore((s) => s.user)
  const staffWid = user?.roleName === 'WAREHOUSE_STAFF' ? user?.warehouseId : undefined

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['receipts', staffWid],
    queryFn: async () => {
      const r = await warehouseApi.get('/receipts', {
        params: { page: 1, limit: 50, warehouseId: staffWid || undefined },
      })
      return springPageItems(r.data)
    },
    staleTime: 60_000,
  })

  const rows = data ?? []

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-dark-base dark:text-white">Inbound receipts</h1>
        <p className="text-sm text-gray-500 mt-0.5">Goods receipt records</p>
      </div>

      {isLoading && (
        <div className="app-card p-12 flex flex-col items-center gap-2">
          <Loader2 className="animate-spin text-medium-green" size={28} />
          <p className="text-sm text-gray-500">Loading receipts…</p>
        </div>
      )}

      {isError && (
        <div className="app-card p-6 border-red-200 text-red-600 text-sm">
          Failed to load receipts.{' '}
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
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Receipt</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">PO</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Warehouse</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Lines</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-gray-400">
                      No receipts found
                    </td>
                  </tr>
                ) : (
                  rows.map((rec) => (
                    <tr key={rec.receiptId} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                      <td className="px-4 py-3 font-mono text-xs">
                        <span className="inline-flex items-center gap-2 text-dark-base dark:text-white">
                          <ClipboardList size={14} className="text-medium-green" />
                          {String(rec.receiptId).slice(0, 8)}…
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{String(rec.purchaseOrderId).slice(0, 8)}…</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{String(rec.warehouseId).slice(0, 8)}…</td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40">
                          {rec.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{rec.lines?.length ?? 0}</td>
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
