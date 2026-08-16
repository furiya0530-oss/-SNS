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
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 sm:flex-nowrap sm:gap-6">
          <Link
            to="/"
            className="shrink-0 whitespace-nowrap text-base font-bold text-slate-900 sm:text-lg"
          >
            民泊備品管理
          </Link>
          {/* 画面が狭いときはナビを次の行へ回し、現在地がログアウトの
              裏に隠れないようにする。入りきらない場合は横スクロールする。 */}
          <nav className="order-3 flex w-full min-w-0 gap-1 overflow-x-auto sm:order-2 sm:w-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `inline-flex min-h-10 items-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 sm:min-h-8 ${
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
          <div className="order-2 ml-auto flex shrink-0 items-center gap-3 text-sm sm:order-3">
            {user && (
              <>
                <span className="hidden text-slate-500 sm:inline">
                  {profile?.name ?? user.email}
                </span>
                {!isDemoMode && (
                  <button
                    type="button"
                    onClick={() => void supabase.auth.signOut()}
                    className="inline-flex min-h-10 items-center whitespace-nowrap rounded-md border border-slate-300 px-3 py-1.5 font-medium text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 sm:min-h-8"
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
