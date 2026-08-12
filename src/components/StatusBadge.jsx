// ステータスを小さなラベルで表示する部品
import { getStatus } from '../data/constants'

export default function StatusBadge({ status }) {
  const s = getStatus(status)
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${s.color}`}
    >
      {/* 色付きの丸ポチ */}
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}
