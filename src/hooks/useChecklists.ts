import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { demoChecklistItems, demoChecklists, isDemoMode } from '@/lib/demo'
import { useSession } from '@/hooks/useSession'
import type { Checklist } from '@/types'

/** 物件のチェックリスト(テンプレート)一覧 */
export function useChecklists(propertyId: string | undefined) {
  const { loading: sessionLoading } = useSession()
  const [checklists, setChecklists] = useState<Checklist[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!propertyId) {
      setChecklists([])
      setLoading(false)
      return
    }

    if (isDemoMode) {
      setChecklists(demoChecklists.filter((c) => c.property_id === propertyId))
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const { data, error: selectError } = await supabase
      .from('checklists')
      .select('*')
      .eq('property_id', propertyId)
      .order('created_at')

    if (selectError) setError(selectError.message)
    else setChecklists(data ?? [])

    setLoading(false)
  }, [propertyId])

  useEffect(() => {
    if (sessionLoading) return
    void reload()
  }, [reload, sessionLoading])

  const create = useCallback(
    async (title: string): Promise<Checklist> => {
      if (!propertyId) throw new Error('物件が指定されていません。')

      if (isDemoMode) {
        const created: Checklist = {
          id: crypto.randomUUID(),
          property_id: propertyId,
          title,
          created_at: new Date().toISOString(),
        }
        demoChecklists.push(created)
        setChecklists((prev) => [...prev, created])
        return created
      }

      const { data, error: insertError } = await supabase
        .from('checklists')
        .insert({ property_id: propertyId, title })
        .select()
        .single()

      if (insertError) throw insertError
      setChecklists((prev) => [...prev, data])
      return data
    },
    [propertyId],
  )

  const update = useCallback(
    async (id: string, title: string): Promise<void> => {
      if (isDemoMode) {
        const index = demoChecklists.findIndex((c) => c.id === id)
        if (index >= 0) demoChecklists[index] = { ...demoChecklists[index], title }
        setChecklists((prev) =>
          prev.map((c) => (c.id === id ? { ...c, title } : c)),
        )
        return
      }

      const { error: updateError } = await supabase
        .from('checklists')
        .update({ title })
        .eq('id', id)

      if (updateError) throw updateError
      setChecklists((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title } : c)),
      )
    },
    [],
  )

  const remove = useCallback(async (id: string): Promise<void> => {
    if (isDemoMode) {
      const index = demoChecklists.findIndex((c) => c.id === id)
      if (index >= 0) demoChecklists.splice(index, 1)
      // 紐づく項目も消す
      for (let i = demoChecklistItems.length - 1; i >= 0; i--) {
        if (demoChecklistItems[i].checklist_id === id) {
          demoChecklistItems.splice(i, 1)
        }
      }
      setChecklists((prev) => prev.filter((c) => c.id !== id))
      return
    }

    const { error: deleteError } = await supabase
      .from('checklists')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError
    setChecklists((prev) => prev.filter((c) => c.id !== id))
  }, [])

  return { checklists, loading, error, reload, create, update, remove }
}
