import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { format } from 'date-fns'
import { createPortal } from 'react-dom'
import { procurementApi } from '@/api/procurement'
import { useAuthStore } from '@/stores/auth-store'
import { useUIStore } from '@/stores/ui-store'
import { getApiErrorMessage } from '@/hooks/use-api-error'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { ErrorState } from '@/components/shared/error-state'

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)

export function PurchaseOrderDetailPage() {
  const { poId } = useParams<{ poId: string }>()
  const isAdmin = useAuthStore((s) => s.isAdmin)
  const addToast = useUIStore((s) => s.addToast)
  const queryClient = useQueryClient()

  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [deliveryOpen, setDeliveryOpen] = useState(false)
  const [newDeliveryDate, setNewDeliveryDate] = useState('')

  const {
    data: po,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['purchase-order', poId],
    queryFn: () => procurementApi.getPurchaseOrder(poId!),
    enabled: !!poId,
  })

  const submitMutation = useMutation({
    mutationFn: () => procurementApi.submitPurchaseOrder(poId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-order', poId] })
      addToast('success', 'Purchase order submitted')
    },
    onError: (err) => addToast('error', getApiErrorMessage(err)),
  })

  const cancelMutation = useMutation({
    mutationFn: (reason: string) =>
      procurementApi.cancelPurchaseOrder(poId!, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-order', poId] })
      addToast('success', 'Purchase order cancelled')
      setCancelOpen(false)
      setCancelReason('')
    },
    onError: (err) => addToast('error', getApiErrorMessage(err)),
  })

  const deliveryMutation = useMutation({
    mutationFn: (date: string) =>
      procurementApi.updateDeliveryDate(poId!, date),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-order', poId] })
      addToast('success', 'Delivery date updated')
      setDeliveryOpen(false)
      setNewDeliveryDate('')
    },
    onError: (err) => addToast('error', getApiErrorMessage(err)),
  })

  if (isLoading)
    return <LoadingSpinner className="py-32" label="Loading purchase order…" />
  if (isError)
    return (
      <ErrorState message={getApiErrorMessage(error)} onRetry={refetch} />
    )
  if (!po) return <ErrorState message="Purchase order not found" />

  const detailCards = [
    { label: 'Status', value: <StatusBadge status={po.status} /> },
    {
      label: 'Supplier',
      value: po.supplierName ?? po.supplierId.slice(0, 8),
    },
    { label: 'Warehouse', value: po.warehouseId.slice(0, 8) },
    { label: 'Total Amount', value: formatCurrency(po.totalAmount) },
    {
      label: 'Expected Delivery',
      value: po.expectedDelivery
        ? format(new Date(po.expectedDelivery), 'MMM d, yyyy')
        : '—',
    },
    {
      label: 'Created By',
      value: po.createdBy.slice(0, 8),
    },
  ]

  return (
    <>
      <PageHeader
        title={`PO #${poId!.slice(0, 8)}`}
        actions={
          <Link
            to="/procurement/purchase-orders"
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <ArrowLeft size={16} />
            Back
          </Link>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {detailCards.map((card) => (
          <div
            key={card.label}
            className="rounded-lg border border-gray-200 bg-white p-4"
          >
            <p className="text-xs font-medium uppercase text-gray-500">
              {card.label}
            </p>
            <div className="mt-1 text-sm font-semibold text-gray-900">
              {card.value}
            </div>
          </div>
        ))}
      </div>

      {po.items && po.items.length > 0 && (
        <div className="mb-6 overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-gray-500">
                  Product ID
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-gray-500">
                  Qty Ordered
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-gray-500">
                  Qty Received
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-gray-500">
                  Unit Cost
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-gray-500">
                  Line Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {po.items.map((item) => (
                <tr key={item.itemId} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-gray-700">
                    {item.productName ?? item.productId.slice(0, 8)}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {item.quantityOrdered}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {item.quantityReceived}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {formatCurrency(item.unitCost)}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {formatCurrency(item.lineTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isAdmin() && (
        <div className="flex gap-3">
          {po.status === 'DRAFTED' && (
            <>
              <button
                onClick={() => submitMutation.mutate()}
                disabled={submitMutation.isPending}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {submitMutation.isPending ? 'Submitting…' : 'Submit'}
              </button>
              <button
                onClick={() => setCancelOpen(true)}
                className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                Cancel PO
              </button>
            </>
          )}
          {po.status === 'SUBMITTED' && (
            <>
              <button
                onClick={() => setCancelOpen(true)}
                className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                Cancel PO
              </button>
              <button
                onClick={() => {
                  setNewDeliveryDate(
                    po.expectedDelivery?.split('T')[0] ?? '',
                  )
                  setDeliveryOpen(true)
                }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Update Delivery Date
              </button>
            </>
          )}
        </div>
      )}

      {cancelOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="fixed inset-0 bg-black/50"
              onClick={() => {
                setCancelOpen(false)
                setCancelReason('')
              }}
            />
            <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
              <h2 className="text-lg font-semibold text-gray-900">
                Cancel Purchase Order
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Please provide a reason for cancelling this purchase order.
              </p>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
                className="mt-3 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="Reason for cancellation…"
              />
              <div className="mt-4 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setCancelOpen(false)
                    setCancelReason('')
                  }}
                  disabled={cancelMutation.isPending}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Close
                </button>
                <button
                  onClick={() => cancelMutation.mutate(cancelReason)}
                  disabled={
                    !cancelReason.trim() || cancelMutation.isPending
                  }
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {cancelMutation.isPending ? 'Cancelling…' : 'Cancel PO'}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {deliveryOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="fixed inset-0 bg-black/50"
              onClick={() => setDeliveryOpen(false)}
            />
            <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
              <h2 className="text-lg font-semibold text-gray-900">
                Update Delivery Date
              </h2>
              <input
                type="date"
                value={newDeliveryDate}
                onChange={(e) => setNewDeliveryDate(e.target.value)}
                className="mt-4 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <div className="mt-4 flex justify-end gap-3">
                <button
                  onClick={() => setDeliveryOpen(false)}
                  disabled={deliveryMutation.isPending}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deliveryMutation.mutate(newDeliveryDate)}
                  disabled={
                    !newDeliveryDate || deliveryMutation.isPending
                  }
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {deliveryMutation.isPending ? 'Updating…' : 'Update'}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
