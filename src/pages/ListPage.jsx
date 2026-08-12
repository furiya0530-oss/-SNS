// ============================================
// 一覧画面：100個の枠をステータスで色分けして表示する
// ============================================

import { useMemo, useState } from 'react'
import AppCell from '../components/AppCell'
import { STATUSES } from '../data/constants'

export default function ListPage({ apps, onSelect }) {
  // 絞り込み用の状態
  const [keyword, setKeyword] = useState('') // 検索キーワード
  const [statusFilter, setStatusFilter] = useState('all') // ステータス絞り込み

  // useMemo = 計算結果を覚えておいて、必要なときだけ再計算する仕組み（動作を軽くする）
  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    return apps.filter((app) => {
      // ステータスで絞り込み
      if (statusFilter !== 'all' && app.status !== statusFilter) return false
      // キーワードが空なら全部通す
      if (!kw) return true
      // アプリ名・概要・カテゴリ・技術タグのどれかに含まれていればヒット
      const target = [
        app.title,
        app.summary,
        app.category,
        ...(app.techTags ?? []),
        `no.${app.no}`,
      ]
        .join(' ')
        .toLowerCase()
      return target.includes(kw)
    })
  }, [apps, keyword, statusFilter])

  // ステータスごとの件数を数える
  const counts = useMemo(() => {
    const map = { all: apps.length }
    STATUSES.forEach((s) => {
      map[s.key] = apps.filter((a) => a.status === s.key).length
    })
    return map
  }, [apps])

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">アプリ一覧</h2>
          <p className="text-sm text-slate-500">
            マスをクリックすると、詳細の登録・編集ができます
          </p>
        </div>

        {/* 検索ボックス */}
        <input
          type="search"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="アプリ名・技術・カテゴリで検索"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:w-72"
        />
      </div>

      {/* ステータスで絞り込むボタン群（凡例も兼ねています） */}
      <div className="flex flex-wrap gap-2">
        <FilterChip
          active={statusFilter === 'all'}
          onClick={() => setStatusFilter('all')}
          label="すべて"
          count={counts.all}
          dot="bg-slate-400"
        />
        {STATUSES.map((s) => (
          <FilterChip
            key={s.key}
            active={statusFilter === s.key}
            onClick={() => setStatusFilter(s.key)}
            label={s.label}
            count={counts[s.key]}
            dot={s.dot}
          />
        ))}
      </div>

      {/* 100個のマス。画面幅に応じて列数が変わります（レスポンシブ対応） */}
      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
          条件に合うアプリがありません
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10">
          {filtered.map((app) => (
            <AppCell key={app.id} app={app} onClick={() => onSelect(app.no)} />
          ))}
        </div>
      )}
    </div>
  )
}

// 絞り込みボタン（小さな部品なので同じファイル内に置いています）
function FilterChip({ active, onClick, label, count, dot }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? 'border-slate-800 bg-slate-800 text-white'
          : 'border-slate-300 bg-white text-slate-600 hover:border-slate-500'
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      {label}
      <span className={active ? 'opacity-80' : 'text-slate-400'}>{count}</span>
    </button>
  )
}
