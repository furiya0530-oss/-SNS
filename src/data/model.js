// ============================================
// 「1アプリ分のデータ（レコード）」の形を決めるファイル
// ============================================

import { TOTAL_APPS } from './constants'

/**
 * アプリ1件分の空データを作る関数。
 * no（1〜100）を渡すと、その番号の初期データが返ります。
 *
 * 各項目の意味：
 *  id         : 内部的に使う一意（ユニーク）なID
 *  no         : 何個目のアプリか（1〜100）
 *  title      : アプリ名
 *  summary    : 一言アイデア・概要
 *  category   : カテゴリ（Webツール／ゲーム など・自由入力）
 *  difficulty : 難易度（0=未設定、1〜5＝★の数）
 *  status     : ステータス（not_started / idea / in_progress / done / paused）
 *  startDate  : 着手日（'2026-08-12' のような文字列）
 *  endDate    : 完成日
 *  hoursSpent : 制作にかかった時間（数値・任意）
 *  techTags   : 使用技術の一覧（例：['React', 'Tailwind']）
 *  notes      : つまずいた点・学んだことのメモ
 *  link       : 成果物URLや参考リンク
 *  updatedAt  : 最後に更新した日時（自動で入ります）
 */
export function createEmptyApp(no) {
  return {
    id: `app-${no}`,
    no,
    title: '',
    summary: '',
    category: '',
    difficulty: 0,
    status: 'not_started',
    startDate: '',
    endDate: '',
    hoursSpent: '',
    techTags: [],
    notes: '',
    link: '',
    updatedAt: null,
  }
}

/**
 * 1〜100番までの空データを一気に作る関数。
 * 初回起動時（まだ保存データが無いとき）に使います。
 */
export function createInitialApps() {
  // Array.from は「指定した個数の配列を作る」書き方です。
  return Array.from({ length: TOTAL_APPS }, (_, index) =>
    createEmptyApp(index + 1),
  )
}

/**
 * 保存データが古い形式でも壊れないように、足りない項目を補う関数。
 * （後から項目を追加したときの保険です）
 */
export function normalizeApp(raw, no) {
  const base = createEmptyApp(no)
  return {
    ...base,
    ...raw,
    no,
    id: raw?.id || base.id,
    // techTags は必ず配列にしておく
    techTags: Array.isArray(raw?.techTags) ? raw.techTags : [],
  }
}

/**
 * アプリ全体で使う「まとめメモ（振り返り画面のメモ）」の初期値
 */
export function createInitialMeta() {
  return {
    retrospective: '', // 全体を通しての気づき・学び
    weeklyGoal: 3, // 目標ペース（1週間に何個作るか）
    activityDates: [], // 活動した日の一覧（連続日数＝ストリークの計算に使う）
  }
}
