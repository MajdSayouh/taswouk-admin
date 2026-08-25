// View: product moderation decision — approve/reject a queued product, with a diff view when
// the product already lives and has a pending edit. See product-moderation-dashboard-spec.md.
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Alert, Spin, Tag, Modal, Input, message } from 'antd'
import { LeftOutlined, RightOutlined } from '@ant-design/icons'
import {
  useModerationReviewViewModel,
  useModerationDecisionMutations,
} from '../../viewmodels/useProductModerationViewModel.js'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { HtmlContent } from '../../components/ui/HtmlContent.jsx'
import { AuthenticatedProductImage } from '../../components/products/AuthenticatedProductImage.jsx'
import { formatRelativeTime } from '../../utils/relativeTime.js'

const REJECT_REASON_PRESET_KEYS = [
  'unclearImages',
  'incompleteDescription',
  'unreasonablePrice',
  'inappropriateContent',
  'wrongCategory',
]

/** One field's "published" value beside its "proposed" value — only rendered for fields actually
 * present in `pending_changes` (see product-moderation-dashboard-spec.md §2: "only edited fields
 * appear in this object"). */
function DiffRow({ label, current, proposed, html = false }) {
  return (
    <div className="grid grid-cols-1 gap-3 border-t border-slate-100 py-3 first:border-t-0 sm:grid-cols-2">
      <div>
        <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
          {label} — current
        </div>
        {html ? (
          <HtmlContent html={current} className="text-slate-600" />
        ) : (
          <p className="text-sm text-slate-600">{current || '—'}</p>
        )}
      </div>
      <div className="rounded-md bg-amber-50 p-2 ring-1 ring-amber-200">
        <div className="mb-1 text-xs font-medium uppercase tracking-wide text-amber-700">
          {label} — proposed
        </div>
        {html ? (
          <HtmlContent html={proposed} className="text-slate-900" />
        ) : (
          <p className="text-sm font-medium text-slate-900">{proposed || '—'}</p>
        )}
      </div>
    </div>
  )
}

