import { csvDateSuffix, downloadCsv, toCsv } from '@/lib/csv'
import { toItemCsvRows } from '@/lib/itemsCsv'
import type { Item, Property } from '@/types'

interface ExportItemsButtonProps {
  items: Item[]
  properties: Property[]
  /** ファイル名に入れる対象名 (物件名 または 全物件) */
  label: string
}

/** 備品一覧を CSV で書き出すボタン。 */
export function ExportItemsButton({
  items,
  properties,
  label,
}: ExportItemsButtonProps) {
  function handleClick() {
    const csv = toCsv(toItemCsvRows(items, properties))
    downloadCsv(`備品台帳_${label}_${csvDateSuffix()}.csv`, csv)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={items.length === 0}
      className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-40"
    >
      CSV書き出し
    </button>
  )
}
