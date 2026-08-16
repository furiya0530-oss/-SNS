import { useState } from 'react'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { ItemFormDialog } from '@/components/ItemFormDialog'
import { ItemList } from '@/components/ItemList'
import { EmptyState } from '@/components/EmptyState'
import { ExportItemsButton } from '@/components/ExportItemsButton'
import { useItems } from '@/hooks/useItems'
import { useProperties } from '@/hooks/useProperties'
import type { Item } from '@/types'
import { ErrorMessage, Loading } from '@/components/Feedback'

type Dialog = { type: 'edit'; item: Item } | { type: 'delete'; item: Item } | null

/** 全物件の備品を横断して見るページ。登録は物件詳細から行う。 */
export function ItemsPage() {
  const { properties } = useProperties()
  const { items, loading, error, update, remove, adjustQuantity } = useItems()
  const [dialog, setDialog] = useState<Dialog>(null)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">備品</h1>
          <p className="mt-1 text-sm text-slate-500">
            すべての物件の備品をまとめて表示します。追加は物件ごとの画面から行います。
          </p>
        </div>
        <ExportItemsButton items={items} properties={properties} label="全物件" />
      </div>

      {error && (
        <ErrorMessage>{error}</ErrorMessage>
      )}

      {loading ? (
        <Loading />
      ) : properties.length === 0 ? (
        <EmptyState>
          先に物件を登録してください。備品は物件ごとに管理します。
        </EmptyState>
      ) : (
        <ItemList
          items={items}
          properties={properties}
          onAdjust={(item, delta) => void adjustQuantity(item, delta)}
          onEdit={(item) => setDialog({ type: 'edit', item })}
          onDelete={(item) => setDialog({ type: 'delete', item })}
        />
      )}

      {dialog?.type === 'edit' && (
        <ItemFormDialog
          propertyId={dialog.item.property_id}
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
