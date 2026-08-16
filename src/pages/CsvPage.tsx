import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { csvDateSuffix, downloadCsv, parseCsvFile, toCsv } from '@/lib/csv'
import { toChecklistCsvRows } from '@/lib/checklistCsv'
import { fetchChecklistHistory } from '@/lib/checklistHistory'
import {
  ITEM_CSV_HEADERS,
  buildItemImportPreview,
  missingItemCsvHeaders,
  toItemCsvRows,
  type ItemImportPreview,
} from '@/lib/itemsCsv'
import { demoItems, isDemoMode } from '@/lib/demo'
import { useItems } from '@/hooks/useItems'
import { useProperties } from '@/hooks/useProperties'

export function CsvPage() {
  const { properties } = useProperties()
  const { items, reload: reloadItems } = useItems()

  const [exportPropertyId, setExportPropertyId] = useState('all')
  const [historyPropertyId, setHistoryPropertyId] = useState('all')
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  /** デモではダウンロードがブロックされることがあるので中身も見せる */
  const [csvPreview, setCsvPreview] = useState<string | null>(null)

  // インポート
  const [preview, setPreview] = useState<ItemImportPreview | null>(null)
  const [headerError, setHeaderError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)

  function selectedName(id: string) {
    return properties.find((p) => p.id === id)?.name ?? '全物件'
  }

  function handleExportItems() {
    setError(null)
    setMessage(null)

    const target =
      exportPropertyId === 'all'
        ? items
        : items.filter((item) => item.property_id === exportPropertyId)

    if (target.length === 0) {
      setError('出力できる備品がありません。')
      return
    }

    const csv = toCsv(toItemCsvRows(target, properties))
    downloadCsv(`備品台帳_${selectedName(exportPropertyId)}_${csvDateSuffix()}.csv`, csv)
    setMessage(`${target.length} 件を書き出しました。`)
    if (isDemoMode) setCsvPreview(csv)
  }

  async function handleExportHistory() {
    setError(null)
    setMessage(null)
    setBusy('history')

    try {
      const history = await fetchChecklistHistory(
        historyPropertyId === 'all' ? undefined : historyPropertyId,
      )
      const rows = toChecklistCsvRows(history)

      if (rows.length === 0) {
        setError('出力できる実施履歴がありません。')
        return
      }

      const csv = toCsv(rows)
      downloadCsv(
        `チェック履歴_${selectedName(historyPropertyId)}_${csvDateSuffix()}.csv`,
        csv,
      )
      setMessage(`${rows.length} 行を書き出しました。`)
      if (isDemoMode) setCsvPreview(csv)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '書き出しに失敗しました。')
    } finally {
      setBusy(null)
    }
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setError(null)
    setMessage(null)
    setHeaderError(null)
    setPreview(null)

    try {
      const parsed = await parseCsvFile(file)
      const missing = missingItemCsvHeaders(parsed.headers)

      if (missing.length > 0) {
        setHeaderError(
          `必要な列が見つかりません: ${missing.join(', ')}。` +
            `1行目に ${ITEM_CSV_HEADERS.join(', ')} の見出しが必要です。`,
        )
        return
      }

      setPreview(buildItemImportPreview(parsed.rows, properties, items))
    } catch (caught) {
      setError(
        caught instanceof Error
          ? `CSV を読み込めませんでした: ${caught.message}`
          : 'CSV を読み込めませんでした。',
      )
    } finally {
      // 同じファイルを選び直せるようにする
      event.target.value = ''
    }
  }

  async function handleConfirmImport() {
    if (!preview || preview.rows.length === 0) return

    setImporting(true)
    setError(null)
    setMessage(null)

    try {
      const rows = preview.rows.map((r) => r.row)

      if (isDemoMode) {
        for (const row of rows) {
          const index = demoItems.findIndex(
            (i) => i.property_id === row.property_id && i.name === row.name,
          )
          if (index >= 0) {
            demoItems[index] = {
              ...demoItems[index],
              category: row.category,
              quantity: row.quantity,
              threshold: row.threshold,
              updated_at: new Date().toISOString(),
            }
          } else {
            demoItems.push({
              id: crypto.randomUUID(),
              property_id: row.property_id,
              name: row.name,
              category: row.category,
              quantity: row.quantity,
              threshold: row.threshold,
              photo_url: null,
              updated_at: new Date().toISOString(),
            })
          }
        }
      } else {
        const { error: rpcError } = await supabase.rpc('import_items', {
          p_rows: rows as unknown as never,
        })
        if (rpcError) throw rpcError
      }

      const inserted = preview.rows.filter((r) => r.mode === 'insert').length
      const updated = preview.rows.filter((r) => r.mode === 'update').length
      setMessage(`取り込みました (新規 ${inserted} 件 / 更新 ${updated} 件)。`)
      setPreview(null)
      await reloadItems()
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : '取り込みに失敗しました。',
      )
    } finally {
      setImporting(false)
    }
  }

  const selectClass =
    'rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900'
  const buttonClass =
    'rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50'

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">CSV 入出力</h1>
        <p className="mt-1 text-sm text-slate-500">
          スプレッドシートとのやり取りに使います。書き出しは Excel
          で開いても文字化けしない形式 (UTF-8 BOM 付き) です。
        </p>
      </div>

      {message && (
        <p role="status" className="rounded-md bg-green-50 p-3 text-sm text-green-700">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* 備品台帳のエクスポート */}
      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold text-slate-900">備品台帳の書き出し</h2>
        <p className="text-sm text-slate-500">
          出力項目: {ITEM_CSV_HEADERS.join(' / ')}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="export-property" className="text-sm text-slate-700">
            対象
          </label>
          <select
            id="export-property"
            value={exportPropertyId}
            onChange={(event) => setExportPropertyId(event.target.value)}
            className={selectClass}
          >
            <option value="all">全物件</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>
          <button type="button" onClick={handleExportItems} className={buttonClass}>
            CSV を書き出す
          </button>
        </div>
      </section>

      {/* チェック履歴のエクスポート */}
      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold text-slate-900">チェック履歴の書き出し</h2>
        <p className="text-sm text-slate-500">
          月次の集計・報告用に、実施記録を明細単位で書き出します。
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="history-property" className="text-sm text-slate-700">
            対象
          </label>
          <select
            id="history-property"
            value={historyPropertyId}
            onChange={(event) => setHistoryPropertyId(event.target.value)}
            className={selectClass}
          >
            <option value="all">全物件</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void handleExportHistory()}
            disabled={busy === 'history'}
            className={buttonClass}
          >
            {busy === 'history' ? '書き出し中...' : 'CSV を書き出す'}
          </button>
        </div>
      </section>

      {/* インポート */}
      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold text-slate-900">備品台帳の取り込み</h2>
        <p className="text-sm text-slate-500">
          同じ物件に同名の備品があれば更新、無ければ新規登録します。
          物件は名前で突き合わせるため、CSV に書かれた物件を先に登録しておいてください。
        </p>

        <input
          id="csv-file"
          type="file"
          accept=".csv,text/csv"
          onChange={(event) => void handleFileChange(event)}
          className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border file:border-slate-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-100"
        />

        {headerError && (
          <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">
            {headerError}
          </p>
        )}

        {preview && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3 text-sm">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                取り込み可能 {preview.rows.length} 件
              </span>
              <span className="rounded-full bg-green-50 px-3 py-1 text-green-700">
                新規 {preview.rows.filter((r) => r.mode === 'insert').length} 件
              </span>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">
                更新 {preview.rows.filter((r) => r.mode === 'update').length} 件
              </span>
              {preview.errors.length > 0 && (
                <span className="rounded-full bg-red-50 px-3 py-1 text-red-700">
                  エラー {preview.errors.length} 件
                </span>
              )}
            </div>

            {preview.errors.length > 0 && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3">
                <p className="text-sm font-medium text-red-800">
                  次の行は取り込めません
                </p>
                <ul className="mt-2 space-y-1 text-sm text-red-700">
                  {preview.errors.map((e) => (
                    <li key={`${e.line}-${e.message}`}>
                      {e.line} 行目: {e.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {preview.rows.length > 0 && (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full min-w-[36rem] text-left text-sm">
                  <thead className="border-b border-slate-200 text-xs text-slate-500">
                    <tr>
                      <th className="px-3 py-2 font-medium">行</th>
                      <th className="px-3 py-2 font-medium">物件</th>
                      <th className="px-3 py-2 font-medium">備品名</th>
                      <th className="px-3 py-2 text-right font-medium">数量</th>
                      <th className="px-3 py-2 text-right font-medium">しきい値</th>
                      <th className="px-3 py-2 font-medium">処理</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {preview.rows.map((r) => (
                      <tr key={r.line}>
                        <td className="px-3 py-2 tabular-nums text-slate-500">
                          {r.line}
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          {r.propertyName}
                        </td>
                        <td className="px-3 py-2 font-medium text-slate-900">
                          {r.row.name}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {r.row.quantity}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-500">
                          {r.row.threshold}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              r.mode === 'insert'
                                ? 'bg-green-50 text-green-700'
                                : 'bg-blue-50 text-blue-700'
                            }`}
                          >
                            {r.mode === 'insert' ? '新規' : '更新'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void handleConfirmImport()}
                disabled={importing || preview.rows.length === 0}
                className={buttonClass}
              >
                {importing
                  ? '取り込み中...'
                  : `${preview.rows.length} 件を取り込む`}
              </button>
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                キャンセル
              </button>
            </div>
          </div>
        )}
      </section>

      {isDemoMode && csvPreview && (
        <section className="space-y-2 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold text-slate-900">
            書き出した CSV の中身 (デモ表示)
          </h2>
          <p className="text-sm text-slate-500">
            デモではファイルのダウンロードがブロックされることがあるため、
            中身をそのまま表示しています。
          </p>
          <pre className="overflow-x-auto rounded-md bg-slate-50 p-3 text-xs text-slate-700">
            {csvPreview}
          </pre>
        </section>
      )}
    </div>
  )
}
