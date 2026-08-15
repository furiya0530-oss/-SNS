import { EmptyState } from '@/components/EmptyState'
import { demoItems, demoProperties, isDemoMode } from '@/lib/demo'
import type { ItemCategory } from '@/types'

const categoryLabels: Record<ItemCategory, string> = {
  amenity: 'アメニティ',
  linen: 'リネン',
  cleaning: '清掃用品',
  kitchen: 'キッチン',
  equipment: '設備・家電',
  other: 'その他',
}

export function ItemsPage() {
  // TODO: Supabase のテーブル作成後に実データへ差し替える
  const items = isDemoMode ? demoItems : []
  const properties = isDemoMode ? demoProperties : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">備品</h1>
        <p className="mt-1 text-sm text-slate-500">
          物件ごとの備品と在庫数を管理します。
        </p>
      </div>

      {items.length === 0 ? (
        <EmptyState>
          備品の一覧・在庫の増減は次のフェーズで実装します。
        </EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[38rem] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">備品名</th>
                <th className="px-4 py-3 font-medium">物件</th>
                <th className="px-4 py-3 font-medium">カテゴリ</th>
                <th className="px-4 py-3 text-right font-medium">在庫</th>
                <th className="px-4 py-3 text-right font-medium">閾値</th>
                <th className="px-4 py-3 font-medium">状態</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => {
                const isLow = item.quantity < item.threshold
                const property = properties.find(
                  (p) => p.id === item.property_id,
                )
                return (
                  <tr key={item.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {item.name}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {property?.name ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {categoryLabels[item.category]}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-900">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-500">
                      {item.threshold}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          isLow
                            ? 'bg-red-50 text-red-700'
                            : 'bg-green-50 text-green-700'
                        }`}
                      >
                        {isLow ? '要補充' : '十分'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
