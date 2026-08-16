import { Link, useParams } from 'react-router-dom'
import { EmptyState } from '@/components/EmptyState'
import { useChecklistRecords } from '@/hooks/useChecklistRecords'
import { useChecklists } from '@/hooks/useChecklists'
import { useProperty } from '@/hooks/useProperty'
import { formatDateTime } from '@/lib/format'
import { ErrorMessage, Loading } from '@/components/Feedback'

/** チェック履歴の一覧 (日付の新しい順) */
export function ChecklistRecordsPage() {
  const { propertyId } = useParams<{ propertyId: string }>()
  const { property } = useProperty(propertyId)
  const { checklists } = useChecklists(propertyId)
  const { records, loading, error } = useChecklistRecords(propertyId)

  return (
    <div className="space-y-6">
      <div>
        <Link
          to={`/properties/${propertyId}`}
          className="text-sm text-slate-500 hover:text-slate-900"
        >
          ← 物件詳細
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">チェック履歴</h1>
        <p className="mt-1 text-sm text-slate-500">
          {property?.name ?? ''} の実施記録です。
        </p>
      </div>

      {error && (
        <ErrorMessage>{error}</ErrorMessage>
      )}

      {loading ? (
        <Loading />
      ) : records.length === 0 ? (
        <EmptyState>
          まだ実施記録がありません。チェックリストを実施すると、ここに残ります。
        </EmptyState>
      ) : (
        <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {records.map((record) => {
            const checklist = checklists.find((c) => c.id === record.checklist_id)
            return (
              <li key={record.id}>
                <Link
                  to={`/properties/${propertyId}/records/${record.id}`}
                  className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">
                      {checklist?.title ?? 'チェックリスト'}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {formatDateTime(record.performed_at)}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm text-slate-400">詳細 →</span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
