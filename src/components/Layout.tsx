import { Link, NavLink, Outlet } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { isDemoMode } from '@/lib/demo'
import { useProfile } from '@/hooks/useProfile'
import { useSession } from '@/hooks/useSession'

const navItems = [
  { to: '/', label: 'ダッシュボード' },
  { to: '/properties', label: '物件' },
  { to: '/items', label: '備品' },
  { to: '/csv', label: 'CSV' },
  { to: '/plan', label: 'プラン' },
]

export function Layout() {
  const { user } = useSession()
  const { profile } = useProfile()

  return (
    <div className="flex min-h-full flex-col">
      {isDemoMode && (
        <p className="bg-amber-100 px-4 py-2 text-center text-xs text-amber-900">
          デモモードで表示しています。データはサンプルで、Supabase には接続していません。
        </p>
      )}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:gap-6">
          <Link
            to="/"
            className="shrink-0 whitespace-nowrap text-base font-bold text-slate-900 sm:text-lg"
          >
            民泊備品管理
          </Link>
          {/* 画面が狭いときは横スクロールさせ、折り返して崩れないようにする */}
          <nav className="flex min-w-0 gap-1 overflow-x-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex shrink-0 items-center gap-3 text-sm">
            {user && (
              <>
                <span className="hidden text-slate-500 sm:inline">
                  {profile?.name ?? user.email}
                </span>
                {!isDemoMode && (
                  <button
                    type="button"
                    onClick={() => void supabase.auth.signOut()}
                    className="whitespace-nowrap rounded-md border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-100"
                  >
                    ログアウト
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 py-4 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} 民泊備品管理
      </footer>
    </div>
  )
}
