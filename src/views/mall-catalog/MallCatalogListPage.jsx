// Admin: GET /api/malls/products — mall catalog products.
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Table, Alert, Spin, Switch, message } from 'antd'
import { useMallCatalogViewModel } from '../../viewmodels/useMallCatalogViewModel.js'
import { DashboardTableToolbar } from '../../components/tables/DashboardTableToolbar.jsx'
import { TableRowActions } from '../../components/tables/TableRowActions.jsx'
import { DashboardAddLinkButton } from '../../components/tables/DashboardAddButton.jsx'
import { buildDashboardPagination, DASHBOARD_TABLE_PROPS } from '../../components/tables/tableDefaults.js'
import { rowMatchesSearch } from '../../utils/tableFilters.js'
import { Card } from '../../components/ui/Card.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { resolvePublicMediaUrl } from '../../utils/mediaUrl.js'

const DEFAULT_PAGE_SIZE = 10

function CatalogActiveSwitch({ row, mutation, t }) {
  const [checked, setChecked] = useState(row.isActive)
  useEffect(() => {
    setChecked(row.isActive)
  }, [row.id, row.isActive])
  const pending =
    mutation.isPending &&
    mutation.variables?.productId != null &&
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
          await mutation.mutateAsync({ productId: row.id, payload: { is_active: next } })
        } catch (e) {
          setChecked(prev)
          message.error(e?.message ?? t('mallCatalog.list.activeUpdateErr'))
        }
      }}
    />
  )
}

export function MallCatalogListPage() {
  const { t, i18n } = useTranslation('pages')
  const { products, loading, error, refetch, deleteMutation, updateMutation } =
    useMallCatalogViewModel()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [search, setSearch] = useState('')
  const [deletingId, setDeletingId] = useState(/** @type {string | null} */ (null))

  const displayData = useMemo(() => {
    return products.filter((row) =>
      rowMatchesSearch(search, row.name, row.categoryName, row.categoryId, row.id, row.description),
    )
  }, [products, search])

  const columns = [
    { title: t('mallCatalog.list.colId'), dataIndex: 'id', width: 72 },
    {
      title: t('mallCatalog.list.colImage'),
      key: 'image',
      width: 72,
      render: (_, row) =>
        row.imageUrl ? (
          <img
            src={resolvePublicMediaUrl(row.imageUrl)}
            alt=""
            className="h-10 w-10 rounded object-cover border border-slate-200"
          />
        ) : (
          '—'
        ),
    },
    { title: t('mallCatalog.list.colName'), dataIndex: 'name', ellipsis: true },
    {
      title: t('mallCatalog.list.colCategory'),
      dataIndex: 'categoryName',
      width: 140,
      render: (value) => value || '—',
    },
    {
      title: t('shared.status'),
      key: 'active',
      width: 100,
      render: (_, row) => <CatalogActiveSwitch row={row} mutation={updateMutation} t={t} />,
    },
    {
      title: t('mallCatalog.list.colCreated'),
      dataIndex: 'createdAt',
      width: 160,
      render: (v) => {
        if (!v) return '—'
        try {
          return new Date(v).toLocaleString(i18n.language)
        } catch {
          return String(v)
        }
      },
    },
    {
      title: t('shared.actions'),
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_, row) => (
        <TableRowActions
          editTo={`/mall-catalog/${row.id}/edit`}
          showDelete
          deleteLoading={deletingId === row.id}
          onDelete={async () => {
            setDeletingId(row.id)
            try {
              await deleteMutation.mutateAsync(row.id)
              message.success(t('mallCatalog.list.deleted'))
            } catch (e) {
              message.error(e?.message ?? t('mallCatalog.list.deleteErr'))
            } finally {
              setDeletingId(null)
            }
          }}
          deleteTitle={t('mallCatalog.list.deleteTitle')}
          deleteDescription={t('mallCatalog.list.deleteDesc')}
        />
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <Card
        title={t('mallCatalog.list.title')}
        actions={
          <DashboardAddLinkButton to="/mall-catalog/create">
            {t('mallCatalog.list.new')}
          </DashboardAddLinkButton>
        }
      >
        {error ? (
          <Alert
            type="error"
            showIcon
            message={error}
            className="mb-4"
            action={
              <Button type="button" variant="ghost" onClick={() => refetch()}>
                {t('shared.retry')}
              </Button>
            }
          />
        ) : null}
        <DashboardTableToolbar
          search={search}
          onSearchChange={setSearch}
          placeholder={t('mallCatalog.list.searchPh')}
        />
        <Spin spinning={loading}>
          <Table
            {...DASHBOARD_TABLE_PROPS}
            rowKey="id"
            dataSource={displayData}
            columns={columns}
            pagination={buildDashboardPagination({
              page,
              pageSize,
              total: displayData.length,
              onChange: (p, ps) => {
                setPage(p)
                setPageSize(ps)
              },
              t,
            })}
          />
        </Spin>
      </Card>
    </div>
  )
}
