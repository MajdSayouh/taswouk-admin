// Categories — one tree per section (store / restaurant / pharmacy / mall).
//
// The sections are walled off from each other: the tab decides which tree is
// loaded, every dialog only offers that tree's categories, every write carries
// `expected_scope`, and the backend refuses a parent or target from another
// section. Moving a whole branch to another section is its own dialog, for
// roots only, with an impact preview and the name typed back.
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import {
  Alert,
  Button as AntButton,
  Drawer,
  Dropdown,
  Input,
  Segmented,
  Space,
  Spin,
  Switch,
  Table,
  Tag,
  Tooltip,
  message,
} from 'antd'
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  HistoryOutlined,
  MoreOutlined,
  PercentageOutlined,
  PlusOutlined,
  SwapOutlined,
  ApartmentOutlined,
} from '@ant-design/icons'
import { Card } from '../../components/ui/Card'
import { DashboardTableToolbar } from '../../components/tables/DashboardTableToolbar.jsx'
import { TableRowActions } from '../../components/tables/TableRowActions.jsx'
import { DashboardAddTriggerButton } from '../../components/tables/DashboardAddButton.jsx'
import { buildDashboardPagination, DASHBOARD_TABLE_PROPS, DEFAULT_PAGE_SIZE } from '../../components/tables/tableDefaults.js'
import { useCategoryTreeViewModel } from '../../viewmodels/useCategoryTreeViewModel.js'
import { CATEGORY_SCOPES } from '../../models/Category.js'
import { CATEGORY_ROW_CHILDREN, canAddChild, filterTree, reorderedSiblingIds, toCategoryRows, walkTree } from '../../models/CategoryTree.js'
import { resolvePublicMediaUrl } from '../../utils/mediaUrl.js'
import { CategoryOfferModal } from '../../components/categories/CategoryOfferModal.jsx'
import {
  CategoryChangeLogDrawer,
  CategoryChangeScopeModal,
  CategoryDeleteModal,
  CategoryFormModal,
  CategoryMoveProductsModal,
} from '../../components/categories/CategoryManageModals.jsx'
import { ProductTableThumbnail } from '../../components/products/ProductTableThumbnail.jsx'
import { fetchProductsList, formatListPrice } from '../../query/fetchers/productList.js'
import { queryKeys } from '../../query/queryKeys.js'

function ActiveSwitch({ node, vm, t }) {
  // Re-mounted (see `key` at the call site) when the saved value changes, so
  // the optimistic state never needs syncing back.
  const [checked, setChecked] = useState(node.isActive)
  const pending = vm.update.isPending && String(vm.update.variables?.id) === node.id
  return (
    <Switch
      checked={checked}
      loading={pending}
      disabled={pending}
      onChange={async (next) => {
        const prev = checked
        setChecked(next)
        try {
          await vm.update.mutateAsync({ id: node.id, payload: { is_active: next } })
        } catch (e) {
          setChecked(prev)
          message.error(e?.message ?? t('categories.activeUpdateErr'))
        }
      }}
    />
  )
}

function renderLogo(logoUrl) {
  return logoUrl ? (
    <img
      src={resolvePublicMediaUrl(logoUrl)}
      alt=""
      className="h-9 w-9 shrink-0 rounded-md border border-slate-200 object-cover"
    />
  ) : (
    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50 text-xs text-slate-400">
      —
    </span>
  )
}

