import { useEffect, useState } from 'react'
import { useUIStore, type Toast } from '@/stores/ui-store'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

const borderColorMap: Record<Toast['type'], string> = {
  success: 'border-l-green-500',
  error: 'border-l-red-500',
  warning: 'border-l-amber-500',
}

const iconBgMap: Record<Toast['type'], string> = {
  success: 'text-green-600',
  error: 'text-red-600',
  warning: 'text-amber-600',
}

function ToastItem({ toast }: { toast: Toast }) {
  const removeToast = useUIStore((s) => s.removeToast)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border-l-4 bg-white px-4 py-3 shadow-lg transition-all duration-300 dark:bg-gray-800',
        borderColorMap[toast.type],
        visible ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0',
      )}
    >
      <p className={cn('flex-1 text-sm text-gray-700 dark:text-gray-200', iconBgMap[toast.type])}>
        {toast.message}
      </p>
      <button
        onClick={() => removeToast(toast.id)}
        className="shrink-0 rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

export function ToastContainer() {
  const toasts = useUIStore((s) => s.toasts)

  if (toasts.length === 0) return null

  return (
    <div className="fixed right-4 bottom-4 z-50 flex w-80 flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  )
}
