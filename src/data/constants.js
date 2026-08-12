// ============================================
// アプリ全体で使う「決まりごと（定数）」をまとめたファイル
// 色やステータスの種類を変えたいときは、ここだけ直せばOKです。
// ============================================

// 管理するアプリの総数（100個チャレンジなので 100）
export const TOTAL_APPS = 100

// localStorage に保存するときの「名札（キー）」
// この名前でブラウザにデータが保存されます。
export const STORAGE_KEY = 'app100-challenge-v1'

// ステータス（進み具合）の一覧。
// key    : プログラム内部で使う値（保存されるのはこれ）
// label  : 画面に表示する日本語
// color  : 一覧のマスの色（Tailwind のクラス名）
// dot    : 丸ポチの色
// chart  : グラフで使う色コード
//          （色覚に配慮し、赤と緑を隣り合わせにしない組み合わせにしています。
//            「中断」は赤ではなく紫を使用）
export const STATUSES = [
  {
    key: 'not_started',
    label: '未着手',
    color: 'bg-slate-100 text-slate-500 border-slate-200 hover:border-slate-400',
    dot: 'bg-slate-400',
    chart: '#94a3b8',
  },
  {
    key: 'idea',
    label: 'アイデアのみ',
    color: 'bg-amber-50 text-amber-800 border-amber-200 hover:border-amber-400',
    dot: 'bg-amber-500',
    chart: '#d97706',
  },
  {
    key: 'in_progress',
    label: '進行中',
    color: 'bg-blue-50 text-blue-800 border-blue-300 hover:border-blue-500',
    dot: 'bg-blue-600',
    chart: '#2563eb',
  },
  {
    key: 'done',
    label: '完成',
    color: 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:border-emerald-500',
    dot: 'bg-emerald-600',
    chart: '#059669',
  },
  {
    key: 'paused',
    label: '中断',
    color: 'bg-violet-50 text-violet-800 border-violet-200 hover:border-violet-400',
    dot: 'bg-violet-600',
    chart: '#9333ea',
  },
]

// ステータスの key から、その定義（label や色）を探す関数
export function getStatus(key) {
  return STATUSES.find((s) => s.key === key) ?? STATUSES[0]
}

// カテゴリの候補（自由入力もできるように、あくまで「候補」です）
export const CATEGORY_SUGGESTIONS = [
  'Webツール',
  'ゲーム',
  '業務効率化',
  '学習用',
  'SNS・コミュニティ',
  'AI活用',
  'その他',
]

// 難易度は ★1〜★5 の 5段階
export const DIFFICULTY_MAX = 5
