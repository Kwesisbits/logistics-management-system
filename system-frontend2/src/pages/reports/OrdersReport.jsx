import { useQuery } from '@tanstack/react-query'
import { Loader2, BarChart2 } from 'lucide-react'
import { reportingApi } from '../../services/axiosInstance'

export default function OrdersReport() {
  const summary = useQuery({
    queryKey: ['reports', 'orders-summary'],
    queryFn: async () => {
      const r = await reportingApi.get('/orders/summary')
      return r.data
    },
    staleTime: 60_000,
  })

  const fulfil = useQuery({
    queryKey: ['reports', 'fulfilment'],
    queryFn: async () => {
      const r = await reportingApi.get('/orders/fulfilment-rate')
      return r.data
    },
    staleTime: 60_000,
  })

  const loading = summary.isLoading || fulfil.isLoading
  const err = summary.isError || fulfil.isError

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-dark-base dark:text-white">Orders analytics</h1>
        <p className="text-sm text-gray-500 mt-0.5">Summary metrics from reporting service</p>
      </div>

      {loading && (
        <div className="app-card p-12 flex flex-col items-center gap-2">
          <Loader2 className="animate-spin text-medium-green" size={28} />
          <p className="text-sm text-gray-500">Loading…</p>
        </div>
      )}

      {err && (
        <div className="app-card p-6 border-red-200 text-red-600 text-sm">
          Failed to load one or more metrics. Ensure reporting service has consumed order events.
        </div>
      )}

      {!loading && !err && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="app-card p-6 space-y-3">
            <h2 className="font-semibold text-dark-base dark:text-white flex items-center gap-2">
              <BarChart2 size={18} className="text-medium-green" />
              Order summary
            </h2>
            <p className="text-sm text-gray-500">Period: {summary.data?.period ?? '—'}</p>
            <p className="text-3xl font-bold text-dark-base dark:text-white">{summary.data?.totalOrders ?? 0}</p>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Total revenue: <strong>{summary.data?.totalRevenue?.toFixed?.(2) ?? summary.data?.totalRevenue}</strong>
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Avg order value: <strong>{summary.data?.averageOrderValue?.toFixed?.(2) ?? summary.data?.averageOrderValue}</strong>
            </p>
            <div className="text-xs text-gray-500 space-y-1">
              {summary.data?.byStatus &&
                Object.entries(summary.data.byStatus).map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span>{k}</span>
                    <span>{v}</span>
                  </div>
                ))}
            </div>
          </div>

          <div className="app-card p-6 space-y-3">
            <h2 className="font-semibold text-dark-base dark:text-white">Fulfilment rate</h2>
            <p className="text-sm text-gray-500">Period: {fulfil.data?.period ?? '—'}</p>
            <p className="text-3xl font-bold text-dark-base dark:text-white">
              {fulfil.data?.rate != null ? `${Number(fulfil.data.rate).toFixed(1)}%` : '—'}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {fulfil.data?.fulfilled ?? 0} delivered of {fulfil.data?.total ?? 0} orders
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
