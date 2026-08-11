// ────────────────────────────────────────────────
// 日時まわりの小さな便利関数をまとめたファイル
// ────────────────────────────────────────────────

/**
 * 投稿日時を「3時間前」「2日前」のような相対表記に変換します。
 *
 * @param {number} timestamp 投稿日時（Date.now() で作られるミリ秒の数値）
 * @returns {string} 画面に表示する文字列
 */
export function formatRelativeTime(timestamp) {
  // 今との差を「秒」で計算する
  const diffSeconds = Math.floor((Date.now() - timestamp) / 1000)

  if (diffSeconds < 60) return 'たった今'

  const diffMinutes = Math.floor(diffSeconds / 60)
  if (diffMinutes < 60) return `${diffMinutes}分前`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}時間前`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 30) return `${diffDays}日前`

  // 1ヶ月以上前は、素直に日付で表示する
  const date = new Date(timestamp)
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`
}
