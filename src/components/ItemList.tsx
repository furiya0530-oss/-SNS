import { useMemo, useState } from 'react'
import { EmptyState } from '@/components/EmptyState'
import { useItemPhotoUrls } from '@/hooks/useItemPhotoUrls'
import { formatDate } from '@/lib/format'
import { isLowStock } from '@/lib/stock'
import { ITEM_CATEGORIES, itemCategoryLabel } from '@/types'
import type { Item, Property } from '@/types'
import { btnSmallGhost } from '@/lib/ui'

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
  const [propertyFilter, setPropertyFilter] = useState<string>('all')
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const photoUrls = useItemPhotoUrls(items)

  // 複数物件をまたいで表示しているときだけ物件で絞り込めるようにする
  const showPropertyFilter = Boolean(properties && properties.length > 1)

  // 実際に使われているカテゴリだけを絞り込みの選択肢に出す
  const availableCategories = useMemo(() => {
    const used = new Set(items.map((item) => item.category ?? ''))
    return ITEM_CATEGORIES.filter((option) => used.has(option.value))
  }, [items])

  const hasUncategorized = items.some((item) => !item.category)

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (lowStockOnly && !isLowStock(item)) return false
      if (propertyFilter !== 'all' && item.property_id !== propertyFilter) {
        return false
      }
      if (category === 'all') return true
      if (category === 'none') return !item.category
      return item.category === category
    })
  }, [items, category, propertyFilter, lowStockOnly])

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
      {/* 物件で絞り込み (全物件をまとめて見ているときのみ) */}
      {showPropertyFilter && (
        <div className="flex items-center gap-2">
          <label
            htmlFor="item-property-filter"
            className="text-sm font-medium text-slate-700"
          >
            物件
          </label>
          <select
            id="item-property-filter"
            value={propertyFilter}
            onChange={(event) => setPropertyFilter(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
          >
            <option value="all">すべての物件</option>
            {properties?.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* カテゴリ絞り込み */}
      <div className="flex flex-wrap items-center gap-2">
        {filters.map((filter) => (
          <button
            key={filter.value}
            type="button"
            aria-pressed={category === filter.value}
            onClick={() => setCategory(filter.value)}
            className={`inline-flex min-h-10 items-center rounded-full border px-3 py-1 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 sm:min-h-8 ${
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
            className={`ml-auto inline-flex min-h-10 items-center rounded-full border px-3 py-1 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 sm:min-h-8 ${
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
                className={`flex min-w-0 gap-4 rounded-xl border p-4 ${
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
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label={`${item.name} を1減らす`}
                        disabled={item.quantity === 0}
                        onClick={() => onAdjust(item, -1)}
                        className="h-11 w-11 rounded-md border border-slate-300 bg-white text-xl leading-none text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 sm:h-9 sm:w-9 sm:text-lg"
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
                        className="h-11 w-11 rounded-md border border-slate-300 bg-white text-xl leading-none text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 sm:h-9 sm:w-9 sm:text-lg"
                      >
                        ＋
                      </button>
                    </div>
                    <span className="text-xs text-slate-500">
                      しきい値 {item.threshold}
                    </span>
                    <span className="text-xs text-slate-400">
                      更新 {formatDate(item.updated_at)}
                    </span>

                    <div className="ml-auto flex gap-1">
                      <button
                        type="button"
                        onClick={() => onEdit(item)}
                        className={btnSmallGhost}
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
