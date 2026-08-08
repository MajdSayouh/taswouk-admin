// Unified row actions: edit (link or callback) + optional delete with confirm — icon + label everywhere.
import { Link } from 'react-router-dom'
import { Space, Popconfirm } from 'antd'
import { EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { Button as AntButton } from 'antd'
import { useTranslation } from 'react-i18next'
import { Button } from '../ui/Button.jsx'

const actionBtnClass =
  'inline-flex items-center gap-1.5 !px-2.5 !py-1.5 !h-8 min-h-8 text-sm font-medium'

/**
 * @param {{
 *   editTo?: string
 *   onEdit?: () => void
 *   editLabel?: string
 *   showEdit?: boolean
 *   showDelete?: boolean
 *   onDelete?: () => void | Promise<void>
 *   deleteTitle?: string
 *   deleteDescription?: string
 *   deleteLoading?: boolean
 * }} props
 */
export function TableRowActions({
  editTo,
  onEdit,
  editLabel,
  showEdit = true,
  showDelete = true,
  onDelete,
  deleteTitle = '',
  deleteDescription,
  deleteLoading = false,
}) {
  const { t } = useTranslation('pages')
  const editText = editLabel ?? t('shared.edit')

  const editEl =
    showEdit && editTo ? (
      <Button
        as={Link}
        variant="ghost"
        to={editTo}
        className={`${actionBtnClass} text-slate-700`}
      >
        <EditOutlined className="text-base text-slate-600" aria-hidden />
        <span>{editText}</span>
      </Button>
    ) : showEdit && onEdit ? (
      <Button type="button" variant="ghost" onClick={onEdit} className={`${actionBtnClass} text-slate-700`}>
        <EditOutlined className="text-base text-slate-600" aria-hidden />
        <span>{editText}</span>
      </Button>
    ) : null

  const deleteEl =
    showDelete && onDelete ? (
      <Popconfirm
        title={deleteTitle}
        description={deleteDescription}
        okText={t('shared.delete')}
        cancelText={t('shared.cancel')}
        okButtonProps={{ danger: true, loading: deleteLoading }}
        onConfirm={onDelete}
      >
        <AntButton
          type="text"
          danger
          loading={deleteLoading}
          className={`${actionBtnClass} !text-rose-600 hover:!bg-rose-50`}
          icon={<DeleteOutlined />}
        >
          {t('shared.delete')}
        </AntButton>
      </Popconfirm>
    ) : null

  return (
    <Space size="small" wrap className="dashboard-table-row-actions">
      {editEl}
      {deleteEl}
    </Space>
  )
}
