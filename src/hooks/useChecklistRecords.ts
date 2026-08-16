import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  demoChecklistItems,
  demoChecklistRecordDetails,
  demoChecklistRecords,
  demoItems,
  demoUser,
  isDemoMode,
} from '@/lib/demo'
import { useSession } from '@/hooks/useSession'
import type {
  ChecklistRecord,
  ChecklistRecordDetail,
  ChecklistStatus,
  Json,
} from '@/types'

export interface ChecklistResultInput {
  checklist_item_id: string
  status: ChecklistStatus
  comment: string | null
  /** 「不足」のときに入力された残数。未入力なら null */
  remaining_quantity: number | null
}

/** 物件のチェック実施履歴 */
export function useChecklistRecords(propertyId: string | undefined) {
  const { loading: sessionLoading } = useSession()
  const [records, setRecords] = useState<ChecklistRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!propertyId) {
      setRecords([])
      setLoading(false)
      return
    }

    if (isDemoMode) {
      setRecords(
        [...demoChecklistRecords]
          .filter((r) => r.property_id === propertyId)
          .sort((a, b) => b.performed_at.localeCompare(a.performed_at)),
      )
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const { data, error: selectError } = await supabase
      .from('checklist_records')
      .select('*')
      .eq('property_id', propertyId)
      .order('performed_at', { ascending: false })

    if (selectError) setError(selectError.message)
    else setRecords(data ?? [])

    setLoading(false)
  }, [propertyId])

  useEffect(() => {
    if (sessionLoading) return
    void reload()
  }, [reload, sessionLoading])

  /**
   * 実施結果を保存する。
   * 記録・明細・備品数量の更新は DB 側の関数で 1 トランザクションにまとめる。
   */
  const submit = useCallback(
    async (
      checklistId: string,
      results: ChecklistResultInput[],
    ): Promise<string> => {
      if (!propertyId) throw new Error('物件が指定されていません。')

      if (isDemoMode) {
        const recordId = crypto.randomUUID()
        demoChecklistRecords.push({
          id: recordId,
          checklist_id: checklistId,
          property_id: propertyId,
          performed_by: demoUser.id,
          performed_at: new Date().toISOString(),
        })

        for (const result of results) {
          demoChecklistRecordDetails.push({
            id: crypto.randomUUID(),
            checklist_record_id: recordId,
            checklist_item_id: result.checklist_item_id,
            status: result.status,
            comment: result.comment,
          })

          if (result.status !== 'short') continue

          const checklistItem = demoChecklistItems.find(
            (ci) => ci.id === result.checklist_item_id,
          )
          if (!checklistItem?.item_id) continue

          const index = demoItems.findIndex((i) => i.id === checklistItem.item_id)
          if (index < 0) continue

          const next =
            result.remaining_quantity ?? demoItems[index].threshold - 1
          demoItems[index] = {
            ...demoItems[index],
            quantity: Math.max(0, next),
            updated_at: new Date().toISOString(),
          }
        }

        await reload()
        return recordId
      }

      const { data, error: rpcError } = await supabase.rpc(
        'submit_checklist_record',
        {
          p_checklist_id: checklistId,
          p_property_id: propertyId,
          // Json 型に合わせる (中身は ChecklistResultInput の配列)
          p_details: results as unknown as Json,
        },
      )

      if (rpcError) throw rpcError
      await reload()
      return data as string
    },
    [propertyId, reload],
  )

  return { records, loading, error, reload, submit }
}

/** 1件の実施記録の明細 */
export function useChecklistRecordDetails(recordId: string | undefined) {
  const { loading: sessionLoading } = useSession()
  const [details, setDetails] = useState<ChecklistRecordDetail[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (sessionLoading) return
    let active = true

    async function load() {
      if (!recordId) {
        setDetails([])
        setLoading(false)
        return
      }

      if (isDemoMode) {
        setDetails(
          demoChecklistRecordDetails.filter(
            (d) => d.checklist_record_id === recordId,
          ),
        )
        setLoading(false)
        return
      }

      const { data } = await supabase
        .from('checklist_record_details')
        .select('*')
        .eq('checklist_record_id', recordId)

      if (!active) return
      setDetails(data ?? [])
      setLoading(false)
    }

    void load()
    return () => {
      active = false
    }
  }, [recordId, sessionLoading])

  return { details, loading }
}
