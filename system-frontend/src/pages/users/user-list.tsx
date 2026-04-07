import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { identityApi } from '@/api/identity'
import { useUIStore } from '@/stores/ui-store'
import { getApiErrorMessage } from '@/hooks/use-api-error'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { StatusBadge } from '@/components/shared/status-badge'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { ErrorState } from '@/components/shared/error-state'
import type { User } from '@/types/users'

export function UserListPage() {
  const addToast = useUIStore((s) => s.addToast)
  const queryClient = useQueryClient()
  const [deactivateTarget, setDeactivateTarget] = useState<User | null>(null)

  const {
    data: users,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['users'],
    queryFn: identityApi.getUsers,
  })

  const deactivateMutation = useMutation({
    mutationFn: (userId: string) => identityApi.deactivateUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      addToast('success', 'User deactivated')
      setDeactivateTarget(null)
    },
    onError: (err) => addToast('error', getApiErrorMessage(err)),
  })

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (row: User) => `${row.firstName} ${row.lastName}`,
    },
    { key: 'email', header: 'Email' },
    {
      key: 'role',
      header: 'Role',
      render: (row: User) => <StatusBadge status={row.roleName} />,
    },
    {
      key: 'warehouse',
      header: 'Warehouse',
      render: (row: User) => row.warehouseId?.slice(0, 8) ?? '—',
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: User) => (
        <StatusBadge status={row.active ? 'ACTIVE' : 'INACTIVE'} />
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: User) =>
        row.active ? (
          <button
            onClick={() => setDeactivateTarget(row)}
            className="text-sm text-red-600 hover:text-red-800"
          >
            Deactivate
          </button>
        ) : null,
    },
  ]

  if (isLoading)
    return <LoadingSpinner className="py-32" label="Loading users…" />
  if (isError)
    return (
      <ErrorState message={getApiErrorMessage(error)} onRetry={refetch} />
    )

  return (
    <>
      <PageHeader
        title="Users"
        actions={
          <Link
            to="/users/new"
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus size={16} />
            Add User
          </Link>
        }
      />

      <DataTable
        columns={columns}
        data={users ?? []}
        keyExtractor={(row) => row.userId}
        emptyMessage="No users found"
      />

      <ConfirmDialog
        open={deactivateTarget !== null}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={() =>
          deactivateTarget &&
          deactivateMutation.mutate(deactivateTarget.userId)
        }
        title="Deactivate User"
        description={`Are you sure you want to deactivate ${deactivateTarget?.firstName} ${deactivateTarget?.lastName}? They will no longer be able to sign in.`}
        confirmLabel="Deactivate"
        loading={deactivateMutation.isPending}
      />
    </>
  )
}
