import { EmptyState } from '@/components/EmptyState'
import { demoItems, demoProperties, isDemoMode } from '@/lib/demo'
import { useSession } from '@/hooks/useSession'

export function DashboardPage() {
  const { user } = useSession()

  // TODO: Supabase のテーブル作成後に実データへ差し替える
  const properties = isDemoMode ? demoProperties : []
  const items = isDemoMode ? demoItems : []
  const lowStockItems = items.filter((item) => item.quantity < item.threshold)

  const stats = [
    { label: '登録物件数', value: properties.length, tone: 'text-slate-900' },
    { label: '備品アイテム数', value: items.length, tone: 'text-slate-900' },
    {
      label: '要補充アイテム',
      value: lowStockItems.length,
      tone: lowStockItems.length > 0 ? 'text-red-600' : 'text-slate-900',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">ダッシュボード</h1>
        <p className="mt-1 text-sm text-slate-500">ログイン中: {user?.email}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-slate-200 bg-white p-5"
          >
            <p className="text-sm text-slate-500">{stat.label}</p>
            <p className={`mt-2 text-3xl font-bold ${stat.tone}`}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">補充が必要な備品</h2>
        {lowStockItems.length === 0 ? (
          <EmptyState>
            {items.length === 0
              ? '集計は Supabase のテーブル作成後に実装します。'
              : '補充が必要な備品はありません。'}
          </EmptyState>
        ) : (
          <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
            {lowStockItems.map((item) => {
              const property = properties.find((p) => p.id === item.property_id)
              return (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-4 px-5 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">
                      {item.name}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {property?.name ?? '-'}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm text-slate-600">
                    残り{' '}
                    <span className="font-bold text-red-600">
                      {item.quantity}
                    </span>{' '}
                    / 閾値 {item.threshold} {item.unit}
                  </p>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
