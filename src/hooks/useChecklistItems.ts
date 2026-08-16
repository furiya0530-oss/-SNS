import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { demoChecklistItems, isDemoMode } from '@/lib/demo'
import { useSession } from '@/hooks/useSession'
import type { ChecklistItem } from '@/types'

export interface ChecklistItemInput {
  label: string
  item_id: string | null
}

/** チェックリストの確認項目 */
export function useChecklistItems(checklistId: string | undefined) {
  const { loading: sessionLoading } = useSession()
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!checklistId) {
      setChecklistItems([])
      setLoading(false)
      return
    }

    if (isDemoMode) {
      setChecklistItems(
        demoChecklistItems.filter((ci) => ci.checklist_id === checklistId),
      )
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const { data, error: selectError } = await supabase
      .from('checklist_items')
      .select('*')
      .eq('checklist_id', checklistId)

    if (selectError) setError(selectError.message)
    else setChecklistItems(data ?? [])

    setLoading(false)
  }, [checklistId])

  useEffect(() => {
    if (sessionLoading) return
    void reload()
  }, [reload, sessionLoading])

  const create = useCallback(
    async (input: ChecklistItemInput): Promise<void> => {
      if (!checklistId) throw new Error('チェックリストが指定されていません。')

      if (isDemoMode) {
        const created: ChecklistItem = {
          id: crypto.randomUUID(),
          checklist_id: checklistId,
          ...input,
        }
        demoChecklistItems.push(created)
        setChecklistItems((prev) => [...prev, created])
        return
      }

      const { data, error: insertError } = await supabase
        .from('checklist_items')
        .insert({ checklist_id: checklistId, ...input })
        .select()
        .single()

      if (insertError) throw insertError
      setChecklistItems((prev) => [...prev, data])
    },
    [checklistId],
  )

  const update = useCallback(
    async (id: string, input: ChecklistItemInput): Promise<void> => {
      if (isDemoMode) {
        const index = demoChecklistItems.findIndex((ci) => ci.id === id)
        if (index >= 0) {
          demoChecklistItems[index] = { ...demoChecklistItems[index], ...input }
        }
        setChecklistItems((prev) =>
          prev.map((ci) => (ci.id === id ? { ...ci, ...input } : ci)),
        )
        return
      }

      const { error: updateError } = await supabase
        .from('checklist_items')
        .update(input)
        .eq('id', id)

      if (updateError) throw updateError
      setChecklistItems((prev) =>
        prev.map((ci) => (ci.id === id ? { ...ci, ...input } : ci)),
      )
    },
    [],
  )

  const remove = useCallback(async (id: string): Promise<void> => {
    if (isDemoMode) {
      const index = demoChecklistItems.findIndex((ci) => ci.id === id)
      if (index >= 0) demoChecklistItems.splice(index, 1)
      setChecklistItems((prev) => prev.filter((ci) => ci.id !== id))
      return
    }

    const { error: deleteError } = await supabase
      .from('checklist_items')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError
    setChecklistItems((prev) => prev.filter((ci) => ci.id !== id))
  }, [])

  return { checklistItems, loading, error, reload, create, update, remove }
}