export function CategoriesListPage() {
  const { t } = useTranslation('pages')
  const [scope, setScope] = useState('store')
  const vm = useCategoryTreeViewModel({ scope })
  const { tree, loading, error } = vm

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [expandedKeys, setExpandedKeys] = useState(/** @type {string[]} */ ([]))

  const [dialog, setDialog] = useState(null)
  const close = () => setDialog(null)
  const [offerCategory, setOfferCategory] = useState(null)
  const [logOpen, setLogOpen] = useState(false)

  const visibleTree = useMemo(() => filterTree(tree, search), [tree, search])
  const rows = useMemo(() => toCategoryRows(visibleTree), [visibleTree])

  // While searching, every branch that holds a match is open.
  const searching = search.trim() !== ''
  const searchExpandedKeys = useMemo(() => {
    const keys = []
    if (searching) walkTree(visibleTree, (n) => n.children.length && keys.push(n.id))
    return keys
  }, [searching, visibleTree])

  function onSearchChange(value) {
    setSearch(value)
    setPage(1)
  }

  const counts = useMemo(() => {
    let all = 0
    walkTree(tree, () => (all += 1))
    return { roots: tree.length, all }
  }, [tree])

  async function move(node, step) {
    const orderedIds = reorderedSiblingIds(tree, node, step)
    if (!orderedIds) return
    try {
      await vm.reorder.mutateAsync({ parentId: node.parentId, orderedIds })
    } catch (e) {
      message.error(e?.message ?? t('categories.tree.reorderFailed'))
    }
  }

  // ── products drawer ─────────────────────────────────────────────────────
  const [productViewer, setProductViewer] = useState(null)
  const [productSearch, setProductSearch] = useState('')
  const [productSearchQuery, setProductSearchQuery] = useState('')
  const [productPage, setProductPage] = useState(1)
  const [productPageSize, setProductPageSize] = useState(DEFAULT_PAGE_SIZE)

  useEffect(() => {
    const id = window.setTimeout(() => setProductSearchQuery(productSearch.trim()), 300)
    return () => window.clearTimeout(id)
  }, [productSearch])

  // By id, which also takes in the category's children. The old page asked
  // for a root by *name*, which matched same-named categories of other sections.
  const productViewerParams = useMemo(
    () =>
      productViewer
        ? {
            page: productPage,
            page_size: productPageSize,
            category_id: Number(productViewer.id),
            ...(productSearchQuery ? { q: productSearchQuery } : {}),
          }
        : null,
    [productViewer, productPage, productPageSize, productSearchQuery],
  )
  const productsQuery = useQuery({
    queryKey: queryKeys.products.list(productViewerParams ?? {}),
    queryFn: ({ signal }) => fetchProductsList({ signal, params: productViewerParams }),
    enabled: productViewerParams != null,
  })

  function openProducts(node) {
    setProductViewer({ id: node.id, name: node.name })
    setProductSearch('')
    setProductSearchQuery('')
    setProductPage(1)
  }

  const productColumns = [
    {
      title: t('products.list.colImage'),
      key: 'image',
      width: 72,
      align: 'center',
      render: (_, p) =>
        p.imageUrl ? (
          <ProductTableThumbnail storagePath={p.imageUrl} productId={p.id} size={40} className="object-cover" />
        ) : (
          <span className="text-slate-400">{t('shared.emDash')}</span>
        ),
    },
    { title: t('products.list.colName'), dataIndex: 'name', key: 'name' },
    {
      title: t('products.list.colStore'),
      dataIndex: 'storeId',
      key: 'storeId',
      width: 110,
      render: (v) => (v ? `#${v}` : t('shared.emDash')),
    },
    {
      title: t('products.list.colPrice'),
      dataIndex: 'price',
      key: 'price',
      width: 130,
      render: (v, r) => <span className="tabular-nums">{formatListPrice(v, r.currency)}</span>,
    },
    {
      title: t('products.list.colStatus'),
      dataIndex: 'isActive',
      key: 'status',
      width: 110,
      render: (a) => (a ? <Tag color="green">{t('shared.active')}</Tag> : <Tag>{t('shared.inactive')}</Tag>),
    },
    {
      title: t('shared.actions'),
      key: 'actions',
      width: 120,
      render: (_, p) => <TableRowActions editTo={`/products/${p.id}/edit`} showDelete={false} />,
    },
  ]

  // ── tree columns ────────────────────────────────────────────────────────
  const reordering = vm.reorder.isPending

  const columns = [
    {
      title: t('categories.colCategory'),
      key: 'name',
      render: (_, node) => (
        <div className="inline-flex items-center gap-3 align-middle">
          {renderLogo(node.logoUrl)}
          <div>
            <p className="font-medium text-slate-900">
              {node.name}
              {node.depth > 0 ? (
                <Tag className="ms-2" bordered={false}>
                  {t('categories.tree.level', { level: node.depth + 1 })}
                </Tag>
              ) : null}
            </p>
            <p className="text-xs text-slate-500">{t('categories.idLine', { id: node.id })}</p>
          </div>
        </div>
      ),
    },
    {
      title: t('categories.tree.colProducts'),
      key: 'products',
      width: 150,
      render: (_, node) => (
        <Tooltip title={t('categories.tree.productsTooltip')}>
          <span className="tabular-nums">
            {node.productCount ?? 0}
            {node.children.length ? (
              <span className="text-slate-400"> / {node.totalProductCount ?? 0}</span>
            ) : null}
          </span>
        </Tooltip>
      ),
    },
    {
      title: t('shared.status'),
      key: 'status',
      width: 100,
      render: (_, node) => <ActiveSwitch key={`${node.id}:${node.isActive}`} node={node} vm={vm} t={t} />,
    },
    {
      title: t('categories.tree.colOrder'),
      key: 'order',
      width: 100,
      render: (_, node) => (
        <Space size={2}>
          <AntButton
            size="small"
            type="text"
            icon={<ArrowUpOutlined />}
            aria-label={t('categories.tree.moveUp')}
            disabled={reordering || searching || !reorderedSiblingIds(tree, node, -1)}
            onClick={() => move(node, -1)}
          />
          <AntButton
            size="small"
            type="text"
            icon={<ArrowDownOutlined />}
            aria-label={t('categories.tree.moveDown')}
            disabled={reordering || searching || !reorderedSiblingIds(tree, node, 1)}
            onClick={() => move(node, 1)}
          />
        </Space>
      ),
    },
    {
      title: t('shared.actions'),
      key: 'actions',
      width: 300,
      fixed: 'right',
      render: (_, node) => {
        const menu = [
          { key: 'products', icon: <EyeOutlined />, label: t('categories.viewProducts') },
          { key: 'offer', icon: <PercentageOutlined />, label: t('categories.offerAction') },
          { key: 'moveProducts', icon: <SwapOutlined />, label: t('categories.tree.moveProducts') },
          ...(node.parentId == null
            ? [{ key: 'scope', icon: <ApartmentOutlined />, label: t('categories.tree.changeScope'), danger: true }]
            : []),
          { type: 'divider' },
          { key: 'delete', icon: <DeleteOutlined />, label: t('categories.tree.delete'), danger: true },
        ]
        const onMenu = ({ key }) => {
          if (key === 'products') openProducts(node)
          else if (key === 'offer') setOfferCategory({ id: node.id, name: node.name })
          else setDialog({ kind: key, node })
        }
        return (
          <Space size="small" wrap>
            {canAddChild(node) ? (
              <AntButton icon={<PlusOutlined />} onClick={() => setDialog({ kind: 'create', parentId: node.id })}>
                {t('categories.tree.addChild')}
              </AntButton>
            ) : null}
            <AntButton icon={<EditOutlined />} onClick={() => setDialog({ kind: 'edit', node })}>
              {t('categories.edit')}
            </AntButton>
            <Dropdown menu={{ items: menu, onClick: onMenu }} trigger={['click']}>
              <AntButton icon={<MoreOutlined />} aria-label={t('shared.actions')} />
            </Dropdown>
          </Space>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      {error ? <Alert type="error" showIcon title={t('categories.errorTitle')} description={error} /> : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          size="large"
          value={scope}
          onChange={(next) => {
            setScope(next)
            setSearch('')
            setPage(1)
            setExpandedKeys([])
            setDialog(null)
          }}
          options={CATEGORY_SCOPES.map((value) => ({ value, label: t(`categories.scopes.${value}`) }))}
        />
        <AntButton icon={<HistoryOutlined />} onClick={() => setLogOpen(true)}>
          {t('categories.tree.changeLog')}
        </AntButton>
      </div>

      <Alert type="info" showIcon title={t('categories.tree.sectionNote', { scope: t(`categories.scopes.${scope}`) })} />

      <Card
        title={t('categories.tree.title', {
          scope: t(`categories.scopes.${scope}`),
          roots: counts.roots,
          all: counts.all,
        })}
        actions={
          <DashboardAddTriggerButton onClick={() => setDialog({ kind: 'create', parentId: null })}>
            {t('categories.addCategory')}
          </DashboardAddTriggerButton>
        }
      >
        <Spin spinning={loading}>
          <DashboardTableToolbar
            searchPlaceholder={t('categories.searchCategories')}
            searchValue={search}
            onSearchChange={onSearchChange}
          />
          <Table
            rowKey="id"
            columns={columns}
            dataSource={rows}
            expandable={{
              expandedRowKeys: searching ? searchExpandedKeys : expandedKeys,
              onExpandedRowsChange: (keys) => {
                if (!searching) setExpandedKeys(keys.map(String))
              },
              indentSize: 28,
              childrenColumnName: CATEGORY_ROW_CHILDREN,
            }}
            pagination={buildDashboardPagination({
              page,
              pageSize,
              total: rows.length,
              showTotal: (total) => t('categories.paginationCategory', { count: total }),
              onChange: (p, ps) => {
                setPage(p)
                setPageSize(ps)
              },
            })}
            {...DASHBOARD_TABLE_PROPS}
          />
        </Spin>
      </Card>

      <CategoryFormModal
        open={dialog?.kind === 'create' || dialog?.kind === 'edit'}
        node={dialog?.kind === 'edit' ? dialog.node : null}
        defaultParentId={dialog?.kind === 'create' ? dialog.parentId : null}
        tree={tree}
        vm={vm}
        onClose={close}
      />
      <CategoryDeleteModal
        open={dialog?.kind === 'delete'}
        node={dialog?.kind === 'delete' ? dialog.node : null}
        tree={tree}
        vm={vm}
        onClose={close}
      />
      <CategoryMoveProductsModal
        open={dialog?.kind === 'moveProducts'}
        node={dialog?.kind === 'moveProducts' ? dialog.node : null}
        tree={tree}
        vm={vm}
        onClose={close}
      />
      <CategoryChangeScopeModal
        open={dialog?.kind === 'scope'}
        node={dialog?.kind === 'scope' ? dialog.node : null}
        scope={scope}
        vm={vm}
        onClose={close}
      />
      <CategoryChangeLogDrawer open={logOpen} scope={scope} onClose={() => setLogOpen(false)} />

      <Drawer
        title={t('categories.productsDrawerTitle', { name: productViewer?.name ?? '' })}
        open={productViewer != null}
        onClose={() => setProductViewer(null)}
        width={920}
        destroyOnHidden
      >
        {productsQuery.error ? (
          <Alert
            type="error"
            showIcon
            className="mb-4"
            title={t('categories.productsLoadError')}
            description={productsQuery.error.message}
          />
        ) : null}
        <Input.Search
          allowClear
          className="mb-4 max-w-md"
          placeholder={t('categories.searchProducts')}
          value={productSearch}
          onChange={(e) => {
            setProductSearch(e.target.value)
            setProductPage(1)
          }}
        />
        <Table
          rowKey="id"
          columns={productColumns}
          dataSource={productsQuery.data?.rows ?? []}
          loading={productsQuery.isFetching}
          locale={{ emptyText: t('categories.noProducts') }}
          pagination={buildDashboardPagination({
            page: productPage,
            pageSize: productPageSize,
            total: productsQuery.data?.total ?? 0,
            showTotal: productsQuery.data?.totalIsExact
              ? (total) => t('products.list.pagination', { count: total })
              : (_total, range) => t('products.list.paginationRange', { from: range[0], to: range[1] }),
            onChange: (p, ps) => {
              setProductPage(p)
              setProductPageSize(ps)
            },
          })}
          {...DASHBOARD_TABLE_PROPS}
        />
      </Drawer>

      <CategoryOfferModal
        key={offerCategory ? String(offerCategory.id) : 'closed'}
        category={offerCategory}
        onClose={() => setOfferCategory(null)}
      />
    </div>
  )
}
