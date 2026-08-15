import type { Database } from './database'

export type { Database, Json } from './database'

/** テーブルの行の型を取り出すユーティリティ (例: Tables<'items'>) */
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

// ---- 各テーブルの行 ----
export type Profile = Tables<'profiles'>
export type Property = Tables<'properties'>
export type Item = Tables<'items'>
export type Checklist = Tables<'checklists'>
export type ChecklistItem = Tables<'checklist_items'>
export type ChecklistRecord = Tables<'checklist_records'>
export type ChecklistRecordDetail = Tables<'checklist_record_details'>

// ---- ENUM ----
export type PlanType = Database['public']['Enums']['plan_type']
export type ChecklistStatus = Database['public']['Enums']['checklist_status']

/**
 * 備品カテゴリ。
 * DB 側は自由入力の text なので、ここでの一覧は UI の選択肢という位置づけ。
 */
export const ITEM_CATEGORIES = [
  { value: 'amenity', label: 'アメニティ' },
  { value: 'linen', label: 'リネン' },
  { value: 'cleaning', label: '清掃用品' },
  { value: 'kitchen', label: 'キッチン' },
  { value: 'equipment', label: '設備・家電' },
  { value: 'other', label: 'その他' },
] as const

export type ItemCategory = (typeof ITEM_CATEGORIES)[number]['value']

/** カテゴリ値を日本語ラベルにする。未知の値はそのまま返す。 */
export function itemCategoryLabel(category: string | null): string {
  if (!category) return '未分類'
  return (
    ITEM_CATEGORIES.find((c) => c.value === category)?.label ?? category
  )
}

/** チェック結果のラベル */
export const CHECKLIST_STATUS_LABELS: Record<ChecklistStatus, string> = {
  ok: '問題なし',
  short: '不足',
  broken: '破損',
}
