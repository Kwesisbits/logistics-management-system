import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import { identityApi } from '../services/axiosInstance'
import warehouseImg from '../assets/logistic.jpg'
import ThemeToggle from '../components/ThemeToggle'

// Error code → friendly message map (from your API spec)
const API_ERRORS = {
  INVALID_CREDENTIALS: 'Incorrect email or password.',
  ACCOUNT_DEACTIVATED: 'Your account has been deactivated. Contact your admin.',
  VALIDATION_ERROR: 'Please check your email and password.',
}

const DEV_AUTH_FALLBACK = true

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const setAuth = useAuthStore((state) => state.setAuth)
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (DEV_AUTH_FALLBACK) {
        if (email === 'admin@logistics.com' && password === 'Admin@123') {
          setAuth('dev-token-admin', {
            userId: '1',
            email: 'admin@logistics.com',
            firstName: 'Admin',
            lastName: 'User',
            roleName: 'ADMIN',
            warehouseId: null,
            permissions: ['inventory:READ', 'inventory:WRITE', 'orders:READ', 'orders:WRITE'],
          })
          navigate('/dashboard')
          return
        }
        if (email === 'staff@logistics.com' && password === 'Staff@123') {
          setAuth('dev-token-staff', {
            userId: '2',
            email: 'staff@logistics.com',
            firstName: 'Warehouse',
            lastName: 'Staff',
            roleName: 'WAREHOUSE_STAFF',
            warehouseId: 'WH-01',
            permissions: ['inventory:READ', 'inventory:WRITE', 'orders:READ', 'orders:WRITE'],
          })
          navigate('/dashboard')
          return
        }
        if (email === 'viewer@logistics.com' && password === 'Viewer@123') {
          setAuth('dev-token-viewer', {
            userId: '3',
            email: 'viewer@logistics.com',
            firstName: 'Read',
            lastName: 'Only',
            roleName: 'VIEWER',
            warehouseId: null,
            permissions: ['inventory:READ', 'orders:READ', 'reports:READ'],
          })
          navigate('/dashboard')
          return
        }
        setError('Incorrect email or password.')
        return
      }

      const response = await identityApi.post('/auth/login', { email, password })
      const { accessToken, user } = response.data
      setAuth(accessToken, user)
      navigate('/dashboard')
    } catch (err) {
      const code = err?.response?.data?.error?.code
      setError(API_ERRORS[code] || 'Unable to sign in. Please try again.')
    } finally {
      setLoading(false)
    }
  }
console.log('DEV MODE:', DEV_AUTH_FALLBACK, import.meta.env.VITE_DEV_AUTH_FALLBACK)
  return (
    <div className="flex min-h-screen">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-10 bg-dark-base">
        <img
          src={warehouseImg}
          alt="Warehouse"
          className="absolute inset-0 w-full h-full object-cover opacity-20"
        />
        <div className="relative z-10">
          <h1 className="text-mint text-3xl font-bold tracking-wide">Kratex</h1>
          <p className="text-mint opacity-60 text-sm mt-1">Warehouse Management System</p>
        </div>
        <div className="relative z-10">
          <h2 className="text-white text-4xl font-bold leading-snug mb-4">
            Manage your warehouse smarter
          </h2>
          <p className="text-mint opacity-80 text-base leading-relaxed">
            Track inventory, orders, and shipments all in one place
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="relative w-full lg:w-1/2 flex items-center justify-center p-8 bg-white dark:bg-gray-950">
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-md">

          <div className="lg:hidden mb-8 text-center">
            <h1 className="text-dark-base dark:text-white text-3xl font-bold">Kratex</h1>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Warehouse Management System</p>
          </div>

          <h2 className="text-2xl font-bold text-dark-base dark:text-white mb-2">Welcome back</h2>
          <p className="text-gray-400 dark:text-gray-500 text-sm mb-8">Sign in to your account to continue</p>

          {error && (
            <div className="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-lg mb-6 border border-red-200 dark:border-red-900/60">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-dark-base dark:text-gray-200">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700
                  text-dark-base dark:text-white text-sm bg-light-bg dark:bg-gray-900
                  placeholder:text-gray-400 dark:placeholder:text-gray-500
                  focus:outline-none focus:border-medium-green
                  transition-colors duration-200"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-dark-base dark:text-gray-200">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700
                  text-dark-base dark:text-white text-sm bg-light-bg dark:bg-gray-900
                  placeholder:text-gray-400 dark:placeholder:text-gray-500
                  focus:outline-none focus:border-medium-green
                  transition-colors duration-200"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg
                bg-medium-green hover:bg-deep-green
                text-white font-semibold text-sm
                transition-colors duration-200
                disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

        </div>
      </div>
    </div>
  )
}

export default Login