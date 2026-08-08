import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { Table, Space, Alert, Spin, message, Select, Button as AntButton, Switch, Modal, Progress } from 'antd'
import * as storeService from '../../services/storeService.js'
import * as productService from '../../services/productService.js'
import {
  emptyProductVariantMigrationProgress,
  migrateProductsWithoutVariants,
} from '../../services/productVariantMigrationService.js'
import {
  emptyProductCategoryMigrationProgress,
  migrateProductsToSubcategory,
} from '../../services/productCategoryMigrationService.js'
import { queryKeys } from '../../query/queryKeys.js'
import { useAuthStore, isAdminRole, isSellerRole } from '../../store/authStore.js'
import { useProductsViewModel } from '../../viewmodels/useProductsViewModel'
import { useCategoriesViewModel } from '../../viewmodels/useCategoriesViewModel.js'
import { DashboardTableToolbar } from '../../components/tables/DashboardTableToolbar.jsx'
import { ColumnTextFilterDropdown } from '../../components/tables/ColumnTextFilterDropdown.jsx'
import { TableRowActions } from '../../components/tables/TableRowActions.jsx'
import { DashboardAddLinkButton } from '../../components/tables/DashboardAddButton.jsx'
import { buildDashboardPagination, DASHBOARD_TABLE_PROPS } from '../../components/tables/tableDefaults.js'
import { matchesActiveTriState } from '../../utils/tableFilters.js'
import { mapStoreFromApi } from '../../models/Store.js'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { ProductTableThumbnail } from '../../components/products/ProductTableThumbnail.jsx'
const DEFAULT_PAGE_SIZE = 50

function positiveInteger(value, fallback) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

function ProductActiveSwitch({ row, mutation, setProductActive, t }) {
  const [checked, setChecked] = useState(row.isActive)
  useEffect(() => {
    setChecked(row.isActive)
  }, [row.id, row.isActive])
  const pending =
    mutation.isPending &&
    mutation.variables != null &&
    String(mutation.variables.productId) === String(row.id)
  return (
    <Switch
      checked={checked}
      loading={pending}
      disabled={pending}
      onChange={async (next) => {
        const prev = checked
        setChecked(next)
        try {
          await setProductActive(row.id, next)
        } catch (err) {
          setChecked(prev)
          message.error(err?.message ?? t('products.list.activeUpdateErr'))
        }
      }}
    />
  )
}

function StatusColumnFilter({ value, onApply, confirm, t }) {
  const [local, setLocal] = useState(value || [])
  return (
    <div className="p-2 w-52" onKeyDown={(e) => e.stopPropagation()}>
      <Select
        mode="multiple"
        allowClear
        placeholder={t('products.list.filterStatus')}
        className="w-full mb-2"
        value={local}
        onChange={setLocal}
        options={[
          { value: 'active', label: t('shared.active') },
          { value: 'inactive', label: t('shared.inactive') },
        ]}
      />
      <Space className="w-full justify-end">
        <AntButton
          size="small"
          type="primary"
          onClick={() => {
            onApply(local.length ? local : null)
            confirm()
          }}
        >
          {t('shared.apply')}
        </AntButton>
        <AntButton
          size="small"
          onClick={() => {
            setLocal([])
            onApply(null)
            confirm()
          }}
        >
          {t('shared.reset')}
        </AntButton>
      </Space>
    </div>
  )
}

