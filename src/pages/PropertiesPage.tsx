import { EmptyState } from '@/components/EmptyState'
import { demoItems, demoProperties, isDemoMode } from '@/lib/demo'

export function PropertiesPage() {
  // TODO: Supabase のテーブル作成後に実データへ差し替える
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
        <EmptyState>物件の一覧・登録は次のフェーズで実装します。</EmptyState>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {properties.map((property) => {
            const itemCount = items.filter(
              (item) => item.property_id === property.id,
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
                  {property.address}
                </p>
                <p className="mt-3 text-xs text-slate-500">
                  {property.note} ・ 備品 {itemCount} 件
                </p>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
