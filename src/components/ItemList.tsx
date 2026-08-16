import { useMemo, useState } from 'react'
import { EmptyState } from '@/components/EmptyState'
import { useItemPhotoUrls } from '@/hooks/useItemPhotoUrls'
import { isLowStock } from '@/lib/stock'
import { ITEM_CATEGORIES, itemCategoryLabel } from '@/types'
import type { Item, Property } from '@/types'

interface ItemListProps {
  items: Item[]
  /** 全物件をまとめて表示するときに物件名を出すため */
  properties?: Property[]
  onAdjust: (item: Item, delta: number) => void
  onEdit: (item: Item) => void
  onDelete: (item: Item) => void
}

export function ItemList({
  items,
  properties,
  onAdjust,
  onEdit,
  onDelete,
}: ItemListProps) {
  const [category, setCategory] = useState<string>('all')
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const photoUrls = useItemPhotoUrls(items)

  // 実際に使われているカテゴリだけを絞り込みの選択肢に出す
  const availableCategories = useMemo(() => {
    const used = new Set(items.map((item) => item.category ?? ''))
    return ITEM_CATEGORIES.filter((option) => used.has(option.value))
  }, [items])

  const hasUncategorized = items.some((item) => !item.category)

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (lowStockOnly && !isLowStock(item)) return false
      if (category === 'all') return true
      if (category === 'none') return !item.category
      return item.category === category
    })
  }, [items, category, lowStockOnly])

  const lowStockCount = items.filter(isLowStock).length

  const filters = [
    { value: 'all', label: `すべて (${items.length})` },
    ...availableCategories.map((option) => ({
      value: option.value,
      label: `${option.label} (${
        items.filter((item) => item.category === option.value).length
      })`,
    })),
    ...(hasUncategorized
      ? [
          {
            value: 'none',
            label: `未分類 (${items.filter((item) => !item.category).length})`,
          },
        ]
      : []),
  ]

  return (
    <div className="space-y-4">
      {/* カテゴリ絞り込み */}
      <div className="flex flex-wrap items-center gap-2">
        {filters.map((filter) => (
          <button
            key={filter.value}
            type="button"
            aria-pressed={category === filter.value}
            onClick={() => setCategory(filter.value)}
            className={`rounded-full border px-3 py-1 text-sm transition-colors ${
              category === filter.value
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            {filter.label}
          </button>
        ))}

        {lowStockCount > 0 && (
          <button
            type="button"
            aria-pressed={lowStockOnly}
            onClick={() => setLowStockOnly((prev) => !prev)}
            className={`ml-auto rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
              lowStockOnly
                ? 'border-red-600 bg-red-600 text-white'
                : 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
            }`}
          >
            要補充のみ ({lowStockCount})
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState>
          {items.length === 0
            ? 'まだ備品が登録されていません。「備品を追加」から登録してください。'
            : '条件に合う備品がありません。'}
        </EmptyState>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {filtered.map((item) => {
            const low = isLowStock(item)
            const photo = item.photo_url ? photoUrls[item.photo_url] : null
            const property = properties?.find((p) => p.id === item.property_id)

            return (
              <li
                key={item.id}
                className={`flex gap-4 rounded-xl border p-4 ${
                  low
                    ? 'border-red-300 bg-red-50'
                    : 'border-slate-200 bg-white'
                }`}
              >
                {/* 写真 */}
                {photo ? (
                  <img
                    src={photo}
                    alt=""
                    className="h-20 w-20 shrink-0 rounded-lg border border-slate-200 bg-white object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white text-xs text-slate-400">
                    写真なし
                  </div>
                )}

                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-900">
                        {item.name}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {itemCategoryLabel(item.category)}
                        {property && ` ・ ${property.name}`}
                      </p>
                    </div>
                    {low && (
                      <span className="shrink-0 rounded-full bg-red-600 px-2 py-0.5 text-xs font-medium text-white">
                        要補充
                      </span>
                    )}
                  </div>

                  {/* 数量の増減 */}
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label={`${item.name} を1減らす`}
                        disabled={item.quantity === 0}
                        onClick={() => onAdjust(item, -1)}
                        className="h-8 w-8 rounded-md border border-slate-300 bg-white text-lg leading-none text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                      >
                        −
                      </button>
                      <span
                        className={`w-12 text-center text-lg font-bold tabular-nums ${
                          low ? 'text-red-700' : 'text-slate-900'
                        }`}
                      >
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        aria-label={`${item.name} を1増やす`}
                        onClick={() => onAdjust(item, 1)}
                        className="h-8 w-8 rounded-md border border-slate-300 bg-white text-lg leading-none text-slate-700 hover:bg-slate-100"
                      >
                        ＋
                      </button>
                    </div>
                    <span className="text-xs text-slate-500">
                      しきい値 {item.threshold}
                    </span>

                    <div className="ml-auto flex gap-1">
                      <button
                        type="button"
                        onClick={() => onEdit(item)}
                        className="rounded-md px-2 py-1 text-sm font-medium text-slate-600 hover:bg-slate-100"
                      >
                        編集
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(item)}
                        className="rounded-md px-2 py-1 text-sm font-medium text-red-600 hover:bg-red-100"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
