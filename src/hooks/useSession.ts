import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { demoUser, isDemoMode } from '@/lib/demo'

/**
 * Supabase の認証セッションを購読するフック。
 * `loading` が true の間は認証状態が未確定。
 */
export function useSession() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(!isDemoMode)

  useEffect(() => {
    // デモモードでは Supabase に問い合わせず、ログイン済みとして扱う。
    if (isDemoMode) return

    let active = true

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setLoading(false)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  if (isDemoMode) {
    return { session: { user: demoUser } as Session, user: demoUser, loading: false }
  }

  return { session, user: session?.user ?? null, loading }
}
