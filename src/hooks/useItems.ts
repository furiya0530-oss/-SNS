import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { demoItems, isDemoMode } from '@/lib/demo'
import { removeItemPhoto } from '@/lib/itemPhotos'
import { useSession } from '@/hooks/useSession'
import type { Item } from '@/types'

export interface ItemInput {
  name: string
  category: string | null
  quantity: number
  threshold: number
  photo_url: string | null
}

/**
 * 備品の取得と更新。
 *
 * propertyId を渡すとその物件のみ、省略すると自分の全物件分を扱う。
 * 絞り込みは RLS が効くので、クエリに owner_id は書かない。
 */
export function useItems(propertyId?: string) {
  const { loading: sessionLoading } = useSession()
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (isDemoMode) {
      setItems(
        propertyId
          ? demoItems.filter((item) => item.property_id === propertyId)
          : [...demoItems],
      )
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    let query = supabase.from('items').select('*').order('name')
    if (propertyId) query = query.eq('property_id', propertyId)

    const { data, error: selectError } = await query
    if (selectError) setError(selectError.message)
    else setItems(data ?? [])

    setLoading(false)
  }, [propertyId])

  useEffect(() => {
    if (sessionLoading) return
    void reload()
  }, [reload, sessionLoading])

  const create = useCallback(
    async (targetPropertyId: string, input: ItemInput): Promise<Item> => {
      if (isDemoMode) {
        const created: Item = {
          id: crypto.randomUUID(),
          property_id: targetPropertyId,
          ...input,
          updated_at: new Date().toISOString(),
        }
        demoItems.push(created)
        setItems((prev) => [...prev, created])
        return created
      }

      const { data, error: insertError } = await supabase
        .from('items')
        .insert({ property_id: targetPropertyId, ...input })
        .select()
        .single()

      if (insertError) throw insertError
      setItems((prev) => [...prev, data])
      return data
    },
    [],
  )

  const update = useCallback(
    async (id: string, input: ItemInput): Promise<Item> => {
      if (isDemoMode) {
        const index = demoItems.findIndex((item) => item.id === id)
        if (index < 0) throw new Error('備品が見つかりませんでした。')
        const updated = {
          ...demoItems[index],
          ...input,
          updated_at: new Date().toISOString(),
        }
        demoItems[index] = updated
        setItems((prev) => prev.map((i) => (i.id === id ? updated : i)))
        return updated
      }

      const { data, error: updateError } = await supabase
        .from('items')
        .update(input)
        .eq('id', id)
        .select()
        .single()

      if (updateError) throw updateError
      setItems((prev) => prev.map((i) => (i.id === id ? data : i)))
      return data
    },
    [],
  )

  const remove = useCallback(async (item: Item): Promise<void> => {
    if (isDemoMode) {
      const index = demoItems.findIndex((i) => i.id === item.id)
      if (index >= 0) demoItems.splice(index, 1)
      setItems((prev) => prev.filter((i) => i.id !== item.id))
      return
    }

    const { error: deleteError } = await supabase
      .from('items')
      .delete()
      .eq('id', item.id)

    if (deleteError) throw deleteError
    await removeItemPhoto(item.photo_url)
    setItems((prev) => prev.filter((i) => i.id !== item.id))
  }, [])

  /**
   * 数量を増減する。ボタン連打でも待たされないよう先に画面を更新し、
   * 失敗したら元に戻す。
   */
  const adjustQuantity = useCallback(
    async (item: Item, delta: number): Promise<void> => {
      const next = Math.max(0, item.quantity + delta)
      if (next === item.quantity) return

      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, quantity: next } : i)),
      )

      if (isDemoMode) {
        const index = demoItems.findIndex((i) => i.id === item.id)
        if (index >= 0) demoItems[index] = { ...demoItems[index], quantity: next }
        return
      }

      const { data, error: updateError } = await supabase
        .from('items')
        .update({ quantity: next })
        .eq('id', item.id)
        .select()
        .single()

      if (updateError) {
        // 失敗したら元の値へ戻す
        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id ? { ...i, quantity: item.quantity } : i,
          ),
        )
        setError(updateError.message)
        return
      }

      setItems((prev) => prev.map((i) => (i.id === item.id ? data : i)))
    },
    [],
  )

  return { items, loading, error, reload, create, update, remove, adjustQuantity }
}
