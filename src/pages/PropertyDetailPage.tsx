import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { ItemFormDialog } from '@/components/ItemFormDialog'
import { ItemList } from '@/components/ItemList'
import { useItems, type ItemInput } from '@/hooks/useItems'
import { useProperty } from '@/hooks/useProperty'
import { countLowStock } from '@/lib/stock'
import type { Item } from '@/types'

type Dialog =
  | { type: 'create' }
  | { type: 'edit'; item: Item }
  | { type: 'delete'; item: Item }
  | null

export function PropertyDetailPage() {
  const { propertyId } = useParams<{ propertyId: string }>()
  const { property, loading: propertyLoading } = useProperty(propertyId)
  const {
    items,
    loading: itemsLoading,
    error,
    create,
    update,
    remove,
    adjustQuantity,
  } = useItems(propertyId)

  const [dialog, setDialog] = useState<Dialog>(null)

  if (propertyLoading) {
    return <p className="text-sm text-slate-500">読み込み中...</p>
  }

  if (!property) {
    return (
      <div className="space-y-4">
        <p className="text-slate-600">
          物件が見つかりませんでした。削除されたか、アクセス権がありません。
        </p>
        <Link
          to="/properties"
          className="inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          物件一覧へ戻る
        </Link>
      </div>
    )
  }

  const lowStockCount = countLowStock(items)

  async function handleCreate(input: ItemInput) {
    if (!propertyId) return
    await create(propertyId, input)
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/properties"
          className="text-sm text-slate-500 hover:text-slate-900"
        >
          ← 物件一覧
        </Link>

        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {property.name}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {property.address ?? '住所未設定'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDialog({ type: 'create' })}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            備品を追加
          </button>
        </div>
      </div>

      {/* 在庫アラートのまとめ */}
      {lowStockCount > 0 && (
        <p
          role="status"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          しきい値を下回っている備品が {lowStockCount} 件あります。
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-md bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">備品台帳</h2>

        {itemsLoading ? (
          <p className="text-sm text-slate-500">読み込み中...</p>
        ) : (
          <ItemList
            items={items}
            onAdjust={(item, delta) => void adjustQuantity(item, delta)}
            onEdit={(item) => setDialog({ type: 'edit', item })}
            onDelete={(item) => setDialog({ type: 'delete', item })}
          />
        )}
      </section>

      {dialog?.type === 'create' && propertyId && (
        <ItemFormDialog
          propertyId={propertyId}
          onSubmit={handleCreate}
          onClose={() => setDialog(null)}
        />
      )}

      {dialog?.type === 'edit' && propertyId && (
        <ItemFormDialog
          propertyId={propertyId}
          item={dialog.item}
          onSubmit={async (input) => {
            await update(dialog.item.id, input)
          }}
          onClose={() => setDialog(null)}
        />
      )}

      {dialog?.type === 'delete' && (
        <ConfirmDialog
          title="備品を削除"
          message={`「${dialog.item.name}」を削除します。元に戻せません。`}
          onConfirm={() => remove(dialog.item)}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  )
}
