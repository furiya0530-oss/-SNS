// ============================================
// ダッシュボード画面：全体の進捗をまとめて表示する
// グラフは recharts というライブラリを使っています。
// ============================================

import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import Card from '../components/Card'
import ChartTooltip from '../components/ChartTooltip'
import ProgressBar from '../components/ProgressBar'
import StatusBadge from '../components/StatusBadge'
import {
  calcStreak,
  countBy,
  countByStatus,
  countByTech,
  getSummary,
  monthlyCompletions,
  recentlyUpdated,
  weeklyCompletions,
} from '../utils/stats'

// 棒グラフの色（1種類だけのデータなので単色にします）
const BAR_COLOR = '#2563eb'
const AXIS_STYLE = { fontSize: 11, fill: '#94a3b8' }

export default function Dashboard({ apps, meta, onUpdateMeta, onSelect }) {
  // 計算はまとめて1回だけ行う（useMemo で結果を覚えておく）
  const summary = useMemo(() => getSummary(apps), [apps])
  const statusData = useMemo(
    () => countByStatus(apps).filter((d) => d.value > 0),
    [apps],
  )
  const categoryData = useMemo(
    () => countBy(apps, (a) => a.category).slice(0, 8),
    [apps],
  )
  const techData = useMemo(() => countByTech(apps).slice(0, 8), [apps])
  const weekly = useMemo(() => weeklyCompletions(apps, 8), [apps])
  const monthly = useMemo(() => monthlyCompletions(apps, 6), [apps])
  const streak = useMemo(
    () => calcStreak(meta.activityDates ?? []),
    [meta.activityDates],
  )
  const recent = useMemo(() => recentlyUpdated(apps, 6), [apps])

  const weeklyGoal = Number(meta.weeklyGoal) || 0
  // 直近の週の完成数（目標との比較に使う）
  const thisWeekCount = weekly.length > 0 ? weekly[weekly.length - 1].完成数 : 0

  return (
    <div className="space-y-5">
      {/* ===== 達成率のメイン表示 ===== */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-slate-500">達成率</p>
            <p className="text-4xl font-bold text-slate-900 sm:text-5xl">
              {summary.rate}
              <span className="ml-1 text-2xl text-slate-400">%</span>
            </p>
          </div>
          <p className="text-lg font-bold text-slate-700">
            <span className="text-emerald-600">{summary.done}</span> 個 /{' '}
            {summary.total} 個 完成
          </p>
        </div>

        <ProgressBar value={summary.rate} />

        <p className="mt-3 text-xs text-slate-500">
          残り {summary.total - summary.done} 個。
          {summary.done === 0
            ? 'まずは No.1 から登録してみましょう！'
            : 'この調子で続けましょう 🎉'}
        </p>
      </section>

      {/* ===== 数値カード ===== */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile label="完成" value={summary.done} unit="個" accent="text-emerald-600" />
        <StatTile label="進行中" value={summary.inProgress} unit="個" accent="text-blue-600" />
        <StatTile label="アイデア" value={summary.idea} unit="個" accent="text-amber-600" />
        <StatTile label="未着手" value={summary.notStarted} unit="個" accent="text-slate-500" />
        <StatTile label="合計制作時間" value={summary.totalHours} unit="h" accent="text-slate-700" />
        <StatTile
          label="連続活動日数"
          value={streak.current}
          unit="日"
          accent="text-orange-600"
          note={`最長 ${streak.longest} 日`}
        />
      </div>

      {/* ===== グラフ類 ===== */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* ステータス内訳（円グラフ） */}
        <Card title="ステータス内訳" subtitle="今の100枠の内訳">
          {statusData.length === 0 ? (
            <EmptyChart />
          ) : (
            <div className="flex flex-col items-center gap-4 sm:flex-row">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={2}
                    stroke="#ffffff"
                    strokeWidth={2}
                  >
                    {statusData.map((entry) => (
                      <Cell key={entry.key} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>

              {/* 凡例（色だけに頼らないよう、数字も並べて表示） */}
              <ul className="w-full space-y-1.5 sm:w-44">
                {statusData.map((s) => (
                  <li
                    key={s.key}
                    className="flex items-center justify-between text-xs text-slate-600"
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: s.color }}
                      />
                      {s.name}
                    </span>
                    <span className="font-semibold text-slate-800">
                      {s.value}個
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        {/* 週間ペース（棒グラフ＋目標ライン） */}
        <Card
          title="週間ペース（直近8週）"
          subtitle="各週に完成したアプリの数"
        >
          <div className="mb-3 flex items-center gap-2 text-xs text-slate-600">
            <label htmlFor="weekly-goal" className="font-semibold">
              目標ペース
            </label>
            <input
              id="weekly-goal"
              type="number"
              min="0"
              max="20"
              value={meta.weeklyGoal ?? 0}
              onChange={(e) =>
                onUpdateMeta({ weeklyGoal: Number(e.target.value) })
              }
              className="w-16 rounded-md border border-slate-300 px-2 py-1 text-center"
            />
            <span>個 / 週</span>
            <span
              className={`ml-auto rounded-full px-2 py-0.5 font-semibold ${
                thisWeekCount >= weeklyGoal && weeklyGoal > 0
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              今週 {thisWeekCount} / {weeklyGoal} 個
            </span>
          </div>

          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={weekly} margin={{ top: 14, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" tick={AXIS_STYLE} tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tick={AXIS_STYLE} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f8fafc' }} />
              {/* 目標ラインを点線で引く */}
              {weeklyGoal > 0 && (
                <ReferenceLine
                  y={weeklyGoal}
                  stroke="#059669"
                  strokeDasharray="4 4"
                  label={{
                    value: `目標 ${weeklyGoal}個`,
                    fontSize: 10,
                    fill: '#059669',
                    position: 'insideTopRight',
                  }}
                />
              )}
              <Bar dataKey="完成数" fill={BAR_COLOR} radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* カテゴリ別内訳（横棒グラフ） */}
        <Card title="カテゴリ別の内訳" subtitle="登録数の多い順（最大8件）">
          {categoryData.length === 0 ? (
            <EmptyChart message="カテゴリを登録すると表示されます" />
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(160, categoryData.length * 34)}>
              <BarChart
                data={categoryData}
                layout="vertical"
                margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={AXIS_STYLE} tickLine={false} axisLine={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={90}
                  tick={AXIS_STYLE}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="value" fill={BAR_COLOR} radius={[0, 4, 4, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* 技術別内訳（横棒グラフ） */}
        <Card title="使用技術ランキング" subtitle="使った回数の多い順（最大8件）">
          {techData.length === 0 ? (
            <EmptyChart message="使用技術タグを登録すると表示されます" />
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(160, techData.length * 34)}>
              <BarChart
                data={techData}
                layout="vertical"
                margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={AXIS_STYLE} tickLine={false} axisLine={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={90}
                  tick={AXIS_STYLE}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="value" fill="#7c3aed" radius={[0, 4, 4, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* 月間ペース（折れ線グラフ） */}
        <Card title="月間ペース（直近6か月）" subtitle="各月に完成したアプリの数">
          <ResponsiveContainer width="100%" height={190}>
            <LineChart data={monthly} margin={{ top: 8, right: 16, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" tick={AXIS_STYLE} tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tick={AXIS_STYLE} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Line
                type="monotone"
                dataKey="完成数"
                stroke="#059669"
                strokeWidth={2}
                dot={{ r: 4, fill: '#059669', stroke: '#ffffff', strokeWidth: 2 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* 直近の活動履歴 */}
        <Card title="直近の活動履歴" subtitle="最近更新したアプリ">
          {recent.length === 0 ? (
            <EmptyChart message="まだ活動記録がありません" />
          ) : (
            <ul className="divide-y divide-slate-100">
              {recent.map((app) => (
                <li key={app.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(app.no)}
                    className="flex w-full items-center gap-3 py-2 text-left hover:bg-slate-50"
                  >
                    <span className="w-9 shrink-0 text-xs font-bold text-slate-400">
                      No.{app.no}
                    </span>
                    <span className="flex-1 truncate text-sm text-slate-700">
                      {app.title || '（名称未設定）'}
                    </span>
                    <StatusBadge status={app.status} />
                    <span className="hidden shrink-0 text-[11px] text-slate-400 sm:inline">
                      {new Date(app.updatedAt).toLocaleDateString('ja-JP')}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}

// 数値をひとつ大きく見せる小さなカード
function StatTile({ label, value, unit, accent, note }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <p className="text-[11px] font-semibold text-slate-500">{label}</p>
      <p className={`text-2xl font-bold ${accent}`}>
        {value}
        <span className="ml-0.5 text-sm font-medium text-slate-400">{unit}</span>
      </p>
      {note && <p className="text-[10px] text-slate-400">{note}</p>}
    </div>
  )
}

// データがまだ無いときの表示
function EmptyChart({ message = 'データがまだありません' }) {
  return (
    <p className="flex h-32 items-center justify-center rounded-lg border border-dashed border-slate-200 text-xs text-slate-400">
      {message}
    </p>
  )
}
