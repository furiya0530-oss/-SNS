import { useState } from 'react'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { EmptyState } from '@/components/EmptyState'
import { PropertyFormDialog } from '@/components/PropertyFormDialog'
import { useProfile } from '@/hooks/useProfile'
import { useProperties, type PropertyInput } from '@/hooks/useProperties'
import { demoItems, isDemoMode } from '@/lib/demo'
import {
  FREE_PLAN_PROPERTY_LIMIT,
  UPGRADE_REQUIRED_MESSAGE,
  canAddProperty,
  isPropertyLimitError,
} from '@/lib/planLimits'
import type { Property } from '@/types'

type Dialog =
  | { type: 'create' }
  | { type: 'edit'; property: Property }
  | { type: 'delete'; property: Property }
  | null

export function PropertiesPage() {
  const { profile } = useProfile()
  const { properties, loading, error, create, update, remove } = useProperties()
  const [dialog, setDialog] = useState<Dialog>(null)
  const [showUpgrade, setShowUpgrade] = useState(false)

  // TODO: 備品も Supabase から取得する (次フェーズ)
  const items = isDemoMode ? demoItems : []

  const plan = profile?.plan
  const canAdd = canAddProperty(plan, properties.length)

  function handleAddClick() {
    if (!canAdd) {
      setShowUpgrade(true)
      return
    }
    setShowUpgrade(false)
    setDialog({ type: 'create' })
  }

  async function handleCreate(input: PropertyInput) {
    try {
      await create(input)
      setShowUpgrade(false)
    } catch (caught) {
      // 画面側のチェックをすり抜けた場合は DB のトリガーが弾く
      if (isPropertyLimitError(caught)) {
        setShowUpgrade(true)
        throw new Error(UPGRADE_REQUIRED_MESSAGE)
      }
      throw caught
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">物件</h1>
          <p className="mt-1 text-sm text-slate-500">
            管理している民泊物件の一覧です。
          </p>
        </div>
        <button
          type="button"
          onClick={handleAddClick}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          物件を追加
        </button>
      </div>

      {plan === 'free' && (
        <p className="text-xs text-slate-500">
          無料プランで登録できる物件は {FREE_PLAN_PROPERTY_LIMIT} 件までです
          (現在 {properties.length} 件)。
        </p>
      )}

      {showUpgrade && (
        <div
          role="alert"
          className="flex items-start justify-between gap-4 rounded-lg border border-amber-200 bg-amber-50 p-4"
        >
          <div>
            <p className="font-medium text-amber-900">
              {UPGRADE_REQUIRED_MESSAGE}
            </p>
            <p className="mt-1 text-sm text-amber-800">
              無料プランで登録できる物件は {FREE_PLAN_PROPERTY_LIMIT} 件までです。
              2 件目以降を登録するには Pro プランをご利用ください。
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowUpgrade(false)}
            aria-label="閉じる"
            className="shrink-0 rounded-md px-2 py-1 text-amber-700 hover:bg-amber-100"
          >
            ✕
          </button>
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-md bg-red-50 p-3 text-sm text-red-700"
        >
          物件の取得に失敗しました: {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">読み込み中...</p>
      ) : properties.length === 0 ? (
        <EmptyState>
          まだ物件が登録されていません。「物件を追加」から登録してください。
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
                className="flex flex-col rounded-xl border border-slate-200 bg-white p-5"
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

                <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => setDialog({ type: 'edit', property })}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                  >
                    編集
                  </button>
                  <button
                    type="button"
                    onClick={() => setDialog({ type: 'delete', property })}
                    className="rounded-md px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    削除
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {dialog?.type === 'create' && (
        <PropertyFormDialog
          onSubmit={handleCreate}
          onClose={() => setDialog(null)}
        />
      )}

      {dialog?.type === 'edit' && (
        <PropertyFormDialog
          property={dialog.property}
          onSubmit={async (input) => {
            await update(dialog.property.id, input)
          }}
          onClose={() => setDialog(null)}
        />
      )}

      {dialog?.type === 'delete' && (
        <ConfirmDialog
          title="物件を削除"
          message={`「${dialog.property.name}」を削除します。紐づく備品やチェックリストもすべて削除され、元に戻せません。`}
          onConfirm={() => remove(dialog.property.id)}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  )
}
