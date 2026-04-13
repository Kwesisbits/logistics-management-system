import { useQuery } from '@tanstack/react-query'
import { Loader2, ArrowLeftRight } from 'lucide-react'
import { reportingApi } from '../../services/axiosInstance'
import { springPageItems } from '../../utils/apiNormalize'

export default function MovementsReport() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['reports', 'movements-history'],
    queryFn: async () => {
      const r = await reportingApi.get('/movements/history', { params: { page: 1, limit: 50 } })
      return r.data
    },
    staleTime: 60_000,
  })

  const rows = springPageItems(data)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-dark-base dark:text-white">Movement history</h1>
        <p className="text-sm text-gray-500 mt-0.5">Aggregated movement aggregates from reporting DB</p>
      </div>

      {isLoading && (
        <div className="app-card p-12 flex flex-col items-center gap-2">
          <Loader2 className="animate-spin text-medium-green" size={28} />
          <p className="text-sm text-gray-500">Loading…</p>
        </div>
      )}

      {isError && (
        <div className="app-card p-6 border-red-200 text-red-600 text-sm">
          Failed to load report.{' '}
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
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Period</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Warehouse</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Inbound</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Outbound</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                      No movement aggregates yet
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.aggId} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {row.periodStart ? new Date(row.periodStart).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-dark-base dark:text-white">
                        <span className="inline-flex items-center gap-1">
                          <ArrowLeftRight size={12} className="text-medium-green" />
                          {String(row.productId).slice(0, 8)}…
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{String(row.warehouseId).slice(0, 8)}…</td>
                      <td className="px-4 py-3 text-right tabular-nums text-emerald-600">{row.totalInbound ?? 0}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-amber-600">{row.totalOutbound ?? 0}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium">{row.netChange ?? 0}</td>
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