export function ProductsListPage() {
  const { t } = useTranslation('pages')
  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.token)
  const location = useLocation()
  const queryClient = useQueryClient()

  const [searchParams, setSearchParams] = useSearchParams()
  const adminStoreFilter = searchParams.get('store_id') || null
  const [searchQuery, setSearchQuery] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(() => positiveInteger(searchParams.get('page'), 1))
  const [pageSize, setPageSize] = useState(() =>
    positiveInteger(searchParams.get('page_size'), DEFAULT_PAGE_SIZE),
  )
  const [categoryFilterId, setCategoryFilterId] = useState(null)
  const [subcategoryFilterId, setSubcategoryFilterId] = useState(null)

  const storesQuery = useQuery({
    queryKey: queryKeys.stores.all(),
    queryFn: async ({ signal }) => {
      const list = await storeService.listStores({ signal })
      return Array.isArray(list) ? list.map(mapStoreFromApi) : []
    },
    enabled: !!token,
  })

  const storesForFilter = useMemo(
    () => (Array.isArray(storesQuery.data) ? storesQuery.data : []),
    [storesQuery.data],
  )

  const {
    categories,
    subcategories,
    loading: categoriesLoading,
  } = useCategoriesViewModel({ enabled: !!token })

  const selectedCategory = useMemo(
    () => categories.find((category) => String(category.id) === String(categoryFilterId)),
    [categories, categoryFilterId],
  )

  const categoryOptions = useMemo(
    () =>
      categories
        .filter((category) => category.isActive)
        .map((category) => ({ label: category.name, value: String(category.id) })),
    [categories],
  )

  const subcategoryOptions = useMemo(
    () =>
      subcategories
        .filter(
          (subcategory) =>
            subcategory.isActive &&
            (!categoryFilterId ||
              String(subcategory.categoryId) === String(categoryFilterId)),
        )
        .map((subcategory) => ({
          label: categoryFilterId
            ? subcategory.name
            : `${subcategory.categoryName} · ${subcategory.name}`,
          value: String(subcategory.id),
        })),
    [subcategories, categoryFilterId],
  )

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearchQuery(search.trim())
    }, 300)
    return () => window.clearTimeout(timeoutId)
  }, [search])

  const productListParams = useMemo(() => {
    if (!user) return {}
    const query = {
      page,
      page_size: pageSize,
      ...(searchQuery ? { q: searchQuery } : {}),
      ...(subcategoryFilterId
        ? { category_id: Number(subcategoryFilterId) }
        : selectedCategory?.name
          ? { category: selectedCategory.name }
          : {}),
    }
    if (isSellerRole(user.role)) {
      return storesForFilter.length === 1 && storesForFilter[0]?.id != null
        ? { ...query, store_id: Number(storesForFilter[0].id) }
        : query
    }
    if (isAdminRole(user.role)) {
      return adminStoreFilter != null && adminStoreFilter !== ''
        ? { ...query, store_id: Number(adminStoreFilter) }
        : query
    }
    return query
  }, [
    user,
    adminStoreFilter,
    storesForFilter,
    searchQuery,
    subcategoryFilterId,
    selectedCategory,
    page,
    pageSize,
  ])

  const productsQueryEnabled = !!token && !!user

  const {
    products,
    total,
    totalIsExact,
    loading,
    error,
    refetch,
    deleteProduct,
    setProductActive,
    setActiveMutation,
  } = useProductsViewModel({
    listParams: productListParams,
    enabled: productsQueryEnabled,
  })

  const [deletingId, setDeletingId] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [variantFilter, setVariantFilter] = useState('all')
  const [migrationOpen, setMigrationOpen] = useState(false)
  const [migrationStatus, setMigrationStatus] = useState('idle')
  const [migrationProgress, setMigrationProgress] = useState(emptyProductVariantMigrationProgress)
  const [migrationFatalError, setMigrationFatalError] = useState(null)
  const migrationAbortRef = useRef(/** @type {AbortController | null} */ (null))
  const [categoryMigrationOpen, setCategoryMigrationOpen] = useState(false)
  const [categoryMigrationStatus, setCategoryMigrationStatus] = useState('idle')
  const [categoryMigrationProgress, setCategoryMigrationProgress] = useState(
    emptyProductCategoryMigrationProgress,
  )
  const [categoryMigrationFatalError, setCategoryMigrationFatalError] = useState(null)
  const [migrationSourceCategoryId, setMigrationSourceCategoryId] = useState(null)
  const [migrationDestinationCategoryId, setMigrationDestinationCategoryId] = useState(null)
  const [migrationStoreId, setMigrationStoreId] = useState(null)
  const categoryMigrationAbortRef = useRef(/** @type {AbortController | null} */ (null))

  const migrationSubcategoryOptions = useMemo(
    () =>
      subcategories.map((subcategory) => ({
        label: `${subcategory.categoryName} · ${subcategory.name}`,
        value: String(subcategory.id),
      })),
    [subcategories],
  )

  const coloredProducts = useMemo(
    () => products.filter((product) => product.hasColors),
    [products],
  )
  const coloredProductIds = useMemo(
    () => coloredProducts.map((product) => String(product.id)),
    [coloredProducts],
  )
  const variantAuditQuery = useQuery({
    queryKey: ['products', 'variant-audit', coloredProductIds],
    queryFn: async ({ signal }) => {
      const audit = {}
      for (let index = 0; index < coloredProducts.length; index++) {
        const product = coloredProducts[index]
        const variants = await productService.listProductVariants(product.id, { signal })
        audit[String(product.id)] = Array.isArray(variants) ? variants.length : 0
      }
      return audit
    },
    enabled: variantFilter === 'colorsWithoutVariants' && coloredProducts.length > 0,
    staleTime: 60_000,
    retry: false,
  })
  const variantFilterLoading =
    variantFilter === 'colorsWithoutVariants' && variantAuditQuery.isFetching
  const variantFilterError =
    variantFilter === 'colorsWithoutVariants'
      ? variantAuditQuery.error?.message ?? null
      : null

  const [colName, setColName] = useState('')
  const [colSku, setColSku] = useState('')
  const [colDesc, setColDesc] = useState('')
  const [colPrice, setColPrice] = useState('')
  const [colStatus, setColStatus] = useState(null)

  const displayData = useMemo(() => {
    return products.filter((p) => {
      if (variantFilter === 'colorsWithoutVariants') {
        if (!p.hasColors) return false
        const variantCount = variantAuditQuery.data?.[String(p.id)]
        if (variantCount == null || variantCount > 0) return false
      }
      if (!matchesActiveTriState(statusFilter, p.isActive)) return false
      if (colName && !String(p.name ?? '').toLowerCase().includes(colName.toLowerCase())) return false
      if (colSku && !String(p.sku ?? '').toLowerCase().includes(colSku.toLowerCase())) return false
      if (colDesc && !String(p.category ?? '').toLowerCase().includes(colDesc.toLowerCase())) return false
      if (colPrice && !String(p.price ?? '').includes(colPrice)) return false
      if (colStatus && colStatus.length) {
        const active = colStatus.includes('active')
        const inactive = colStatus.includes('inactive')
        if (active && !inactive && !p.isActive) return false
        if (inactive && !active && p.isActive) return false
      }
      return true
    })
  }, [
    products,
    variantFilter,
    variantAuditQuery.data,
    statusFilter,
    colName,
    colSku,
    colDesc,
    colPrice,
    colStatus,
  ])

  useEffect(() => {
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous)
        if (page > 1) next.set('page', String(page))
        else next.delete('page')
        if (pageSize !== DEFAULT_PAGE_SIZE) next.set('page_size', String(pageSize))
        else next.delete('page_size')
        return next
      },
      { replace: true },
    )
  }, [page, pageSize, setSearchParams])

  useEffect(() => {
    if (!loading && page > 1 && products.length === 0) setPage((current) => current - 1)
  }, [loading, page, products.length])

  const handleDelete = useCallback(
    async (productId) => {
      setDeletingId(productId)
      try {
        await deleteProduct(productId)
        message.success(t('products.list.deleted'))
      } catch (e) {
        message.error(e?.message ?? t('products.list.deleteError'))
        await refetch()
      } finally {
        setDeletingId(null)
      }
    },
    [deleteProduct, t, refetch],
  )

  async function startVariantMigration() {
    if (!user || !isAdminRole(user.role) || migrationStatus === 'running') return
    const controller = new AbortController()
    migrationAbortRef.current = controller
    setMigrationProgress(emptyProductVariantMigrationProgress())
    setMigrationFatalError(null)
    setMigrationStatus('running')
    try {
      const result = await migrateProductsWithoutVariants({
        signal: controller.signal,
        onProgress: setMigrationProgress,
      })
      setMigrationProgress(result)
      setMigrationStatus('completed')
    } catch (err) {
      if (controller.signal.aborted || err?.name === 'AbortError' || err?.name === 'CanceledError') {
        setMigrationStatus('stopped')
      } else {
        setMigrationFatalError(String(err?.message || t('products.list.migrationFatalError')))
        setMigrationStatus('failed')
      }
    } finally {
      migrationAbortRef.current = null
      await queryClient.invalidateQueries({ queryKey: queryKeys.products.root })
    }
  }

  async function startCategoryMigration() {
    if (!user || !isAdminRole(user.role) || categoryMigrationStatus === 'running') return
    if (!migrationSourceCategoryId || !migrationDestinationCategoryId) {
      setCategoryMigrationFatalError(t('products.list.categoryMigrationRequired'))
      return
    }
    if (String(migrationSourceCategoryId) === String(migrationDestinationCategoryId)) {
      setCategoryMigrationFatalError(t('products.list.categoryMigrationSameCategory'))
      return
    }

    const controller = new AbortController()
    categoryMigrationAbortRef.current = controller
    setCategoryMigrationProgress(emptyProductCategoryMigrationProgress())
    setCategoryMigrationFatalError(null)
    setCategoryMigrationStatus('running')
    try {
      const result = await migrateProductsToSubcategory({
        sourceCategoryId: migrationSourceCategoryId,
        destinationCategoryId: migrationDestinationCategoryId,
        storeId: migrationStoreId,
        signal: controller.signal,
        onProgress: setCategoryMigrationProgress,
      })
      setCategoryMigrationProgress(result)
      setCategoryMigrationStatus('completed')
    } catch (err) {
      if (controller.signal.aborted || err?.name === 'AbortError' || err?.name === 'CanceledError') {
        setCategoryMigrationStatus('stopped')
      } else {
        setCategoryMigrationFatalError(
          String(err?.message || t('products.list.categoryMigrationFatalError')),
        )
        setCategoryMigrationStatus('failed')
      }
    } finally {
      categoryMigrationAbortRef.current = null
      await queryClient.invalidateQueries({ queryKey: queryKeys.products.root })
    }
  }

  const migrationPercent =
    migrationProgress.totalProducts > 0
      ? Math.min(
          100,
          Math.round(
            (migrationProgress.scannedProducts / migrationProgress.totalProducts) * 100,
          ),
        )
      : 0

  const categoryMigrationPercent =
    categoryMigrationProgress.phase === 'moving' && categoryMigrationProgress.totalProducts > 0
      ? Math.min(
          100,
          Math.round(
            (categoryMigrationProgress.processedProducts /
              categoryMigrationProgress.totalProducts) *
              100,
          ),
        )
      : 0

  const titleSuffix = totalIsExact
    ? t('shared.count', { count: total })
    : t('products.list.pageLabel', { page })

  const productsReturnTo = useMemo(() => {
    const params = new URLSearchParams(location.search)
    if (page > 1) params.set('page', String(page))
    else params.delete('page')
    if (pageSize !== DEFAULT_PAGE_SIZE) params.set('page_size', String(pageSize))
    else params.delete('page_size')
    const query = params.toString()
    return `${location.pathname}${query ? `?${query}` : ''}`
  }, [location.pathname, location.search, page, pageSize])

  const productNavigationQuery = useMemo(
    () => new URLSearchParams({ return_to: productsReturnTo }).toString(),
    [productsReturnTo],
  )

  const columns = useMemo(
    () => [
      {
        title: t('products.list.colImage'),
        key: 'image',
        width: 72,
        align: 'center',
        render: (_, record) =>
          record.imageUrl ? (
            <ProductTableThumbnail
              storagePath={record.imageUrl}
              productId={record.id}
              size={40}
              className="object-cover"
            />
          ) : (
            <span className="inline-flex h-10 w-10 items-center justify-center rounded border border-dashed border-slate-200 bg-slate-50 text-xs text-slate-400">
              —
            </span>
          ),
      },
      {
        title: t('products.list.colName'),
        dataIndex: 'name',
        key: 'name',
        align: 'left',
        filteredValue: colName ? [colName] : null,
        filterDropdown: ({ confirm }) => (
          <ColumnTextFilterDropdown
            placeholder={t('products.list.filterName')}
            value={colName}
            onApply={(v) => {
              setColName(v)
              setPage(1)
            }}
            onReset={() => {
              setColName('')
              setPage(1)
            }}
            confirm={confirm}
          />
        ),
        render: (value, record) => (
          <Link
            to={`/products/${record.id}?${productNavigationQuery}`}
            className="font-medium text-slate-900 hover:text-[#FF7D29]"
          >
            {value}
          </Link>
        ),
      },
      {
        title: t('products.list.colSku'),
        dataIndex: 'sku',
        key: 'sku',
        align: 'left',
        filteredValue: colSku ? [colSku] : null,
        filterDropdown: ({ confirm }) => (
          <ColumnTextFilterDropdown
            placeholder={t('products.list.filterSku')}
            value={colSku}
            onApply={(v) => {
              setColSku(v)
              setPage(1)
            }}
            onReset={() => {
              setColSku('')
              setPage(1)
            }}
            confirm={confirm}
          />
        ),
        render: (v) => <span className="text-slate-700">{v}</span>,
      },
      {
        title: t('products.list.colCategory'),
        dataIndex: 'category',
        key: 'category',
        align: 'left',
        filteredValue: colDesc ? [colDesc] : null,
        filterDropdown: ({ confirm }) => (
          <ColumnTextFilterDropdown
            placeholder={t('products.list.filterCategory')}
            value={colDesc}
            onApply={(v) => {
              setColDesc(v)
              setPage(1)
            }}
            onReset={() => {
              setColDesc('')
              setPage(1)
            }}
            confirm={confirm}
          />
        ),
        render: (v) => <span className="text-slate-700">{v}</span>,
      },
      {
        title: t('products.list.colPrice'),
        dataIndex: 'price',
        key: 'price',
        align: 'left',
        filteredValue: colPrice ? [colPrice] : null,
        filterDropdown: ({ confirm }) => (
          <ColumnTextFilterDropdown
            placeholder={t('products.list.filterPrice')}
            value={colPrice}
            onApply={(v) => {
              setColPrice(v)
              setPage(1)
            }}
            onReset={() => {
              setColPrice('')
              setPage(1)
            }}
            confirm={confirm}
          />
        ),
        render: (v) => (
          <span className="tabular-nums text-slate-900">{Number(v ?? 0).toFixed(2)}</span>
        ),
      },
      {
        title: t('products.list.colStatus'),
        dataIndex: 'isActive',
        key: 'isActive',
        align: 'left',
        filteredValue: colStatus && colStatus.length ? colStatus : null,
        filterDropdown: ({ confirm }) => (
          <StatusColumnFilter
            value={colStatus}
            onApply={(value) => {
              setColStatus(value)
              setPage(1)
            }}
            confirm={confirm}
            t={t}
          />
        ),
        render: (_, record) => (
          <ProductActiveSwitch
            row={record}
            mutation={setActiveMutation}
            setProductActive={setProductActive}
            t={t}
          />
        ),
      },
      {
        title: t('shared.actions'),
        key: 'actions',
        align: 'left',
        width: 168,
        fixed: 'right',
        render: (_, record) => (
          <TableRowActions
            editTo={`/products/${record.id}/edit?${productNavigationQuery}`}
            onDelete={() => handleDelete(record.id)}
            deleteTitle={t('products.list.deleteTitle')}
            deleteDescription={t('products.list.deleteDesc')}
            deleteLoading={deletingId === record.id}
          />
        ),
      },
    ],
    [
      t,
      colName,
      colSku,
      colDesc,
      colPrice,
      colStatus,
      deletingId,
      handleDelete,
      setProductActive,
      setActiveMutation,
      productNavigationQuery,
    ],
  )

  if (token && !user) {
    return (
      <div className="flex justify-center py-24">
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error ? (
        <Alert
          type="error"
          title={t('products.list.loadError')}
          description={error}
          showIcon
          action={
            <Button type="button" variant="ghost" onClick={() => refetch()}>
              {t('shared.retry')}
            </Button>
          }
        />
      ) : null}
      {variantFilterError ? (
        <Alert
          type="error"
          title={t('products.list.variantFilterError')}
          description={variantFilterError}
          showIcon
        />
      ) : null}

      <Card
        title={t('products.list.cardTitle', { suffix: titleSuffix })}
        actions={
          <Space wrap>
            {user && isAdminRole(user.role) ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setCategoryMigrationFatalError(null)
                  setCategoryMigrationProgress(emptyProductCategoryMigrationProgress())
                  if (categoryMigrationStatus !== 'running') setCategoryMigrationStatus('idle')
                  setMigrationStoreId(adminStoreFilter)
                  setCategoryMigrationOpen(true)
                }}
              >
                {t('products.list.moveProducts')}
              </Button>
            ) : null}
            {user && isAdminRole(user.role) ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setMigrationFatalError(null)
                  if (migrationStatus !== 'running') setMigrationStatus('idle')
                  setMigrationOpen(true)
                }}
              >
                {t('products.list.migrateMissingVariants')}
              </Button>
            ) : null}
            <DashboardAddLinkButton to="/products/create">
              {t('products.list.newProduct')}
            </DashboardAddLinkButton>
          </Space>
        }
      >
        <Spin spinning={loading || variantFilterLoading}>
          <DashboardTableToolbar
            searchPlaceholder={t('products.list.searchPlaceholder')}
            searchValue={search}
            onSearchChange={(value) => {
              setSearch(value)
              setPage(1)
            }}
            filterSlot={
              <>
                {user && isAdminRole(user.role) ? (
                  <Select
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    placeholder={t('products.list.allStores')}
                    className="min-w-[168px]"
                    value={adminStoreFilter ?? undefined}
                    onChange={(v) => {
                      setPage(1)
                      setSearchParams((prev) => {
                        const next = new URLSearchParams(prev)
                        if (v) {
                          next.set('store_id', v)
                        } else {
                          next.delete('store_id')
                        }
                        return next
                      })
                    }}
                    options={storesForFilter.map((s) => ({
                      label:
                        s?.name != null && String(s.name).trim()
                          ? t('shared.storeNamed', { name: s.name, id: s.id })
                          : t('shared.storeNumber', { id: s?.id }),
                      value: String(s?.id ?? ''),
                    }))}
                  />
                ) : null}
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  loading={categoriesLoading}
                  placeholder={t('products.list.allCategories')}
                  className="min-w-[180px]"
                  value={categoryFilterId ?? undefined}
                  options={categoryOptions}
                  onChange={(value) => {
                    setPage(1)
                    setCategoryFilterId(value ?? null)
                    setSubcategoryFilterId(null)
                  }}
                />
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  loading={categoriesLoading}
                  placeholder={t('products.list.allSubcategories')}
                  className="min-w-[210px]"
                  value={subcategoryFilterId ?? undefined}
                  options={subcategoryOptions}
                  onChange={(value) => {
                    setPage(1)
                    setSubcategoryFilterId(value ?? null)
                  }}
                />
                <Select
                  value={statusFilter}
                  onChange={(value) => {
                    setPage(1)
                    setStatusFilter(value)
                  }}
                  className="min-w-[140px]"
                  options={[
                    { value: 'all', label: t('products.list.allStatuses') },
                    { value: 'active', label: t('products.list.activeOnly') },
                    { value: 'inactive', label: t('products.list.inactiveOnly') },
                  ]}
                />
                <Select
                  value={variantFilter}
                  onChange={(value) => {
                    setPage(1)
                    setVariantFilter(value)
                  }}
                  className="min-w-[220px]"
                  options={[
                    { value: 'all', label: t('products.list.allVariantStates') },
                    {
                      value: 'colorsWithoutVariants',
                      label: t('products.list.colorsWithoutVariants'),
                    },
                  ]}
                />
              </>
            }
          />
          <Table
            rowKey="id"
            columns={columns}
            dataSource={displayData}
            pagination={buildDashboardPagination({
              page,
              pageSize,
              total,
              showTotal: totalIsExact
                ? (count) => t('products.list.pagination', { count })
                : (_count, range) =>
                    t('products.list.paginationRange', { from: range[0], to: range[1] }),
              onChange: (p, ps) => {
                setPage(p)
                setPageSize(ps)
              },
            })}
            {...DASHBOARD_TABLE_PROPS}
          />
        </Spin>
      </Card>

      <Modal
        open={migrationOpen}
        title={t('products.list.migrationTitle')}
        closable={migrationStatus !== 'running'}
        maskClosable={migrationStatus !== 'running'}
        onCancel={() => {
          if (migrationStatus !== 'running') setMigrationOpen(false)
        }}
        footer={
          migrationStatus === 'running'
            ? [
                <AntButton
                  key="stop"
                  danger
                  onClick={() => migrationAbortRef.current?.abort()}
                >
                  {t('products.list.migrationStop')}
                </AntButton>,
              ]
            : migrationStatus === 'idle'
              ? [
                  <AntButton key="cancel" onClick={() => setMigrationOpen(false)}>
                    {t('shared.cancel')}
                  </AntButton>,
                  <AntButton key="start" type="primary" onClick={startVariantMigration}>
                    {t('products.list.migrationStart')}
                  </AntButton>,
                ]
              : [
                  <AntButton key="close" type="primary" onClick={() => setMigrationOpen(false)}>
                    {t('shared.close')}
                  </AntButton>,
                ]
        }
      >
        <div className="space-y-4">
          <Alert
            type="warning"
            showIcon
            title={t('products.list.migrationWarningTitle')}
            description={t('products.list.migrationWarningDescription')}
          />
          {migrationStatus !== 'idle' ? (
            <>
              <Progress
                percent={migrationPercent}
                status={migrationStatus === 'failed' ? 'exception' : undefined}
              />
              <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                <div>{t('products.list.migrationScanned', { count: migrationProgress.scannedProducts })}</div>
                <div>{t('products.list.migrationMigrated', { count: migrationProgress.migratedProducts })}</div>
                <div>{t('products.list.migrationVariants', { count: migrationProgress.createdVariants })}</div>
                <div>{t('products.list.migrationRepaired', { count: migrationProgress.repairedVariants })}</div>
                <div>{t('products.list.migrationSkipped', { count: migrationProgress.skippedProducts })}</div>
                <div>{t('products.list.migrationFailed', { count: migrationProgress.failedProducts })}</div>
                <div>{t('products.list.migrationPage', { page: migrationProgress.page })}</div>
              </div>
              {migrationProgress.currentProductId ? (
                <p className="text-sm text-slate-600">
                  {t('products.list.migrationCurrent', {
                    id: migrationProgress.currentProductId,
                    name: migrationProgress.currentProductName,
                  })}
                </p>
              ) : null}
              {migrationStatus === 'completed' ? (
                <Alert type="success" showIcon title={t('products.list.migrationCompleted')} />
              ) : null}
              {migrationStatus === 'stopped' ? (
                <Alert type="info" showIcon title={t('products.list.migrationStopped')} />
              ) : null}
              {migrationFatalError ? (
                <Alert type="error" showIcon title={t('products.list.migrationFatalError')} description={migrationFatalError} />
              ) : null}
              {migrationProgress.failures.length > 0 ? (
                <div className="max-h-36 overflow-auto rounded border border-slate-200 p-2 text-xs text-slate-600">
                  {migrationProgress.failures.slice(-10).map((failure) => (
                    <div key={`${failure.productId}:${failure.message}`}>
                      #{failure.productId} {failure.productName}: {failure.message}
                    </div>
                  ))}
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </Modal>

      <Modal
        open={categoryMigrationOpen}
        title={t('products.list.categoryMigrationTitle')}
        closable={categoryMigrationStatus !== 'running'}
        maskClosable={categoryMigrationStatus !== 'running'}
        onCancel={() => {
          if (categoryMigrationStatus !== 'running') setCategoryMigrationOpen(false)
        }}
        footer={
          categoryMigrationStatus === 'running'
            ? [
                <AntButton
                  key="stop"
                  danger
                  onClick={() => categoryMigrationAbortRef.current?.abort()}
                >
                  {t('products.list.categoryMigrationStop')}
                </AntButton>,
              ]
            : categoryMigrationStatus === 'idle'
              ? [
                  <AntButton key="cancel" onClick={() => setCategoryMigrationOpen(false)}>
                    {t('shared.cancel')}
                  </AntButton>,
                  <AntButton key="start" type="primary" onClick={startCategoryMigration}>
                    {t('products.list.categoryMigrationStart')}
                  </AntButton>,
                ]
              : [
                  <AntButton
                    key="close"
                    type="primary"
                    onClick={() => setCategoryMigrationOpen(false)}
                  >
                    {t('shared.close')}
                  </AntButton>,
                ]
        }
      >
        <div className="space-y-4">
          <Alert
            type="warning"
            showIcon
            title={t('products.list.categoryMigrationWarningTitle')}
            description={t('products.list.categoryMigrationWarningDescription')}
          />

          {categoryMigrationStatus === 'idle' ? (
            <div className="grid gap-4">
              <label className="grid gap-1 text-sm font-medium text-slate-700">
                {t('products.list.categoryMigrationSource')}
                <Select
                  showSearch
                  optionFilterProp="label"
                  loading={categoriesLoading}
                  value={migrationSourceCategoryId ?? undefined}
                  placeholder={t('products.list.categoryMigrationSourcePlaceholder')}
                  options={migrationSubcategoryOptions}
                  onChange={(value) => {
                    setCategoryMigrationFatalError(null)
                    setMigrationSourceCategoryId(value)
                  }}
                />
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-700">
                {t('products.list.categoryMigrationDestination')}
                <Select
                  showSearch
                  optionFilterProp="label"
                  loading={categoriesLoading}
                  value={migrationDestinationCategoryId ?? undefined}
                  placeholder={t('products.list.categoryMigrationDestinationPlaceholder')}
                  options={migrationSubcategoryOptions.filter(
                    (option) => String(option.value) !== String(migrationSourceCategoryId),
                  )}
                  onChange={(value) => {
                    setCategoryMigrationFatalError(null)
                    setMigrationDestinationCategoryId(value)
                  }}
                />
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-700">
                {t('products.list.categoryMigrationStore')}
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  loading={storesQuery.isLoading}
                  value={migrationStoreId ?? undefined}
                  placeholder={t('products.list.categoryMigrationAllStores')}
                  options={storesForFilter.map((store) => ({
                    label:
                      store?.name != null && String(store.name).trim()
                        ? t('shared.storeNamed', { name: store.name, id: store.id })
                        : t('shared.storeNumber', { id: store?.id }),
                    value: String(store?.id ?? ''),
                  }))}
                  onChange={(value) => setMigrationStoreId(value ?? null)}
                />
              </label>
            </div>
          ) : (
            <>
              <Progress
                percent={categoryMigrationPercent}
                status={categoryMigrationStatus === 'failed' ? 'exception' : undefined}
              />
              <p className="text-sm font-medium text-slate-700">
                {categoryMigrationProgress.phase === 'scanning'
                  ? t('products.list.categoryMigrationScanning')
                  : t('products.list.categoryMigrationMoving')}
              </p>
              <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                <div>
                  {t('products.list.categoryMigrationDiscovered', {
                    count: categoryMigrationProgress.discoveredProducts,
                  })}
                </div>
                <div>
                  {t('products.list.categoryMigrationProcessed', {
                    count: categoryMigrationProgress.processedProducts,
                  })}
                </div>
                <div>
                  {t('products.list.categoryMigrationMoved', {
                    count: categoryMigrationProgress.movedProducts,
                  })}
                </div>
                <div>
                  {t('products.list.categoryMigrationFailed', {
                    count: categoryMigrationProgress.failedProducts,
                  })}
                </div>
                <div>
                  {t('products.list.categoryMigrationPage', {
                    page: categoryMigrationProgress.pagesScanned,
                  })}
                </div>
              </div>
              {categoryMigrationProgress.currentProductId ? (
                <p className="text-sm text-slate-600">
                  {t('products.list.categoryMigrationCurrent', {
                    id: categoryMigrationProgress.currentProductId,
                    name: categoryMigrationProgress.currentProductName,
                  })}
                </p>
              ) : null}
              {categoryMigrationStatus === 'completed' ? (
                <Alert
                  type="success"
                  showIcon
                  title={t('products.list.categoryMigrationCompleted')}
                />
              ) : null}
              {categoryMigrationStatus === 'stopped' ? (
                <Alert
                  type="info"
                  showIcon
                  title={t('products.list.categoryMigrationStopped')}
                />
              ) : null}
            </>
          )}

          {categoryMigrationFatalError ? (
            <Alert
              type="error"
              showIcon
              title={t('products.list.categoryMigrationFatalError')}
              description={categoryMigrationFatalError}
            />
          ) : null}
          {categoryMigrationProgress.failures.length > 0 ? (
            <div className="max-h-36 overflow-auto rounded border border-slate-200 p-2 text-xs text-slate-600">
              {categoryMigrationProgress.failures.slice(-10).map((failure) => (
                <div key={`${failure.productId}:${failure.message}`}>
                  #{failure.productId} {failure.productName}: {failure.message}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </Modal>
    </div>
  )
}
