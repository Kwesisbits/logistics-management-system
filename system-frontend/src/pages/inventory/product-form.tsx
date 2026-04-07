import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { inventoryApi } from '@/api/inventory'
import { PageHeader } from '@/components/shared/page-header'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { ErrorState } from '@/components/shared/error-state'
import { useUIStore } from '@/stores/ui-store'
import { getApiErrorMessage } from '@/hooks/use-api-error'

const productSchema = z.object({
  sku: z.string().min(1, 'SKU is required'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  unitOfMeasure: z.string().min(1, 'Unit of measure is required'),
  unitCost: z.coerce.number().positive('Unit cost must be positive'),
  reorderThreshold: z.coerce.number().int().nonnegative('Must be zero or greater'),
})

type ProductFormData = z.infer<typeof productSchema>

export function ProductFormPage() {
  const { productId } = useParams<{ productId: string }>()
  const navigate = useNavigate()
  const addToast = useUIStore((s) => s.addToast)
  const queryClient = useQueryClient()
  const isEdit = Boolean(productId)

  const {
    data: product,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => inventoryApi.getProduct(productId!),
    enabled: isEdit,
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema) as never,
    defaultValues: {
      sku: '',
      name: '',
      description: '',
      category: '',
      unitOfMeasure: '',
      unitCost: 0,
      reorderThreshold: 0,
    },
  })

  useEffect(() => {
    if (product) {
      reset({
        sku: product.sku,
        name: product.name,
        description: product.description ?? '',
        category: product.category,
        unitOfMeasure: product.unitOfMeasure,
        unitCost: product.unitCost,
        reorderThreshold: product.reorderThreshold,
      })
    }
  }, [product, reset])

  const createMutation = useMutation({
    mutationFn: inventoryApi.createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      addToast('success', 'Product created successfully')
      navigate('/inventory/products')
    },
    onError: (err) => addToast('error', getApiErrorMessage(err)),
  })

  const updateMutation = useMutation({
    mutationFn: (data: ProductFormData) =>
      inventoryApi.updateProduct(productId!, { ...data, version: product!.version }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['product', productId] })
      addToast('success', 'Product updated successfully')
      navigate('/inventory/products')
    },
    onError: (err) => addToast('error', getApiErrorMessage(err)),
  })

  function onSubmit(data: ProductFormData) {
    if (isEdit) {
      updateMutation.mutate(data)
    } else {
      createMutation.mutate(data)
    }
  }

  if (isEdit && isLoading) {
    return <LoadingSpinner className="py-32" label="Loading product..." />
  }

  if (isEdit && isError) {
    return <ErrorState message={getApiErrorMessage(error)} />
  }

  const pending = createMutation.isPending || updateMutation.isPending

  const inputClass =
    'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'

  return (
    <div>
      <PageHeader title={isEdit ? 'Edit Product' : 'New Product'} />

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mx-auto max-w-2xl space-y-6 rounded-lg border border-gray-200 bg-white p-6"
      >
        <div>
          <label htmlFor="sku" className="mb-1 block text-sm font-medium text-gray-700">
            SKU
          </label>
          <input id="sku" type="text" {...register('sku')} className={inputClass} />
          {errors.sku && (
            <p className="mt-1 text-xs text-red-600">{errors.sku.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700">
            Name
          </label>
          <input id="name" type="text" {...register('name')} className={inputClass} />
          {errors.name && (
            <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="description" className="mb-1 block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            id="description"
            rows={3}
            {...register('description')}
            className={inputClass}
          />
          {errors.description && (
            <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="category" className="mb-1 block text-sm font-medium text-gray-700">
            Category
          </label>
          <input id="category" type="text" {...register('category')} className={inputClass} />
          {errors.category && (
            <p className="mt-1 text-xs text-red-600">{errors.category.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="unitOfMeasure" className="mb-1 block text-sm font-medium text-gray-700">
            Unit of Measure
          </label>
          <input
            id="unitOfMeasure"
            type="text"
            {...register('unitOfMeasure')}
            className={inputClass}
          />
          {errors.unitOfMeasure && (
            <p className="mt-1 text-xs text-red-600">{errors.unitOfMeasure.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="unitCost" className="mb-1 block text-sm font-medium text-gray-700">
              Unit Cost ($)
            </label>
            <input
              id="unitCost"
              type="number"
              step="0.01"
              {...register('unitCost')}
              className={inputClass}
            />
            {errors.unitCost && (
              <p className="mt-1 text-xs text-red-600">{errors.unitCost.message}</p>
            )}
          </div>
          <div>
            <label
              htmlFor="reorderThreshold"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Reorder Threshold
            </label>
            <input
              id="reorderThreshold"
              type="number"
              step="1"
              {...register('reorderThreshold')}
              className={inputClass}
            />
            {errors.reorderThreshold && (
              <p className="mt-1 text-xs text-red-600">{errors.reorderThreshold.message}</p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-100 pt-6">
          <button
            type="button"
            onClick={() => navigate('/inventory/products')}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {pending ? 'Saving…' : isEdit ? 'Update Product' : 'Create Product'}
          </button>
        </div>
      </form>
    </div>
  )
}
