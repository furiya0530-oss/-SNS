// ============================================
// localStorage（ブラウザ内の保存箱）への読み書き担当ファイル
// ここだけ差し替えれば、将来 Supabase などのサーバー保存に移行できます。
// ============================================

import { STORAGE_KEY, TOTAL_APPS } from './constants'
import { createInitialApps, createInitialMeta, normalizeApp } from './model'

/**
 * 保存データを読み込む。
 * まだ何も保存されていない場合や、データが壊れている場合は初期データを返します。
 */
export function loadData() {
  try {
    const json = localStorage.getItem(STORAGE_KEY)
    // 保存が無ければ初期データ（空の100件）
    if (!json) {
      return { apps: createInitialApps(), meta: createInitialMeta() }
    }

    // JSON.parse は「文字列 → JavaScriptのデータ」に戻す関数
    const parsed = JSON.parse(json)
    const savedApps = Array.isArray(parsed.apps) ? parsed.apps : []

    // 1〜100番を必ず揃える（保存データが欠けていても大丈夫にする）
    const apps = Array.from({ length: TOTAL_APPS }, (_, index) => {
      const no = index + 1
      const found = savedApps.find((a) => a?.no === no)
      return normalizeApp(found, no)
    })

    return {
      apps,
      meta: { ...createInitialMeta(), ...parsed.meta },
    }
  } catch (error) {
    // 読み込みに失敗しても、アプリが真っ白にならないようにする
    console.error('保存データの読み込みに失敗しました:', error)
    return { apps: createInitialApps(), meta: createInitialMeta() }
  }
}

/**
 * データを保存する。
 * JSON.stringify は「JavaScriptのデータ → 文字列」に変換する関数です。
 */
export function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    return true
  } catch (error) {
    // 保存容量オーバーなどで失敗することがあります
    console.error('保存に失敗しました:', error)
    return false
  }
}

/** 保存データを全部消す（初期化ボタン用） */
export function clearData() {
  localStorage.removeItem(STORAGE_KEY)
}
