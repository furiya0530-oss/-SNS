import { formatDateTime } from '@/lib/format'
import { CHECKLIST_STATUS_LABELS } from '@/types'
import type {
  Checklist,
  ChecklistItem,
  ChecklistRecord,
  ChecklistRecordDetail,
  Profile,
  Property,
} from '@/types'

/** 要件 6.4 のチェック履歴の出力項目 */
export const CHECKLIST_CSV_HEADERS = [
  '物件名',
  'チェックリスト名',
  '実施日',
  '実施者',
  '項目',
  'ステータス',
  'コメント',
] as const

interface ChecklistCsvSource {
  records: ChecklistRecord[]
  details: ChecklistRecordDetail[]
  checklists: Checklist[]
  checklistItems: ChecklistItem[]
  properties: Property[]
  /** 実施者の表示名を引くためのプロフィール */
  profiles: Profile[]
}

/**
 * チェック履歴を明細 1 行 = CSV 1 行で書き出す。
 * 月次の集計や報告に使えるよう、実施日の新しい順に並べる。
 */
export function toChecklistCsvRows({
  records,
  details,
  checklists,
  checklistItems,
  properties,
  profiles,
}: ChecklistCsvSource): Record<string, string>[] {
  const sortedRecords = [...records].sort((a, b) =>
    b.performed_at.localeCompare(a.performed_at),
  )

  const rows: Record<string, string>[] = []

  for (const record of sortedRecords) {
    const property = properties.find((p) => p.id === record.property_id)
    const checklist = checklists.find((c) => c.id === record.checklist_id)
    const performer = profiles.find((p) => p.id === record.performed_by)
    const recordDetails = details.filter(
      (d) => d.checklist_record_id === record.id,
    )

    for (const detail of recordDetails) {
      const checklistItem = checklistItems.find(
        (ci) => ci.id === detail.checklist_item_id,
      )

      rows.push({
        物件名: property?.name ?? '',
        チェックリスト名: checklist?.title ?? '',
        実施日: formatDateTime(record.performed_at),
        実施者: performer?.name ?? '',
        項目: checklistItem?.label ?? '(削除された項目)',
        ステータス: CHECKLIST_STATUS_LABELS[detail.status],
        コメント: detail.comment ?? '',
      })
    }
  }

  return rows
}
