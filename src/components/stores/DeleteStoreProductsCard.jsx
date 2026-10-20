import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, Input, Modal, Typography, message } from 'antd'
import { DeleteOutlined, ExclamationCircleFilled } from '@ant-design/icons'
import * as storeService from '../../services/storeService.js'
import { queryKeys } from '../../query/queryKeys.js'
import { isDeleteConfirmed } from '../../utils/storeProductsDelete.js'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'

/**
 * Danger zone on the store page: deletes every product of the store, for good.
 * The modal shows what is about to go and unlocks the button only once the
 * admin types the number of products. Admin-only on the backend.
 *
 * @param {{ storeId: number | string, storeName?: string }} props
 */
export function DeleteStoreProductsCard({ storeId, storeName = '' }) {
  const { t } = useTranslation('pages')
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')

  const countKey = [...queryKeys.stores.detail(storeId), 'productsCount']
  const countQuery = useQuery({
    queryKey: countKey,
    queryFn: () => storeService.getStoreProductsCount(storeId),
  })
  const count = countQuery.data ?? 0

  const deleteMutation = useMutation({
    mutationFn: () => storeService.deleteStoreProducts(storeId),
    onSuccess: (deleted) => {
      setOpen(false)
      message.success(t('stores.deleteProducts.success', { count: deleted }))
      queryClient.setQueryData(countKey, 0)
      queryClient.invalidateQueries({ queryKey: queryKeys.products.root })
      queryClient.invalidateQueries({ queryKey: queryKeys.stores.all() })
    },
  })

  const openModal = () => {
    setTyped('')
    deleteMutation.reset()
    setOpen(true)
    // The figure in the modal must be the current one, not the one cached
    // when the page opened: a seller may have added products since.
    countQuery.refetch()
  }

  const confirmed = isDeleteConfirmed(typed, count) && !countQuery.isFetching
  const submit = () => {
    if (confirmed && !deleteMutation.isPending) deleteMutation.mutate()
  }

  return (
    <Card title={t('stores.deleteProducts.title')} className="border-rose-200">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="max-w-xl">
          <p className="text-sm text-slate-700">{t('stores.deleteProducts.hint')}</p>
          <p className="mt-1 text-xs text-slate-500">
            {countQuery.isLoading
              ? t('stores.deleteProducts.counting')
              : countQuery.isError
                ? t('stores.deleteProducts.countErr')
                : t('stores.deleteProducts.current', { count })}
          </p>
        </div>
        <Button
          type="button"
          variant="danger"
          onClick={openModal}
          disabled={countQuery.isLoading || countQuery.isError || count === 0}
          title={count === 0 ? t('stores.deleteProducts.empty') : undefined}
        >
          <DeleteOutlined className="me-2" />
          {t('stores.deleteProducts.button')}
        </Button>
      </div>

      <Modal
        open={open}
        title={
          <span className="inline-flex items-center gap-2">
            <ExclamationCircleFilled className="text-rose-600" />
            {t('stores.deleteProducts.confirmTitle')}
          </span>
        }
        okText={t('stores.deleteProducts.confirmOk', { count })}
        cancelText={t('shared.cancel')}
        okButtonProps={{ danger: true, disabled: !confirmed }}
        onOk={submit}
        onCancel={() => !deleteMutation.isPending && setOpen(false)}
        confirmLoading={deleteMutation.isPending}
        maskClosable={!deleteMutation.isPending}
        closable={!deleteMutation.isPending}
        destroyOnHidden
      >
        <div className="flex flex-col gap-4">
          <Alert
            type="error"
            showIcon
            title={t('stores.deleteProducts.confirmWarning', { count, store: storeName })}
            description={t('stores.deleteProducts.confirmDetails')}
          />
          {deleteMutation.isError ? (
            <Alert
              type="error"
              title={deleteMutation.error?.message ?? t('stores.deleteProducts.error')}
            />
          ) : null}
          <div>
            <Typography.Text>
              {t('stores.deleteProducts.typeToConfirm', { count })}
            </Typography.Text>
            <Input
              autoFocus
              className="mt-2"
              inputMode="numeric"
              placeholder={String(count)}
              value={typed}
              disabled={deleteMutation.isPending || countQuery.isFetching}
              status={typed && !confirmed ? 'error' : undefined}
              onChange={(e) => setTyped(e.target.value)}
              onPressEnter={submit}
            />
          </div>
        </div>
      </Modal>
    </Card>
  )
}
