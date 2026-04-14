import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2, MapPin } from 'lucide-react'
import { warehouseApi } from '../../services/axiosInstance'
import { springPageItems } from '../../utils/apiNormalize'

function OccupancyBar({ current, max }) {
  const cap = Math.max(Number(max) || 0, 1)
  const pct = Math.min(100, Math.round(((Number(current) || 0) / cap) * 100))
  const tone =
    pct >= 95 ? 'bg-red-500' : pct >= 75 ? 'bg-amber-500' : pct >= 40 ? 'bg-medium-green' : 'bg-emerald-400'
  return (
    <div className="flex flex-col items-end gap-1 min-w-[120px]">
      <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${tone}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs tabular-nums text-gray-600 dark:text-gray-300">
        {current} / {max} ({pct}%)
      </span>
    </div>
  )
}

export default function Locations() {
  const { data: warehouses } = useQuery({
    queryKey: ['warehouses', 'locations'],
    queryFn: async () => {
      const r = await warehouseApi.get('/warehouses', { params: { page: 1, limit: 200 } })
      return springPageItems(r.data)
    },
    staleTime: 60_000,
  })

  const list = warehouses ?? []
  const [warehouseId, setWarehouseId] = useState('')

  const firstId = list[0]?.warehouseId
  const effectiveWid = warehouseId || firstId

  const { data: locations, isLoading, isError, refetch } = useQuery({
    queryKey: ['locations', effectiveWid],
    queryFn: async () => {
      const r = await warehouseApi.get('/locations', { params: { warehouseId: effectiveWid } })
      return Array.isArray(r.data) ? r.data : []
    },
    enabled: Boolean(effectiveWid),
    staleTime: 30_000,
  })

  const rows = locations ?? []

  const whName = useMemo(() => list.find((w) => String(w.warehouseId) === String(effectiveWid))?.name, [list, effectiveWid])

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-dark-base dark:text-white">Storage locations</h1>
        <p className="text-sm text-gray-500 mt-0.5">Bins and zones per warehouse ({whName ?? '—'})</p>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <label className="text-sm text-gray-600 dark:text-gray-400">Warehouse</label>
        <select
          value={effectiveWid ? String(effectiveWid) : ''}
          onChange={(e) => setWarehouseId(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-dark-base dark:text-white"
        >
          {list.map((w) => (
            <option key={w.warehouseId} value={String(w.warehouseId)}>
              {w.name}
            </option>
          ))}
        </select>
      </div>

      {isLoading && (
        <div className="app-card p-12 flex flex-col items-center gap-2">
          <Loader2 className="animate-spin text-medium-green" size={28} />
          <p className="text-sm text-gray-500">Loading locations…</p>
        </div>
      )}

      {isError && (
        <div className="app-card p-6 border-red-200 text-red-600 text-sm">
          Failed to load locations.{' '}
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
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Code</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Zone / Aisle</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase min-w-[140px]">Occupancy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-gray-400">
                      No locations for this warehouse
                    </td>
                  </tr>
                ) : (
                  rows.map((loc) => (
                    <tr key={loc.locationId} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                      <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-200">
                        <span className="inline-flex items-center gap-2">
                          <MapPin size={12} className="text-medium-green" />
                          {loc.locationCode ?? String(loc.locationId).slice(0, 8)}…
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {[loc.zone, loc.aisle, loc.shelf, loc.bin].filter(Boolean).join(' · ') || '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{loc.locationType ?? '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <OccupancyBar current={loc.currentOccupancy ?? 0} max={loc.maxCapacity ?? 0} />
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
