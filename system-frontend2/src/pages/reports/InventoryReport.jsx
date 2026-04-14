import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Package } from 'lucide-react'
import { reportingApi } from '../../services/axiosInstance'
import { springPageItems } from '../../utils/apiNormalize'

function SparklineCell({ productId }) {
  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'sparkline', productId],
    queryFn: async () => {
      const r = await reportingApi.get(`/inventory/product/${productId}/sparkline`, { params: { days: 7 } })
      return Array.isArray(r.data) ? r.data : []
    },
    enabled: Boolean(productId),
    staleTime: 60_000,
  })

  if (isLoading) {
    return <span className="text-[10px] text-gray-400">…</span>
  }
  const vals = data ?? []
  if (vals.length === 0) {
    return <span className="text-[10px] text-gray-400">—</span>
  }
  const max = Math.max(...vals, 1)
  const w = 80
  const h = 28
  const pad = 2
  const pts = vals
    .map((v, i) => {
      const x = pad + (i / Math.max(vals.length - 1, 1)) * (w - pad * 2)
      const y = pad + (1 - v / max) * (h - pad * 2)
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg width={w} height={h} className="text-medium-green overflow-visible">
      <polyline fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" points={pts} />
    </svg>
  )
}

export default function InventoryReport() {
  const defaultTo = useMemo(() => new Date(), [])
  const defaultFrom = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d
  }, [])

  const [from, setFrom] = useState(() => defaultFrom.toISOString().slice(0, 10))
  const [to, setTo] = useState(() => defaultTo.toISOString().slice(0, 10))

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['reports', 'inventory-snapshot'],
    queryFn: async () => {
      const r = await reportingApi.get('/inventory/snapshot', { params: { page: 1, limit: 200 } })
      return r.data
    },
    staleTime: 60_000,
  })

  const rows = springPageItems(data)

  const filtered = useMemo(() => {
    const start = new Date(from)
    const end = new Date(to)
    end.setHours(23, 59, 59, 999)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return rows
    return rows.filter((row) => {
      if (!row.snapshotAt) return true
      const t = new Date(row.snapshotAt).getTime()
      return t >= start.getTime() && t <= end.getTime()
    })
  }, [rows, from, to])

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-dark-base dark:text-white">Inventory snapshot</h1>
        <p className="text-sm text-gray-500 mt-0.5">Reporting service materialized snapshots · filter by snapshot date</p>
      </div>

      <div className="app-card p-4 flex flex-wrap gap-4 items-end">
        <label className="flex flex-col gap-1 text-xs font-medium text-gray-500">
          From
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-gray-500">
          To
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900"
          />
        </label>
        <p className="text-xs text-gray-400 pb-2">
          Showing {filtered.length} row{filtered.length === 1 ? '' : 's'} (7-day outbound sparkline per product)
        </p>
      </div>

      {isLoading && (
        <div className="app-card p-12 flex flex-col items-center gap-2">
          <Loader2 className="animate-spin text-medium-green" size={28} />
          <p className="text-sm text-gray-500">Loading snapshot…</p>
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
            <table className="w-full text-sm min-w-[960px]">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Warehouse</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Location</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Reserved</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Available</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">7d outbound</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Snapshot</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-gray-400">
                      No snapshot rows in this date range (run reporting consumers / seed data if empty)
                    </td>
                  </tr>
                ) : (
                  filtered.map((row) => (
                    <tr key={row.snapshotId} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                      <td className="px-4 py-3 font-mono text-xs">
                        <span className="inline-flex items-center gap-2 text-dark-base dark:text-white">
                          <Package size={12} className="text-medium-green" />
                          {String(row.productId).slice(0, 8)}…
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{String(row.warehouseId).slice(0, 8)}…</td>
                      <td className="px-4 py-3 font-mono text-xs">{String(row.locationId).slice(0, 8)}…</td>
                      <td className="px-4 py-3 text-right tabular-nums">{row.totalQuantity ?? 0}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{row.reservedQuantity ?? 0}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{row.availableQuantity ?? 0}</td>
                      <td className="px-4 py-3">
                        <SparklineCell productId={row.productId} />
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {row.snapshotAt ? new Date(row.snapshotAt).toLocaleString() : '—'}
                      </td>
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
