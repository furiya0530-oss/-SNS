// ============================================
// 集計（数を数える・グラフ用データを作る）をまとめたファイル
// 画面側は「表示」に集中できるよう、計算はここに分けています。
// ============================================

import { STATUSES, TOTAL_APPS } from '../data/constants'
import { formatShort, parseDate, startOfWeek, toDateString } from './date'

/** ステータスごとの件数を数える（円グラフ用） */
export function countByStatus(apps) {
  return STATUSES.map((s) => ({
    key: s.key,
    name: s.label,
    value: apps.filter((a) => a.status === s.key).length,
    color: s.chart,
  }))
}

/** 全体サマリー（完了数・達成率など） */
export function getSummary(apps) {
  const done = apps.filter((a) => a.status === 'done').length
  const inProgress = apps.filter((a) => a.status === 'in_progress').length
  const idea = apps.filter((a) => a.status === 'idea').length
  const paused = apps.filter((a) => a.status === 'paused').length
  const notStarted = apps.filter((a) => a.status === 'not_started').length

  // 合計制作時間（数字として足せるものだけ合計）
  const totalHours = apps.reduce((sum, a) => {
    const h = Number(a.hoursSpent)
    return sum + (Number.isFinite(h) ? h : 0)
  }, 0)

  return {
    done,
    inProgress,
    idea,
    paused,
    notStarted,
    total: TOTAL_APPS,
    // 達成率（％）。小数第1位まで
    rate: Math.round((done / TOTAL_APPS) * 1000) / 10,
    totalHours: Math.round(totalHours * 10) / 10,
    // 完成したアプリの平均制作時間
    avgHours: (() => {
      const doneWithHours = apps.filter(
        (a) => a.status === 'done' && Number(a.hoursSpent) > 0,
      )
      if (doneWithHours.length === 0) return 0
      const sum = doneWithHours.reduce((s, a) => s + Number(a.hoursSpent), 0)
      return Math.round((sum / doneWithHours.length) * 10) / 10
    })(),
  }
}

/**
 * 名前ごとに件数を数える汎用関数（カテゴリ別の内訳などに使用）
 * getKey は「1件から集計キーを取り出す関数」
 */
export function countBy(apps, getKey) {
  const map = new Map()
  apps.forEach((app) => {
    const key = getKey(app)
    if (!key) return
    map.set(key, (map.get(key) ?? 0) + 1)
  })
  // 多い順に並べ替えて配列にする
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

/** 技術タグ別の件数（1アプリが複数タグを持つので特別扱い） */
export function countByTech(apps) {
  const map = new Map()
  apps.forEach((app) => {
    ;(app.techTags ?? []).forEach((tag) => {
      map.set(tag, (map.get(tag) ?? 0) + 1)
    })
  })
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

/**
 * 連続活動日数（ストリーク）を計算する。
 * activityDates：活動した日の配列（['2026-08-10', ...]）
 * 今日または昨日から数えて、途切れずに続いている日数を返します。
 */
export function calcStreak(activityDates = []) {
  if (activityDates.length === 0) return { current: 0, longest: 0 }

  // 重複を消して古い順に並べる
  const days = [...new Set(activityDates)].sort()

  // 最長ストリークを求める
  let longest = 1
  let run = 1
  for (let i = 1; i < days.length; i++) {
    const prev = parseDate(days[i - 1])
    const curr = parseDate(days[i])
    const gap = Math.round((curr - prev) / 86400000) // 86400000ms = 1日
    if (gap === 1) {
      run += 1
      longest = Math.max(longest, run)
    } else {
      run = 1
    }
  }

  // 現在のストリーク（今日 or 昨日から遡る）
  const now = new Date()
  const todayStr = toDateString(now)
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = toDateString(yesterday)

  const set = new Set(days)
  let current = 0
  if (set.has(todayStr) || set.has(yesterdayStr)) {
    const cursor = set.has(todayStr) ? new Date(now) : yesterday
    while (set.has(toDateString(cursor))) {
      current += 1
      cursor.setDate(cursor.getDate() - 1)
    }
  }

  return { current, longest: Math.max(longest, current) }
}

/**
 * 直近 weeks 週の「完成した数」を数える（週間ペースの棒グラフ用）
 */
export function weeklyCompletions(apps, weeks = 8) {
  const result = []
  const thisMonday = startOfWeek(new Date())

  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(thisMonday)
    start.setDate(start.getDate() - i * 7)
    const end = new Date(start)
    end.setDate(end.getDate() + 7)

    const count = apps.filter((a) => {
      if (a.status !== 'done' || !a.endDate) return false
      const d = parseDate(a.endDate)
      return d && d >= start && d < end
    }).length

    result.push({ name: `${formatShort(toDateString(start))}〜`, 完成数: count })
  }
  return result
}

/**
 * 月ごとの「完成した数」を数える（月間ペースの折れ線グラフ用）
 */
export function monthlyCompletions(apps, months = 6) {
  const result = []
  const now = new Date()

  for (let i = months - 1; i >= 0; i--) {
    const target = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const count = apps.filter((a) => {
      if (a.status !== 'done' || !a.endDate) return false
      const d = parseDate(a.endDate)
      return (
        d &&
        d.getFullYear() === target.getFullYear() &&
        d.getMonth() === target.getMonth()
      )
    }).length

    result.push({
      name: `${target.getFullYear()}/${target.getMonth() + 1}`,
      完成数: count,
    })
  }
  return result
}

/** 最近更新したアプリを新しい順に取り出す（活動履歴用） */
export function recentlyUpdated(apps, limit = 6) {
  return apps
    .filter((a) => a.updatedAt)
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, limit)
}
