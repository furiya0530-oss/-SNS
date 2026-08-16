import { supabase } from '@/lib/supabase'
import {
  demoChecklistItems,
  demoChecklistRecordDetails,
  demoChecklistRecords,
  demoChecklists,
  demoProfile,
  demoProperties,
  isDemoMode,
} from '@/lib/demo'
import type {
  Checklist,
  ChecklistItem,
  ChecklistRecord,
  ChecklistRecordDetail,
  Profile,
  Property,
} from '@/types'

export interface ChecklistHistory {
  records: ChecklistRecord[]
  details: ChecklistRecordDetail[]
  checklists: Checklist[]
  checklistItems: ChecklistItem[]
  properties: Property[]
  profiles: Profile[]
}

/**
 * CSV 出力用に、チェック履歴に必要なデータをまとめて取得する。
 * propertyId を省略すると自分の全物件分を取る。
 */
export async function fetchChecklistHistory(
  propertyId?: string,
): Promise<ChecklistHistory> {
  if (isDemoMode) {
    const properties = propertyId
      ? demoProperties.filter((p) => p.id === propertyId)
      : demoProperties
    const propertyIds = new Set(properties.map((p) => p.id))
    const records = demoChecklistRecords.filter((r) =>
      propertyIds.has(r.property_id),
    )
    const recordIds = new Set(records.map((r) => r.id))

    return {
      records,
      details: demoChecklistRecordDetails.filter((d) =>
        recordIds.has(d.checklist_record_id),
      ),
      checklists: demoChecklists,
      checklistItems: demoChecklistItems,
      properties,
      profiles: [demoProfile],
    }
  }

  let recordQuery = supabase.from('checklist_records').select('*')
  if (propertyId) recordQuery = recordQuery.eq('property_id', propertyId)

  // RLS があるので、いずれも自分の分だけが返る
  const [recordResult, checklistResult, checklistItemResult, propertyResult, profileResult] =
    await Promise.all([
      recordQuery,
      supabase.from('checklists').select('*'),
      supabase.from('checklist_items').select('*'),
      supabase.from('properties').select('*'),
      supabase.from('profiles').select('*'),
    ])

  const records = recordResult.data ?? []
  const recordIds = records.map((r) => r.id)

  const details = recordIds.length
    ? ((
        await supabase
          .from('checklist_record_details')
          .select('*')
          .in('checklist_record_id', recordIds)
      ).data ?? [])
    : []

  return {
    records,
    details,
    checklists: checklistResult.data ?? [],
    checklistItems: checklistItemResult.data ?? [],
    properties: propertyResult.data ?? [],
    profiles: profileResult.data ?? [],
  }
}
