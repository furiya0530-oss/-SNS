// ============================================
// 詳細・編集画面：1アプリ分の情報を登録・編集する
// ============================================

import { useEffect, useState } from 'react'
import TagInput from '../components/TagInput'
import StatusBadge from '../components/StatusBadge'
import {
  CATEGORY_SUGGESTIONS,
  DIFFICULTY_MAX,
  STATUSES,
  TOTAL_APPS,
} from '../data/constants'
import { today } from '../utils/date'

export default function DetailPage({ app, onSave, onReset, onBack, onMove }) {
  // draft = 「下書き」。入力中の内容を一時的にここへ入れておきます。
  const [draft, setDraft] = useState(app)
  const [savedMessage, setSavedMessage] = useState(false)

  // 別の番号のアプリに切り替わったら、下書きも入れ替える
  useEffect(() => {
    setDraft(app)
    setSavedMessage(false)
  }, [app])

  // 1項目だけ書き換えるための小さな関数
  function setField(key, value) {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  // 保存されていない変更があるか（JSON文字列にして比較）
  const isDirty = JSON.stringify(draft) !== JSON.stringify(app)

  // 保存ボタンを押したとき
  function handleSubmit(e) {
    e.preventDefault() // ページのリロードを止める（フォームの既定動作）
    onSave(draft)
    setSavedMessage(true)
    // 2秒後にメッセージを消す
    setTimeout(() => setSavedMessage(false), 2000)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* 上部：戻る／前後移動 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
        >
          ← 一覧に戻る
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onMove(app.no - 1)}
            disabled={app.no <= 1}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm disabled:opacity-40"
          >
            前
          </button>
          <span className="text-sm font-semibold text-slate-600">
            No.{app.no} / {TOTAL_APPS}
          </span>
          <button
            type="button"
            onClick={() => onMove(app.no + 1)}
            disabled={app.no >= TOTAL_APPS}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm disabled:opacity-40"
          >
            次
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-sm font-bold text-white">
            {app.no}
          </span>
          <StatusBadge status={draft.status} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* アプリ名 */}
          <Field label="アプリ名" className="sm:col-span-2">
            <input
              value={draft.title}
              onChange={(e) => setField('title', e.target.value)}
              placeholder="例：ポモドーロタイマー"
              className={inputClass}
            />
          </Field>

          {/* 概要 */}
          <Field label="一言アイデア・概要" className="sm:col-span-2">
            <input
              value={draft.summary}
              onChange={(e) => setField('summary', e.target.value)}
              placeholder="例：25分計って集中できるタイマー"
              className={inputClass}
            />
          </Field>

          {/* カテゴリ（候補から選べるが自由入力もOK） */}
          <Field label="カテゴリ">
            <input
              value={draft.category}
              onChange={(e) => setField('category', e.target.value)}
              list="category-suggestions"
              placeholder="例：業務効率化"
              className={inputClass}
            />
            {/* datalist = 入力候補を出すHTMLの機能 */}
            <datalist id="category-suggestions">
              {CATEGORY_SUGGESTIONS.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>

          {/* ステータス */}
          <Field label="ステータス">
            <select
              value={draft.status}
              onChange={(e) => {
                const next = e.target.value
                // 「完成」にしたとき、完成日が空なら今日を自動で入れる
                setDraft((prev) => ({
                  ...prev,
                  status: next,
                  endDate:
                    next === 'done' && !prev.endDate ? today() : prev.endDate,
                  startDate:
                    next === 'in_progress' && !prev.startDate
                      ? today()
                      : prev.startDate,
                }))
              }}
              className={inputClass}
            >
              {STATUSES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>

          {/* 難易度（★ボタン） */}
          <Field label="難易度">
            <div className="flex items-center gap-1">
              {Array.from({ length: DIFFICULTY_MAX }, (_, i) => i + 1).map(
                (n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() =>
                      // 同じ★をもう一度押したら0（未設定）に戻す
                      setField('difficulty', draft.difficulty === n ? 0 : n)
                    }
                    className={`text-2xl leading-none transition-transform hover:scale-110 ${
                      n <= draft.difficulty ? 'text-amber-400' : 'text-slate-300'
                    }`}
                    aria-label={`難易度 ${n}`}
                  >
                    ★
                  </button>
                ),
              )}
              <span className="ml-2 text-xs text-slate-400">
                {draft.difficulty > 0 ? `★${draft.difficulty}` : '未設定'}
              </span>
            </div>
          </Field>

          {/* 制作時間 */}
          <Field label="制作にかかった時間（時間・任意）">
            <input
              type="number"
              min="0"
              step="0.5"
              value={draft.hoursSpent}
              onChange={(e) => setField('hoursSpent', e.target.value)}
              placeholder="例：3.5"
              className={inputClass}
            />
          </Field>

          {/* 着手日・完成日 */}
          <Field label="着手日">
            <input
              type="date"
              value={draft.startDate}
              onChange={(e) => setField('startDate', e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="完成日">
            <input
              type="date"
              value={draft.endDate}
              onChange={(e) => setField('endDate', e.target.value)}
              className={inputClass}
            />
          </Field>

          {/* 使用技術タグ */}
          <Field label="使用技術（Enterで追加）" className="sm:col-span-2">
            <TagInput
              tags={draft.techTags}
              onChange={(tags) => setField('techTags', tags)}
              placeholder="React / Tailwind など"
            />
          </Field>

          {/* リンク */}
          <Field label="成果物URL・参考リンク" className="sm:col-span-2">
            <input
              type="url"
              value={draft.link}
              onChange={(e) => setField('link', e.target.value)}
              placeholder="https://github.com/..."
              className={inputClass}
            />
            {draft.link && (
              <a
                href={draft.link}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-block text-xs text-blue-600 underline"
              >
                リンクを開く ↗
              </a>
            )}
          </Field>

          {/* メモ */}
          <Field
            label="つまずいた点・学んだこと"
            className="sm:col-span-2"
          >
            <textarea
              value={draft.notes}
              onChange={(e) => setField('notes', e.target.value)}
              rows={5}
              placeholder="例：useState の使い方でつまずいた。配列の更新は新しい配列を作る必要がある。"
              className={`${inputClass} resize-y`}
            />
          </Field>
        </div>
      </div>

      {/* 下部：保存・クリア */}
      <div className="sticky bottom-0 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-700"
        >
          保存する
        </button>

        <button
          type="button"
          onClick={() => {
            // window.confirm = 「本当にいいですか？」の確認ダイアログ
            if (window.confirm(`No.${app.no} の内容を空に戻しますか？`)) {
              onReset(app.no)
            }
          }}
          className="rounded-lg border border-rose-200 px-4 py-2 text-sm text-rose-600 hover:bg-rose-50"
        >
          この枠を空にする
        </button>

        {isDirty && !savedMessage && (
          <span className="text-xs font-medium text-amber-600">
            未保存の変更があります
          </span>
        )}
        {savedMessage && (
          <span className="text-xs font-medium text-emerald-600">
            ✓ 保存しました
          </span>
        )}
      </div>
    </form>
  )
}

// 入力欄の共通デザイン（何度も書かずに済むよう変数にまとめています）
const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100'

// ラベル＋入力欄をセットにする小さな部品
function Field({ label, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-semibold text-slate-600">
        {label}
      </span>
      {children}
    </label>
  )
}
