// 一覧画面の「1マス」を表す部品
// クリックすると詳細・編集画面へ移動します。
import { getStatus } from '../data/constants'

export default function AppCell({ app, onClick }) {
  const s = getStatus(app.status)

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex h-24 flex-col justify-between rounded-xl border-2 p-2 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${s.color}`}
      title={app.title || `No.${app.no}（未登録）`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold opacity-70">No.{app.no}</span>
        <span className={`h-2 w-2 rounded-full ${s.dot}`} />
      </div>

      {/* アプリ名（未入力なら薄いグレーで「未登録」） */}
      <p className="line-clamp-2 text-xs font-semibold leading-tight">
        {app.title || <span className="opacity-40">未登録</span>}
      </p>

      {/* 難易度の★（0のときは何も出さない） */}
      <p className="text-[10px] opacity-70">
        {app.difficulty > 0 ? '★'.repeat(app.difficulty) : ' '}
      </p>
    </button>
  )
}
