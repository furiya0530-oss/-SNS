import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { demoProfile, isDemoMode } from '@/lib/demo'
import { useSession } from '@/hooks/useSession'
import type { Profile } from '@/types'

/**
 * ログイン中ユーザーの profiles レコードを取得する。
 *
 * 行の作成は本来 DB 側の on_auth_user_created トリガーが行うが、
 * 何らかの理由で行が無かった場合はここで作り直す (plan は既定値の 'free')。
 */
export function useProfile() {
  const { user, loading: sessionLoading } = useSession()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const userId = user?.id ?? null
  const fallbackName =
    (user?.user_metadata?.name as string | undefined) ??
    user?.email?.split('@')[0] ??
    null

  const load = useCallback(async () => {
    if (!userId) {
      setProfile(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const { data, error: selectError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (selectError) {
      setError(selectError.message)
      setLoading(false)
      return
    }

    if (data) {
      setProfile(data)
      setLoading(false)
      return
    }

    // トリガーが動いていなかった場合の保険。
    // plan は列の既定値 'free' で作られる (クライアントからは指定できない)。
    const { data: inserted, error: insertError } = await supabase
      .from('profiles')
      .insert({ id: userId, name: fallbackName })
      .select()
      .single()

    if (insertError) setError(insertError.message)
    else setProfile(inserted)

    setLoading(false)
  }, [userId, fallbackName])

  useEffect(() => {
    if (isDemoMode) {
      setProfile(demoProfile)
      setLoading(false)
      return
    }
    if (sessionLoading) return
    void load()
  }, [load, sessionLoading])

  if (isDemoMode) {
    return { profile: demoProfile, loading: false, error: null, reload: load }
  }

  return { profile, loading, error, reload: load }
}
