// ============================================
// 日付まわりの小さな便利関数たち
// 日付は '2026-08-12' のような文字列で扱います（比較や保存がしやすいため）
// ============================================

/** Date オブジェクト → '2026-08-12' の文字列に変換 */
export function toDateString(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0') // 1桁なら先頭に0
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** 今日の日付を '2026-08-12' 形式で取得 */
export function today() {
  return toDateString(new Date())
}

/** '2026-08-12' → Date オブジェクト（時刻は0時） */
export function parseDate(str) {
  if (!str) return null
  const [y, m, d] = str.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

/** 2つの日付が「何日離れているか」を返す */
export function diffDays(aStr, bStr) {
  const a = parseDate(aStr)
  const b = parseDate(bStr)
  if (!a || !b) return null
  const ms = a.getTime() - b.getTime()
  return Math.round(ms / (1000 * 60 * 60 * 24))
}

/** 日付を「8/12」のような短い表示にする */
export function formatShort(str) {
  const d = parseDate(str)
  if (!d) return ''
  return `${d.getMonth() + 1}/${d.getDate()}`
}

/** その日が含まれる「週の月曜日」を返す（週間グラフ用） */
export function startOfWeek(date) {
  const d = new Date(date)
  const day = d.getDay() // 0=日曜, 1=月曜 ...
  const diff = day === 0 ? -6 : 1 - day // 月曜始まりにする
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

/** '2026-08' のような月キーを返す（月間グラフ用） */
export function monthKey(str) {
  const d = parseDate(str)
  if (!d) return ''
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
