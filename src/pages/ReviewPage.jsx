// ============================================
// 振り返り画面：完成したアプリの一覧（ポートフォリオ）と全体メモ
// ============================================

import { useMemo, useState } from 'react'
import Card from '../components/Card'
import { formatShort } from '../utils/date'

export default function ReviewPage({ apps, meta, onUpdateMeta, onSelect }) {
  // 完成したアプリだけを、完成日の新しい順に並べる
  const doneApps = useMemo(
    () =>
      apps
        .filter((a) => a.status === 'done')
        .sort((a, b) => (b.endDate ?? '').localeCompare(a.endDate ?? '')),
    [apps],
  )

  // メモは入力するたびに保存すると重いので、下書きを持ってから保存します
  const [memo, setMemo] = useState(meta.retrospective ?? '')
  const [saved, setSaved] = useState(false)

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-800">振り返り</h2>
        <p className="text-sm text-slate-500">
          完成したアプリ {doneApps.length} 個 ／ 学びのメモ
        </p>
      </div>

      {/* ===== 完成アプリのポートフォリオ ===== */}
      {doneApps.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
          まだ完成したアプリがありません。
          <br />
          1つ完成したら、ステータスを「完成」にしてみましょう 🎉
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {doneApps.map((app) => (
            <article
              key={app.id}
              className="flex flex-col rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                  No.{app.no} 完成
                </span>
                {app.endDate && (
                  <span className="text-[11px] text-slate-400">
                    {formatShort(app.endDate)}
                  </span>
                )}
              </div>

              <h3 className="text-sm font-bold text-slate-800">
                {app.title || '（名称未設定）'}
              </h3>
              {app.summary && (
                <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                  {app.summary}
                </p>
              )}

              {/* 使用技術タグ */}
              {app.techTags?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {app.techTags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-3 flex items-center gap-3 border-t border-slate-100 pt-2 text-[11px]">
                {app.difficulty > 0 && (
                  <span className="text-amber-500">
                    {'★'.repeat(app.difficulty)}
                  </span>
                )}
                {Number(app.hoursSpent) > 0 && (
                  <span className="text-slate-500">{app.hoursSpent}h</span>
                )}
                {app.link && (
                  <a
                    href={app.link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 underline"
                  >
                    成果物 ↗
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => onSelect(app.no)}
                  className="ml-auto text-slate-500 underline hover:text-slate-800"
                >
                  編集
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* ===== 全体メモ ===== */}
      <Card
        title="全体を通しての気づき・学び"
        subtitle="チャレンジ全体で感じたことを自由に書き残しましょう"
      >
        <textarea
          value={memo}
          onChange={(e) => {
            setMemo(e.target.value)
            setSaved(false)
          }}
          rows={8}
          placeholder="例：小さく作って早く完成させる方が、続けやすいと気づいた。"
          className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
        <div className="mt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              onUpdateMeta({ retrospective: memo })
              setSaved(true)
            }}
            className="rounded-lg bg-slate-800 px-4 py-1.5 text-sm font-bold text-white hover:bg-slate-700"
          >
            メモを保存
          </button>
          {saved && (
            <span className="text-xs font-medium text-emerald-600">
              ✓ 保存しました
            </span>
          )}
        </div>
      </Card>
    </div>
  )
}
