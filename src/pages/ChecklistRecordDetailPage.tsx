import { Link, useParams } from 'react-router-dom'
import { EmptyState } from '@/components/EmptyState'
import { useChecklistItems } from '@/hooks/useChecklistItems'
import {
  useChecklistRecordDetails,
  useChecklistRecords,
} from '@/hooks/useChecklistRecords'
import { useChecklists } from '@/hooks/useChecklists'
import { formatDateTime } from '@/lib/format'
import { CHECKLIST_STATUS_CLASSES, CHECKLIST_STATUS_LABELS } from '@/types'
import { Loading } from '@/components/Feedback'

/** チェック履歴の詳細 */
export function ChecklistRecordDetailPage() {
  const { propertyId, recordId } = useParams<{
    propertyId: string
    recordId: string
  }>()

  const { records, loading: recordsLoading } = useChecklistRecords(propertyId)
  const record = records.find((r) => r.id === recordId)

  const { checklists } = useChecklists(propertyId)
  const checklist = checklists.find((c) => c.id === record?.checklist_id)
  const { checklistItems } = useChecklistItems(record?.checklist_id)
  const { details, loading: detailsLoading } = useChecklistRecordDetails(recordId)

  if (recordsLoading) {
    return <Loading />
  }

  if (!record) {
    return (
      <div className="space-y-4">
        <p className="text-slate-600">実施記録が見つかりませんでした。</p>
        <Link
          to={`/properties/${propertyId}/records`}
          className="inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          チェック履歴へ戻る
        </Link>
      </div>
    )
  }

  const issues = details.filter((d) => d.status !== 'ok')

  return (
    <div className="space-y-6">
      <div>
        <Link
          to={`/properties/${propertyId}/records`}
          className="text-sm text-slate-500 hover:text-slate-900"
        >
          ← チェック履歴
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">
          {checklist?.title ?? 'チェックリスト'}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          実施日時: {formatDateTime(record.performed_at)}
        </p>
      </div>

      {issues.length > 0 && (
        <p
          role="status"
          className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
        >
          {issues.length} 件の項目で「不足」または「破損」が記録されています。
        </p>
      )}

      {detailsLoading ? (
        <Loading />
      ) : details.length === 0 ? (
        <EmptyState>明細がありません。</EmptyState>
      ) : (
        <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {details.map((detail) => {
            const checklistItem = checklistItems.find(
              (ci) => ci.id === detail.checklist_item_id,
            )
            return (
              <li key={detail.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <p className="min-w-0 font-medium text-slate-900">
                    {checklistItem?.label ?? '(削除された項目)'}
                  </p>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                      CHECKLIST_STATUS_CLASSES[detail.status]
                    }`}
                  >
                    {CHECKLIST_STATUS_LABELS[detail.status]}
                  </span>
                </div>
                {detail.comment && (
                  <p className="mt-2 rounded-md bg-slate-50 p-3 text-sm text-slate-600">
                    {detail.comment}
                  </p>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
