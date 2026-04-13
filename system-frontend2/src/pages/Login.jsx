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

const DEV_AUTH_FALLBACK = import.meta.env.VITE_DEV_AUTH_FALLBACK === 'true'

function permissionsForRole(roleName) {
  if (!roleName) return []
  const map = {
    ADMIN: ['inventory:READ', 'inventory:WRITE', 'orders:READ', 'orders:WRITE', 'reports:READ'],
    WAREHOUSE_STAFF: ['inventory:READ', 'inventory:WRITE', 'orders:READ', 'orders:WRITE'],
    VIEWER: ['inventory:READ', 'orders:READ', 'reports:READ'],
  }
  return map[roleName] ?? []
}

/** Maps identity service `LoginResponse.user` to the shape used by Sidebar / guards. */
function normalizeAuthUser(apiUser) {
  if (!apiUser) return null
  const roleName = apiUser.roleName ?? apiUser.role
  const email = String(apiUser.email ?? '')
  const local = email.split('@')[0] ?? 'User'
  const parts = local.split(/[._-]+/).filter(Boolean)
  const firstName =
    apiUser.firstName ??
    (parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase() : 'User')
  const lastName =
    apiUser.lastName ??
    (parts[1] ? parts[1].charAt(0).toUpperCase() + parts[1].slice(1).toLowerCase() : '')
  return {
    userId: apiUser.userId,
    email,
    firstName,
    lastName,
    roleName,
    warehouseId: apiUser.warehouseId,
    permissions: permissionsForRole(roleName),
  }
}

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showReset, setShowReset] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [resetMessage, setResetMessage] = useState('')

  const setAuth = useAuthStore((state) => state.setAuth)
  const navigate = useNavigate()

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setError('')
    setResetMessage('')
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      await identityApi.post('/auth/reset-password', {
        email: email.trim().toLowerCase(),
        newPassword,
      })
      setResetMessage('If an account exists for this email, the password has been updated. You can sign in now.')
      setNewPassword('')
      setConfirmPassword('')
      setShowReset(false)
    } catch (err) {
      const code = err?.apiError?.code ?? err?.response?.data?.code
      const msg = err?.apiError?.message ?? err?.response?.data?.message
      setError(msg || (code === 'VALIDATION_ERROR' ? 'Check email format and password length (8+).' : 'Unable to reset password. Try again.'))
    } finally {
      setLoading(false)
    }
  }

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
      setAuth(accessToken, normalizeAuthUser(user))
      navigate('/dashboard')
    } catch (err) {
      const code = err?.apiError?.code ?? err?.response?.data?.code
      setError(API_ERRORS[code] || 'Unable to sign in. Please try again.')
    } finally {
      setLoading(false)
    }
  }
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

          <h2 className="text-2xl font-bold text-dark-base dark:text-white mb-2">
            {showReset ? 'Reset password' : 'Welcome back'}
          </h2>
          <p className="text-gray-400 dark:text-gray-500 text-sm mb-8">
            {showReset
              ? 'Enter your account email and choose a new password (min. 8 characters).'
              : 'Sign in to your account to continue'}
          </p>

          {error && (
            <div className="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-lg mb-6 border border-red-200 dark:border-red-900/60">
              {error}
            </div>
          )}
          {resetMessage && (
            <div className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-sm px-4 py-3 rounded-lg mb-6 border border-emerald-200 dark:border-emerald-900/60">
              {resetMessage}
            </div>
          )}

          {showReset ? (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-dark-base dark:text-gray-200">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  autoComplete="email"
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700
                    text-dark-base dark:text-white text-sm bg-light-bg dark:bg-gray-900
                    placeholder:text-gray-400 dark:placeholder:text-gray-500
                    focus:outline-none focus:border-medium-green transition-colors duration-200"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-dark-base dark:text-gray-200">New password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700
                    text-dark-base dark:text-white text-sm bg-light-bg dark:bg-gray-900
                    placeholder:text-gray-400 dark:placeholder:text-gray-500
                    focus:outline-none focus:border-medium-green transition-colors duration-200"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-dark-base dark:text-gray-200">Confirm new password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700
                    text-dark-base dark:text-white text-sm bg-light-bg dark:bg-gray-900
                    placeholder:text-gray-400 dark:placeholder:text-gray-500
                    focus:outline-none focus:border-medium-green transition-colors duration-200"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => { setShowReset(false); setError(''); setResetMessage('') }}
                  className="flex-1 py-3 rounded-lg border border-gray-200 dark:border-gray-600 text-dark-base dark:text-gray-200 font-semibold text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Back to sign in
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 rounded-lg bg-medium-green hover:bg-deep-green text-white font-semibold text-sm disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Updating…' : 'Update password'}
                </button>
              </div>
            </form>
          ) : (
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
                <div className="flex items-center justify-between gap-2">
                  <label className="text-sm font-medium text-dark-base dark:text-gray-200">Password</label>
                  <button
                    type="button"
                    onClick={() => { setShowReset(true); setError(''); setResetMessage('') }}
                    className="text-xs font-medium text-medium-green hover:text-deep-green hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
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
          )}

        </div>
      </div>
    </div>
  )
}

export default Login