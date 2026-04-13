import { useQuery } from '@tanstack/react-query'
import { Loader2, Factory } from 'lucide-react'
import { procurementApi } from '../../services/axiosInstance'
import { springPageItems } from '../../utils/apiNormalize'

export default function Suppliers() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const r = await procurementApi.get('/suppliers', { params: { page: 1, limit: 200 } })
      return springPageItems(r.data)
    },
    staleTime: 60_000,
  })

  const rows = data ?? []

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-dark-base dark:text-white">Suppliers</h1>
        <p className="text-sm text-gray-500 mt-0.5">Vendor directory from procurement service</p>
      </div>

      {isLoading && (
        <div className="app-card p-12 flex flex-col items-center gap-2">
          <Loader2 className="animate-spin text-medium-green" size={28} />
          <p className="text-sm text-gray-500">Loading suppliers…</p>
        </div>
      )}

      {isError && (
        <div className="app-card p-6 border-red-200 text-red-600 text-sm">
          Failed to load suppliers.{' '}
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
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">City</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Lead (d)</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-gray-400">
                      No suppliers
                    </td>
                  </tr>
                ) : (
                  rows.map((s) => (
                    <tr key={s.supplierId} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                      <td className="px-4 py-3 font-medium text-dark-base dark:text-white">
                        <span className="inline-flex items-center gap-2">
                          <Factory size={14} className="text-medium-green shrink-0" />
                          {s.name}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{s.contactEmail ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{s.city ?? '—'}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{s.leadTimeDays ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            s.active !== false ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40' : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {s.active !== false ? 'Active' : 'Inactive'}
                        </span>
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