export function ModerationReviewPage() {
  const { t } = useTranslation('pages')
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()

  const {
    product,
    loading,
    error,
    refetch,
    moderationStatus,
    hasPendingChanges,
    pendingChanges,
    rejectionReason,
    submittedAt,
    moderationDataUnavailable,
  } = useModerationReviewViewModel(id)

  const decisions = useModerationDecisionMutations()

  const [rejectOpen, setRejectOpen] = useState(false)
  const [reason, setReason] = useState('')

  const queueIds = Array.isArray(location.state?.queueIds) ? location.state.queueIds : null
  const { prevId, nextId } = useMemo(() => {
    if (!queueIds) return { prevId: null, nextId: null }
    const idx = queueIds.findIndex((qid) => String(qid) === String(id))
    if (idx === -1) return { prevId: null, nextId: null }
    return {
      prevId: idx > 0 ? queueIds[idx - 1] : null,
      nextId: idx < queueIds.length - 1 ? queueIds[idx + 1] : null,
    }
  }, [queueIds, id])

  function goTo(targetId) {
    if (targetId == null) return
    navigate(`/moderation/${targetId}`, { state: { queueIds } })
  }

  async function handleApprove() {
    try {
      await decisions.approve(id)
      message.success(t('moderation.queue.approveSuccess'))
      if (nextId != null) goTo(nextId)
      else refetch()
    } catch (err) {
      message.error(err?.message ?? t('moderation.queue.approveError'))
    }
  }

  async function handleConfirmReject() {
    if (!reason.trim()) return
    try {
      await decisions.reject({ productId: id, reason: reason.trim() })
      message.success(t('moderation.queue.rejectSuccess'))
      setRejectOpen(false)
      setReason('')
      if (nextId != null) goTo(nextId)
      else refetch()
    } catch (err) {
      message.error(err?.message ?? t('moderation.queue.rejectError'))
    }
  }

  if (loading && !product) {
    return (
      <div className="flex justify-center py-24">
        <Spin size="large" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Alert type="error" title={error} showIcon action={<Button onClick={refetch}>{t('shared.retry')}</Button>} />
        <Button as={Link} variant="ghost" to="/moderation">
          {t('moderation.review.backToQueue')}
        </Button>
      </div>
    )
  }

  if (!product) return null

  const images = Array.isArray(product.images) ? product.images : []
  const statusColor =
    moderationStatus === 'APPROVED' ? 'green' : moderationStatus === 'REJECTED' ? 'red' : 'orange'

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button as={Link} variant="ghost" to="/moderation">
            {t('moderation.review.backToQueue')}
          </Button>
          {moderationStatus ? (
            <Tag color={statusColor}>
              {t(`moderation.status.${moderationStatus}`, { defaultValue: moderationStatus })}
            </Tag>
          ) : null}
          {hasPendingChanges ? (
            <Tag color="gold">{t('moderation.queue.pendingEditBadge')}</Tag>
          ) : null}
          {submittedAt ? (
            <span className="text-sm text-slate-500">
              {t('moderation.review.waiting', { time: formatRelativeTime(submittedAt, t) })}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" disabled={prevId == null} onClick={() => goTo(prevId)}>
            <LeftOutlined /> {t('moderation.review.previous')}
          </Button>
          <Button type="button" variant="ghost" disabled={nextId == null} onClick={() => goTo(nextId)}>
            {t('moderation.review.next')} <RightOutlined />
          </Button>
        </div>
      </div>

      {moderationDataUnavailable ? (
        <Alert
          type="warning"
          showIcon
          title={t('moderation.review.dataUnavailableTitle')}
          description={t('moderation.review.dataUnavailableDescription')}
        />
      ) : null}

      {moderationStatus === 'REJECTED' && rejectionReason ? (
        <Alert type="error" showIcon title={t('moderation.review.rejectionReasonTitle')} description={rejectionReason} />
      ) : null}

      <Card title={t('moderation.review.imagesTitle')}>
        {images.length === 0 ? (
          <p className="text-sm text-slate-400">{t('shared.noData')}</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {images.map((path, idx) => (
              <div key={`${path}-${idx}`} className="aspect-square overflow-hidden rounded-lg border border-slate-200">
                <AuthenticatedProductImage
                  storagePath={path}
                  productId={product.id}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title={t('moderation.review.detailsTitle')}>
        {hasPendingChanges && pendingChanges ? (
          <div className="space-y-1">
            {'name' in pendingChanges ? (
              <DiffRow label={t('shared.name')} current={product.name} proposed={pendingChanges.name} />
            ) : null}
            {'description' in pendingChanges ? (
              <DiffRow
                label={t('shared.description')}
                current={product.description}
                proposed={pendingChanges.description}
                html
              />
            ) : null}
            {'category_id' in pendingChanges ? (
              <DiffRow
                label={t('moderation.review.category')}
                current={product.category}
                proposed={t('moderation.review.categoryIdOnly', { id: pendingChanges.category_id })}
              />
            ) : null}
          </div>
        ) : (
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-slate-500">{t('shared.name')}</dt>
              <dd className="font-medium text-slate-900">{product.name}</dd>
            </div>
            <div>
              <dt className="text-slate-500">{t('moderation.review.category')}</dt>
              <dd className="text-slate-800">{product.category || '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">{t('moderation.queue.colStore')}</dt>
              <dd className="text-slate-800">{product.store_name || '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">{t('moderation.queue.colPrice')}</dt>
              <dd className="tabular-nums font-medium text-slate-900">
                {Number(product.price ?? 0).toFixed(2)}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="mb-1 text-slate-500">{t('shared.description')}</dt>
              <dd>
                <HtmlContent
                  html={product.description}
                  empty={<span className="text-sm text-slate-500">{t('shared.emDash')}</span>}
                />
              </dd>
            </div>
          </dl>
        )}
      </Card>

      <Card>
        <div className="flex flex-wrap justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            className="text-red-600 border-red-200 hover:bg-red-50"
            onClick={() => setRejectOpen(true)}
            disabled={decisions.approving || decisions.rejecting}
          >
            {t('moderation.queue.reject')}
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleApprove}
            loading={decisions.approving}
            disabled={decisions.rejecting}
          >
            {t('moderation.queue.approve')}
          </Button>
        </div>
      </Card>

      <Modal
        open={rejectOpen}
        title={t('moderation.queue.rejectTitle')}
        onCancel={() => setRejectOpen(false)}
        footer={[
          <Button key="cancel" type="button" variant="ghost" onClick={() => setRejectOpen(false)}>
            {t('shared.cancel')}
          </Button>,
          <Button
            key="confirm"
            type="button"
            variant="primary"
            disabled={!reason.trim()}
            loading={decisions.rejecting}
            onClick={handleConfirmReject}
          >
            {t('moderation.queue.reject')}
          </Button>,
        ]}
      >
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {REJECT_REASON_PRESET_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setReason(t(`moderation.reasons.${key}`))}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 hover:border-[#FF7D29] hover:text-[#FF7D29] transition-colors"
              >
                {t(`moderation.reasons.${key}`)}
              </button>
            ))}
          </div>
          <Input.TextArea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t('moderation.queue.reasonPlaceholder')}
            rows={3}
            autoFocus
          />
        </div>
      </Modal>
    </div>
  )
}
