// ============================================
// アプリの入口。画面（タブ）の切り替えを担当します。
// ページ移動ライブラリは使わず、「今どの画面か」を状態で持つシンプルな作りです。
// ============================================

import { useState } from 'react'
import { useAppData } from './hooks/useAppData'
import Dashboard from './pages/Dashboard'
import ListPage from './pages/ListPage'
import DetailPage from './pages/DetailPage'
import ReviewPage from './pages/ReviewPage'
import { TOTAL_APPS } from './data/constants'

// 画面の一覧（タブに表示される順番）
const TABS = [
  { key: 'dashboard', label: 'ダッシュボード', icon: '📊' },
  { key: 'list', label: '一覧', icon: '🗂' },
  { key: 'review', label: '振り返り', icon: '🏆' },
]

export default function App() {
  // データ（100件＋全体メモ）はこのフックがまとめて面倒を見ます
  const {
    apps,
    meta,
    savedAt,
    updateApp,
    resetApp,
    updateMeta,
    resetAll,
    exportJson,
    importJson,
  } = useAppData()

  const [tab, setTab] = useState('dashboard') // 今表示している画面
  const [selectedNo, setSelectedNo] = useState(null) // 詳細表示中のアプリ番号

  // 詳細画面を開く
  function openDetail(no) {
    setSelectedNo(no)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // 詳細画面で「保存」したとき
  function handleSave(draft) {
    updateApp(draft.no, draft)
  }

  // 前後のアプリへ移動
  function moveTo(no) {
    if (no >= 1 && no <= TOTAL_APPS) setSelectedNo(no)
  }

  const selectedApp = apps.find((a) => a.no === selectedNo)

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* ===== ヘッダー ===== */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🚀</span>
            <div>
              <h1 className="text-base font-bold leading-tight sm:text-lg">
                100個アプリ制作チャレンジ
              </h1>
              <p className="text-[11px] text-slate-500">
                {savedAt
                  ? `自動保存しました（${savedAt.toLocaleTimeString('ja-JP')}）`
                  : 'データはこのブラウザに保存されます'}
              </p>
            </div>
          </div>

          {/* 画面切り替えタブ */}
          <nav className="flex gap-1 rounded-xl bg-slate-100 p-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  setTab(t.key)
                  setSelectedNo(null) // 詳細を閉じる
                }}
                className={`flex-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors sm:text-sm ${
                  tab === t.key && !selectedApp
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span className="mr-1">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* ===== 本文 ===== */}
      <main className="mx-auto max-w-6xl px-4 py-6">
        {/* 詳細画面が開いているときは、そちらを最優先で表示 */}
        {selectedApp ? (
          <DetailPage
            app={selectedApp}
            onSave={handleSave}
            onReset={(no) => {
              resetApp(no)
            }}
            onBack={() => {
              setSelectedNo(null)
              setTab('list')
            }}
            onMove={moveTo}
          />
        ) : (
          <>
            {tab === 'dashboard' && (
              <Dashboard
                apps={apps}
                meta={meta}
                onUpdateMeta={updateMeta}
                onSelect={openDetail}
              />
            )}
            {tab === 'list' && <ListPage apps={apps} onSelect={openDetail} />}
            {tab === 'review' && (
              <ReviewPage
                apps={apps}
                meta={meta}
                onUpdateMeta={updateMeta}
                onSelect={openDetail}
              />
            )}
          </>
        )}
      </main>

      {/* ===== フッター（データ管理と注意書き） ===== */}
      <footer className="mx-auto max-w-6xl px-4 pb-10">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
          <p className="mb-2 font-bold">⚠ データ保存についての注意</p>
          <p className="mb-3 leading-relaxed">
            記録はこのブラウザの中（localStorage）にだけ保存されます。
            ブラウザのデータ削除・シークレットモード・別の端末やブラウザでは
            見られません。大切な記録は「バックアップ保存」でファイルに残してください。
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={exportJson}
              className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 font-semibold hover:bg-amber-100"
            >
              ⬇ バックアップ保存
            </button>

            {/* ファイル選択はラベルで包むと見た目を整えやすい */}
            <label className="cursor-pointer rounded-lg border border-amber-300 bg-white px-3 py-1.5 font-semibold hover:bg-amber-100">
              ⬆ バックアップ読込
              <input
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  importJson(file, (ok) => {
                    alert(ok ? '読み込みました' : '読み込みに失敗しました')
                  })
                  e.target.value = '' // 同じファイルを続けて選べるようにする
                }}
              />
            </label>

            <button
              type="button"
              onClick={() => {
                if (
                  window.confirm(
                    'すべての記録を消して最初からやり直しますか？（元に戻せません）',
                  )
                ) {
                  resetAll()
                }
              }}
              className="rounded-lg border border-rose-300 bg-white px-3 py-1.5 font-semibold text-rose-600 hover:bg-rose-50"
            >
              🗑 全データ初期化
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}
