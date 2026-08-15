import { useSession } from '@/hooks/useSession'

export function DashboardPage() {
  const { user } = useSession()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">ダッシュボード</h1>
        <p className="mt-1 text-sm text-slate-500">
          ログイン中: {user?.email}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: '登録物件数', value: '-' },
          { label: '備品アイテム数', value: '-' },
          { label: '要補充アイテム', value: '-' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-slate-200 bg-white p-5"
          >
            <p className="text-sm text-slate-500">{stat.label}</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <p className="rounded-lg border border-dashed border-slate-300 p-6 text-sm text-slate-500">
        集計は Supabase のテーブル作成後に実装します。
      </p>
    </div>
  )
}
