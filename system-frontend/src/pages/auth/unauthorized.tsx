import { useNavigate } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'

export function UnauthorizedPage() {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="flex max-w-md flex-col items-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <ShieldAlert size={32} className="text-red-600" />
        </div>
        <h1 className="mt-6 text-2xl font-bold text-gray-900">Access Denied</h1>
        <p className="mt-2 text-sm text-gray-500">
          You don&apos;t have permission to view this page.
        </p>
        <button
          onClick={() => navigate('/dashboard')}
          className="mt-6 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  )
}
