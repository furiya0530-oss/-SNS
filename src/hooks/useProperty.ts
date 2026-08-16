import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { demoProperties, isDemoMode } from '@/lib/demo'
import { useSession } from '@/hooks/useSession'
import type { Property } from '@/types'

/**
 * 物件を1件取得する。
 * 他人の物件は RLS により見つからない (notFound と同じ扱いになる)。
 */
export function useProperty(propertyId: string | undefined) {
  const { loading: sessionLoading } = useSession()
  const [property, setProperty] = useState<Property | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!propertyId) {
      setProperty(null)
      setLoading(false)
      return
    }

    if (isDemoMode) {
      setProperty(demoProperties.find((p) => p.id === propertyId) ?? null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const { data, error: selectError } = await supabase
      .from('properties')
      .select('*')
      .eq('id', propertyId)
      .maybeSingle()

    if (selectError) setError(selectError.message)
    else setProperty(data)

    setLoading(false)
  }, [propertyId])

  useEffect(() => {
    if (sessionLoading) return
    void reload()
  }, [reload, sessionLoading])

  return { property, loading, error, reload }
}
