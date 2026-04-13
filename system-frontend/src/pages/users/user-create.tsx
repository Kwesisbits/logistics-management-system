import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation } from '@tanstack/react-query'
import { identityApi } from '@/api/identity'
import { warehouseApi } from '@/api/warehouse'
import { useUIStore } from '@/stores/ui-store'
import { getApiErrorMessage } from '@/hooks/use-api-error'
import { PageHeader } from '@/components/shared/page-header'
import { LoadingSpinner } from '@/components/shared/loading-spinner'

const userSchema = z.object({
  email: z.string().email('Valid email is required'),
  temporaryPassword: z.string().min(8, 'Must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  roleId: z.string().min(1, 'Role is required'),
  warehouseId: z.string().optional(),
})

type UserFormValues = z.infer<typeof userSchema>

export function UserCreatePage() {
  const navigate = useNavigate()
  const addToast = useUIStore((s) => s.addToast)

  const { data: roles, isLoading: rolesLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: identityApi.getRoles,
  })

  const { data: warehouses, isLoading: warehousesLoading } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehouseApi.getWarehouses(),
  })

  const createMutation = useMutation({
    mutationFn: identityApi.createUser,
    onSuccess: () => {
      addToast('success', 'User created successfully')
      navigate('/users')
    },
    onError: (err) => addToast('error', getApiErrorMessage(err)),
  })

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      email: '',
      temporaryPassword: '',
      firstName: '',
      lastName: '',
      roleId: '',
      warehouseId: '',
    },
  })

  const watchedRoleId = watch('roleId')
  const selectedRole = roles?.find((r) => r.roleId === watchedRoleId)
  const showWarehouse = selectedRole?.roleName === 'WAREHOUSE_STAFF'

  const onSubmit = (data: UserFormValues) => {
    createMutation.mutate({
      ...data,
      warehouseId: showWarehouse ? data.warehouseId : undefined,
    })
  }

  if (rolesLoading || warehousesLoading) {
    return <LoadingSpinner className="py-32" label="Loading form data…" />
  }

  return (
    <>
      <PageHeader title="Create User" />

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="max-w-lg space-y-5"
      >
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              First Name
            </label>
            <input
              {...register('firstName')}
              className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm ${errors.firstName ? 'border-red-400' : 'border-gray-300'}`}
            />
            {errors.firstName && (
              <p className="mt-1 text-xs text-red-600">
                {errors.firstName.message}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Last Name
            </label>
            <input
              {...register('lastName')}
              className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm ${errors.lastName ? 'border-red-400' : 'border-gray-300'}`}
            />
            {errors.lastName && (
              <p className="mt-1 text-xs text-red-600">
                {errors.lastName.message}
              </p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            type="email"
            {...register('email')}
            className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm ${errors.email ? 'border-red-400' : 'border-gray-300'}`}
          />
          {errors.email && (
            <p className="mt-1 text-xs text-red-600">
              {errors.email.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Temporary Password
          </label>
          <input
            type="password"
            {...register('temporaryPassword')}
            className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm ${errors.temporaryPassword ? 'border-red-400' : 'border-gray-300'}`}
          />
          {errors.temporaryPassword && (
            <p className="mt-1 text-xs text-red-600">
              {errors.temporaryPassword.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Role
          </label>
          <select
            {...register('roleId')}
            className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm ${errors.roleId ? 'border-red-400' : 'border-gray-300'}`}
          >
            <option value="">Select role…</option>
            {roles?.map((r) => (
              <option key={r.roleId} value={r.roleId}>
                {r.roleName}
              </option>
            ))}
          </select>
          {errors.roleId && (
            <p className="mt-1 text-xs text-red-600">
              {errors.roleId.message}
            </p>
          )}
        </div>

        {showWarehouse && (
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Warehouse
            </label>
            <select
              {...register('warehouseId')}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Select warehouse…</option>
              {warehouses
                ?.filter((w) => w.active)
                .map((w) => (
                  <option key={w.warehouseId} value={w.warehouseId}>
                    {w.name}
                  </option>
                ))}
            </select>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/users')}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {createMutation.isPending ? 'Creating…' : 'Create User'}
          </button>
        </div>
      </form>
    </>
  )
}
