import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import {
  Truck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  Package,
  Globe,
  Clock,
  Shield,
} from 'lucide-react'
import { identityApi } from '@/api/identity'
import { useAuthStore } from '@/stores/auth-store'
import { getApiErrorMessage } from '@/hooks/use-api-error'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

type LoginFormValues = z.infer<typeof loginSchema>

const statCards = [
  { label: '500+', sub: 'Warehouses', icon: Package },
  { label: '10K+', sub: 'Orders / day', icon: Globe },
  { label: '99.9%', sub: 'Uptime', icon: Shield },
  { label: '24/7', sub: 'Support', icon: Clock },
] as const

export function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [apiError, setApiError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = async (data: LoginFormValues) => {
    try {
      setApiError(null)
      const response = await identityApi.login(data)
      setAuth(response.user, response.accessToken)
      navigate('/dashboard')
    } catch (error) {
      setApiError(getApiErrorMessage(error))
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Visual panel — desktop only */}
      <div className="relative hidden w-[46%] min-w-0 flex-col justify-between overflow-hidden bg-gradient-to-br from-indigo-950 via-blue-950 to-slate-950 px-10 py-12 lg:flex xl:px-14">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:48px_48px]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_85%_55%_at_50%_-10%,rgba(99,102,241,0.25),transparent)]" />
        <div className="pointer-events-none absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 bottom-1/4 h-96 w-96 rounded-full bg-indigo-400/15 blur-3xl" />
        <div className="pointer-events-none absolute left-1/3 top-0 h-px w-1/2 bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 shadow-lg ring-1 ring-white/20 backdrop-blur-sm">
              <Truck className="h-7 w-7 text-white" strokeWidth={1.75} />
            </div>
            <span className="text-2xl font-semibold tracking-tight text-white">LogiTrack</span>
          </div>
          <p className="mt-8 max-w-sm text-lg leading-relaxed text-blue-100/90">
            Enterprise logistics management—visibility across every warehouse, shipment, and mile.
          </p>
        </div>

        <div className="relative z-10 mt-auto grid grid-cols-2 gap-3 xl:gap-4">
          {statCards.map(({ label, sub, icon: Icon }) => (
            <div
              key={sub}
              className="rounded-2xl border border-white/10 bg-white/[0.08] p-4 shadow-xl shadow-black/10 backdrop-blur-md transition-transform duration-300 hover:-translate-y-0.5 hover:border-white/15 hover:bg-white/[0.12]"
            >
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-blue-200">
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
              </div>
              <p className="text-xl font-semibold tracking-tight text-white">{label}</p>
              <p className="mt-0.5 text-sm text-blue-200/80">{sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Form column */}
      <div className="flex min-h-screen flex-1 flex-col items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-[420px] animate-slide-up rounded-2xl border border-slate-200/80 bg-white p-8 shadow-[0_25px_50px_-12px_rgba(15,23,42,0.12)] [animation-fill-mode:both] sm:p-10">
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-md">
                <Truck className="h-5 w-5" strokeWidth={2} />
              </div>
              <span className="text-xl font-semibold tracking-tight text-slate-900">LogiTrack</span>
            </div>
            <p className="mt-2 text-sm text-slate-500">Sign in to continue</p>
          </div>

          <div className="mb-8 hidden lg:block">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Welcome back</h1>
            <p className="mt-1.5 text-sm text-slate-500">Sign in to your workspace</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
                Email
              </label>
              <div className="relative">
                <Mail
                  className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400"
                  strokeWidth={1.75}
                />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  {...register('email')}
                  className={`block w-full rounded-xl border bg-slate-50/80 py-2.5 pl-11 pr-3.5 text-sm text-slate-900 outline-none transition-[border-color,box-shadow,background-color] placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20 ${
                    errors.email
                      ? 'border-red-300 focus:border-red-400'
                      : 'border-slate-200 focus:border-blue-500'
                  }`}
                  placeholder="you@company.com"
                />
              </div>
              {errors.email && (
                <p className="mt-1.5 text-xs text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">
                Password
              </label>
              <div className="relative">
                <Lock
                  className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400"
                  strokeWidth={1.75}
                />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  {...register('password')}
                  className={`block w-full rounded-xl border bg-slate-50/80 py-2.5 pl-11 pr-11 text-sm text-slate-900 outline-none transition-[border-color,box-shadow,background-color] placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20 ${
                    errors.password
                      ? 'border-red-300 focus:border-red-400'
                      : 'border-slate-200 focus:border-blue-500'
                  }`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs text-red-600">{errors.password.message}</p>
              )}
            </div>

            {apiError && (
              <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">
                {apiError}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-transform duration-200 hover:scale-[1.02] hover:from-blue-600 hover:to-blue-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 disabled:hover:scale-100"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="mt-8 text-center text-xs font-medium tracking-wide text-slate-400">
            Secure logistics management platform
          </p>
        </div>
      </div>
    </div>
  )
}
