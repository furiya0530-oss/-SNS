/**
 * 画面共通のクラス定義。
 *
 * ボタンはスマホでの押しやすさを優先し、タップ領域を 44px 以上
 * (min-h-11) 確保する。画面が広いときは詰めて表示する。
 * 清掃スタッフが現場のスマホで操作するため、ここは妥協しない。
 */

const base =
  'inline-flex items-center justify-center gap-1 rounded-md text-sm font-medium transition-colors ' +
  'disabled:cursor-not-allowed disabled:opacity-50 ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900'

const touch = 'min-h-11 sm:min-h-9'
const touchSmall = 'min-h-11 sm:min-h-8'

/** 主要な操作 (追加・保存など) */
export const btnPrimary = `${base} ${touch} bg-slate-900 px-4 py-2 text-white hover:bg-slate-800`

/** 補助的な操作 (キャンセル・書き出しなど) */
export const btnSecondary = `${base} ${touch} border border-slate-300 bg-white px-4 py-2 text-slate-700 hover:bg-slate-100`

/** 削除など取り消せない操作 */
export const btnDanger = `${base} ${touch} bg-red-600 px-4 py-2 text-white hover:bg-red-700`

/** 一覧の行内に置く小さめの操作 */
export const btnSmallPrimary = `${base} ${touchSmall} bg-slate-900 px-3 py-1.5 text-white hover:bg-slate-800`
export const btnSmallSecondary = `${base} ${touchSmall} border border-slate-300 bg-white px-3 py-1.5 text-slate-700 hover:bg-slate-100`
export const btnSmallGhost = `${base} ${touchSmall} px-3 py-1.5 text-slate-600 hover:bg-slate-100`
export const btnSmallDanger = `${base} ${touchSmall} px-3 py-1.5 text-red-600 hover:bg-red-50`

/** 入力欄 */
export const inputClass =
  'w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ' +
  'focus:border-slate-900 focus:ring-1 focus:ring-slate-900'
