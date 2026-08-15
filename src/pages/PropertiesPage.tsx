import { EmptyState } from '@/components/EmptyState'
import { demoItems, demoProperties, isDemoMode } from '@/lib/demo'

export function PropertiesPage() {
  // TODO: Supabase から実データを取得する処理に差し替える
  const properties = isDemoMode ? demoProperties : []
  const items = isDemoMode ? demoItems : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">物件</h1>
        <p className="mt-1 text-sm text-slate-500">
          管理している民泊物件の一覧です。
        </p>
      </div>

      {properties.length === 0 ? (
        <EmptyState>
          まだ物件が登録されていません。物件の登録機能は次のフェーズで実装します。
        </EmptyState>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {properties.map((property) => {
            const propertyItems = items.filter(
              (item) => item.property_id === property.id,
            )
            const lowCount = propertyItems.filter(
              (item) => item.quantity < item.threshold,
            ).length

            return (
              <li
                key={property.id}
                className="rounded-xl border border-slate-200 bg-white p-5"
              >
                <h2 className="font-semibold text-slate-900">
                  {property.name}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {property.address ?? '住所未設定'}
                </p>
                <div className="mt-3 flex items-center gap-3 text-xs">
                  <span className="text-slate-500">
                    備品 {propertyItems.length} 件
                  </span>
                  {lowCount > 0 && (
                    <span className="rounded-full bg-red-50 px-2 py-0.5 font-medium text-red-700">
                      要補充 {lowCount} 件
                    </span>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
