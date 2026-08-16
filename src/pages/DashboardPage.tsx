import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/EmptyState'
import { useItems } from '@/hooks/useItems'
import { isLowStock } from '@/lib/stock'
import { useProfile } from '@/hooks/useProfile'
import { useProperties } from '@/hooks/useProperties'

export function DashboardPage() {
  const { profile } = useProfile()
  const { properties } = useProperties()
  const { items } = useItems()
  const lowStockItems = items.filter(isLowStock)

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
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">ダッシュボード</h1>
        <p className="mt-1 text-sm text-slate-500">
          {profile?.name ? `${profile.name} さん、こんにちは。` : 'ようこそ。'}
        </p>
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
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold text-slate-900">物件一覧</h2>
          <Link
            to="/properties"
            className="text-sm font-medium text-slate-600 underline underline-offset-2 hover:text-slate-900"
          >
            すべて見る
          </Link>
        </div>

        {properties.length === 0 ? (
          <EmptyState>
            まだ物件が登録されていません。
            <Link
              to="/properties"
              className="ml-1 font-medium text-slate-700 underline underline-offset-2"
            >
              物件ページ
            </Link>
            から登録できます。
          </EmptyState>
        ) : (
          <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
            {properties.map((property) => {
              const propertyItems = items.filter(
                (item) => item.property_id === property.id,
              )
              const lowCount = propertyItems.filter(isLowStock).length

              return (
                <li
                  key={property.id}
                  className="flex items-center justify-between gap-4 px-5 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">
                      {property.name}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {property.address ?? '住所未設定'}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 text-sm">
                    <span className="text-slate-500">
                      備品 {propertyItems.length}
                    </span>
                    {lowCount > 0 && (
                      <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                        要補充 {lowCount}
                      </span>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">
          補充が必要な備品
        </h2>
        {lowStockItems.length === 0 ? (
          <EmptyState>
            {items.length === 0
              ? '備品を登録すると、在庫が閾値を下回ったものがここに出ます。'
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
                    / 閾値 {item.threshold}
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
