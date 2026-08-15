import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useSession } from '@/hooks/useSession'

/**
 * ログイン済みのときだけ children を表示し、
 * 未ログインなら /login へ飛ばす。
 * 元のパスを state で渡し、ログイン後にそこへ戻れるようにする。
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useSession()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center p-12 text-sm text-slate-500">
        読み込み中...
      </div>
    )
  }

  if (!session) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    )
  }

  return <>{children}</>
}
