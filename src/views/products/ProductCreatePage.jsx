// View: create product (POST /api/products/).
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, Link } from 'react-router-dom'
import { Alert, message } from 'antd'
import * as storeService from '../../services/storeService.js'
import * as productService from '../../services/productService.js'
import { queryKeys } from '../../query/queryKeys.js'
import { useProductsViewModel } from '../../viewmodels/useProductsViewModel'
import { useCategoriesViewModel } from '../../viewmodels/useCategoriesViewModel.js'
import { useAuthStore, isSellerRole } from '../../store/authStore.js'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { ProductEditorForm } from './ProductEditorForm.jsx'

function emptyForm() {
  return {
    storeId: '',
    name: '',
    categoryId: '',
    category: '',
    subCategoryId: '',
    subCategory: '',
    sizes: [],
    colors: [],
    imageFiles: [],
    description: '',
    price: '',
    isOffer: false,
    newPrice: '',
    rate: '1',
    isActive: true,
  }
}

export function ProductCreatePage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const { createProduct, saving, error } = useProductsViewModel({ fetchOnMount: false })

  const storesQuery = useQuery({
    queryKey: queryKeys.stores.all(),
    queryFn: () => storeService.listStores(),
  })

  const stores = Array.isArray(storesQuery.data) ? storesQuery.data : []
  const storesLoading = storesQuery.isFetching
  const storesError = storesQuery.error?.message ?? null
  const {
    categories,
    subcategories,
    loading: categoriesLoading,
    error: categoriesError,
  } = useCategoriesViewModel()

  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    if (
      user &&
      isSellerRole(user.role) &&
      stores.length === 1 &&
      stores[0]?.id != null
    ) {
      setForm((prev) => ({ ...prev, storeId: String(stores[0].id) }))
    }
  }, [user, stores])

  async function handleSubmit(event) {
    event.preventDefault()
    if (!form.storeId) return
    try {
      const created = await createProduct(form)
      const pid = created?.id
      const files = Array.isArray(form.imageFiles) ? form.imageFiles : []
      if (pid != null && files.length > 0) {
        try {
          await productService.uploadProductImages(pid, files)
        } catch (err) {
          message.warning(
            err?.message ??
              'Product was created but some images failed to upload. Try editing the product to add images.',
          )
        }
      }
      navigate('/admin/products')
    } catch {
      // Error surfaced via Alert
    }
  }

  return (
    <div className="space-y-6">
      {storesError ? <Alert type="warning" title={storesError} showIcon /> : null}
      {error ? <Alert type="error" title={error} showIcon /> : null}

      <Card title="New product">
        <form onSubmit={handleSubmit}>
          <ProductEditorForm
            stores={stores}
            storesLoading={storesLoading}
            form={form}
            setForm={setForm}
            categories={categories}
            subcategories={subcategories}
            categoriesLoading={categoriesLoading}
            categoriesError={categoriesError}
          >
            <Button type="button" variant="ghost" as={Link} to="/admin/products">
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Creating…' : 'Create product'}
            </Button>
          </ProductEditorForm>
        </form>
      </Card>
    </div>
  )
}
