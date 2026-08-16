import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { EmptyState } from '@/components/EmptyState'
import { ItemFormDialog } from '@/components/ItemFormDialog'
import { ItemList } from '@/components/ItemList'
import { CreateChecklistDialog } from '@/components/CreateChecklistDialog'
import { useChecklists } from '@/hooks/useChecklists'
import { useItems, type ItemInput } from '@/hooks/useItems'
import { useProperty } from '@/hooks/useProperty'
import { countLowStock } from '@/lib/stock'
import type { Checklist, Item } from '@/types'

type Dialog =
  | { type: 'create' }
  | { type: 'edit'; item: Item }
  | { type: 'delete'; item: Item }
  | { type: 'createChecklist' }
  | { type: 'deleteChecklist'; checklist: Checklist }
  | null

export function PropertyDetailPage() {
  const { propertyId } = useParams<{ propertyId: string }>()
  const navigate = useNavigate()
  const { property, loading: propertyLoading } = useProperty(propertyId)
  const {
    checklists,
    loading: checklistsLoading,
    create: createChecklist,
    remove: removeChecklist,
  } = useChecklists(propertyId)
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

      {/* 清掃チェックリスト */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">
            清掃チェックリスト
          </h2>
          <div className="flex gap-2">
            <Link
              to={`/properties/${propertyId}/records`}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              チェック履歴
            </Link>
            <button
              type="button"
              onClick={() => setDialog({ type: 'createChecklist' })}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              チェックリストを作成
            </button>
          </div>
        </div>

        {checklistsLoading ? (
          <p className="text-sm text-slate-500">読み込み中...</p>
        ) : checklists.length === 0 ? (
          <EmptyState>
            まだチェックリストがありません。「チェックリストを作成」から追加してください。
          </EmptyState>
        ) : (
          <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
            {checklists.map((checklist) => (
              <li
                key={checklist.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
              >
                <p className="min-w-0 truncate font-medium text-slate-900">
                  {checklist.title}
                </p>
                <div className="flex shrink-0 gap-1">
                  <Link
                    to={`/properties/${propertyId}/checklists/${checklist.id}/run`}
                    className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
                  >
                    実施する
                  </Link>
                  <Link
                    to={`/properties/${propertyId}/checklists/${checklist.id}`}
                    className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
                  >
                    編集
                  </Link>
                  <button
                    type="button"
                    onClick={() =>
                      setDialog({ type: 'deleteChecklist', checklist })
                    }
                    className="rounded-md px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    削除
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {dialog?.type === 'createChecklist' && (
        <CreateChecklistDialog
          onSubmit={async (title) => {
            const created = await createChecklist(title)
            navigate(`/properties/${propertyId}/checklists/${created.id}`)
          }}
          onClose={() => setDialog(null)}
        />
      )}

      {dialog?.type === 'deleteChecklist' && (
        <ConfirmDialog
          title="チェックリストを削除"
          message={`「${dialog.checklist.title}」を削除します。項目と過去の実施記録もすべて削除され、元に戻せません。`}
          onConfirm={() => removeChecklist(dialog.checklist.id)}
          onClose={() => setDialog(null)}
        />
      )}

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
