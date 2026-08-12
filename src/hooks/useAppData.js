// ============================================
// アプリ全体のデータ（100件＋全体メモ）を管理するカスタムフック
// 「読み込み・更新・自動保存」をここに集約しています。
// ============================================

import { useCallback, useEffect, useRef, useState } from 'react'
import { clearData, loadData, saveData } from '../data/storage'
import { createEmptyApp } from '../data/model'
import { today } from '../utils/date'

export function useAppData() {
  // useState = 画面に反映される「状態（データ）」を持つためのReactの機能
  // 初期値に関数を渡すと、最初の1回だけ実行されます（localStorage読み込みは1回でOK）
  const [data, setData] = useState(() => loadData())
  const [savedAt, setSavedAt] = useState(null) // 最後に保存した時刻（画面表示用）

  // 初回描画かどうかを覚えておく箱（初回は保存しない）
  const isFirstRender = useRef(true)

  // useEffect = 「データが変わったら◯◯する」を書く場所
  // ここでは data が変わるたびに localStorage へ自動保存します。
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    const ok = saveData(data)
    if (ok) setSavedAt(new Date())
  }, [data])

  /**
   * 1件のアプリ情報を更新する。
   * 例：updateApp(3, { title: 'ToDoアプリ' })
   */
  const updateApp = useCallback((no, patch) => {
    setData((prev) => {
      const nowIso = new Date().toISOString()
      const apps = prev.apps.map((app) =>
        app.no === no ? { ...app, ...patch, updatedAt: nowIso } : app,
      )
      // 「今日活動した」記録を残す（連続日数＝ストリークの計算に使う）
      const day = today()
      const activityDates = prev.meta.activityDates ?? []
      const nextDates = activityDates.includes(day)
        ? activityDates
        : [...activityDates, day]

      return { ...prev, apps, meta: { ...prev.meta, activityDates: nextDates } }
    })
  }, [])

  /** 1件のアプリ情報を空に戻す */
  const resetApp = useCallback((no) => {
    setData((prev) => ({
      ...prev,
      apps: prev.apps.map((app) => (app.no === no ? createEmptyApp(no) : app)),
    }))
  }, [])

  /** 全体メモや目標ペースなどを更新する */
  const updateMeta = useCallback((patch) => {
    setData((prev) => ({ ...prev, meta: { ...prev.meta, ...patch } }))
  }, [])

  /** すべてのデータを消して最初からやり直す */
  const resetAll = useCallback(() => {
    clearData()
    setData(loadData())
  }, [])

  /** バックアップ用：データをJSONファイルとしてダウンロード */
  const exportJson = useCallback(() => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `app100-backup-${today()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [data])

  /** バックアップJSONを読み込んで復元する */
  const importJson = useCallback((file, onDone) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result))
        saveData(parsed)
        setData(loadData())
        onDone?.(true)
      } catch (error) {
        console.error('読み込み失敗:', error)
        onDone?.(false)
      }
    }
    reader.readAsText(file)
  }, [])

  return {
    apps: data.apps,
    meta: data.meta,
    savedAt,
    updateApp,
    resetApp,
    updateMeta,
    resetAll,
    exportJson,
    importJson,
  }
}
