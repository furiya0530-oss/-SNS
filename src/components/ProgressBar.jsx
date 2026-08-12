// 達成率を横棒で表示する部品
// value: 0〜100 の数値
export default function ProgressBar({ value, className = '' }) {
  const safe = Math.min(100, Math.max(0, value || 0)) // 0〜100に収める
  return (
    <div className={`h-3 w-full overflow-hidden rounded-full bg-slate-200 ${className}`}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-500"
        style={{ width: `${safe}%` }}
      />
    </div>
  )
}
