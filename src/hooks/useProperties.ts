import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { demoProperties, isDemoMode } from '@/lib/demo'
import { useSession } from '@/hooks/useSession'
import type { Property } from '@/types'

export interface PropertyInput {
  name: string
  address: string | null
}

/**
 * ログイン中ユーザーの物件を取得・追加・更新・削除する。
 *
 * 取得条件に owner_id を書いていないのは、RLS が自分の行だけに
 * 絞ってくれるため。書き込み時は RLS の with check があるので
 * owner_id には必ず自分の id を入れる。
 */
export function useProperties() {
  const { user, loading: sessionLoading } = useSession()
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const userId = user?.id ?? null

  const reload = useCallback(async () => {
    if (isDemoMode) {
      setProperties([...demoProperties])
      setLoading(false)
      return
    }
    if (!userId) {
      setProperties([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const { data, error: selectError } = await supabase
      .from('properties')
      .select('*')
      .order('created_at', { ascending: true })

    if (selectError) setError(selectError.message)
    else setProperties(data ?? [])

    setLoading(false)
  }, [userId])

  useEffect(() => {
    if (sessionLoading) return
    void reload()
  }, [reload, sessionLoading])

  const create = useCallback(
    async (input: PropertyInput): Promise<Property> => {
      if (isDemoMode) {
        const created: Property = {
          id: crypto.randomUUID(),
          owner_id: demoProperties[0]?.owner_id ?? 'demo',
          name: input.name,
          address: input.address,
          created_at: new Date().toISOString(),
        }
        demoProperties.push(created)
        setProperties([...demoProperties])
        return created
      }

      if (!userId) throw new Error('ログインが必要です。')

      const { data, error: insertError } = await supabase
        .from('properties')
        .insert({
          owner_id: userId,
          name: input.name,
          address: input.address,
        })
        .select()
        .single()

      if (insertError) throw insertError
      setProperties((prev) => [...prev, data])
      return data
    },
    [userId],
  )

  const update = useCallback(
    async (id: string, input: PropertyInput): Promise<Property> => {
      if (isDemoMode) {
        const index = demoProperties.findIndex((p) => p.id === id)
        if (index < 0) throw new Error('物件が見つかりませんでした。')
        const updated = { ...demoProperties[index], ...input }
        demoProperties[index] = updated
        setProperties([...demoProperties])
        return updated
      }

      const { data, error: updateError } = await supabase
        .from('properties')
        .update({ name: input.name, address: input.address })
        .eq('id', id)
        .select()
        .single()

      if (updateError) throw updateError
      setProperties((prev) => prev.map((p) => (p.id === id ? data : p)))
      return data
    },
    [],
  )

  const remove = useCallback(async (id: string): Promise<void> => {
    if (isDemoMode) {
      const index = demoProperties.findIndex((p) => p.id === id)
      if (index >= 0) demoProperties.splice(index, 1)
      setProperties([...demoProperties])
      return
    }

    const { error: deleteError } = await supabase
      .from('properties')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError
    setProperties((prev) => prev.filter((p) => p.id !== id))
  }, [])

  return { properties, loading, error, reload, create, update, remove }
}
