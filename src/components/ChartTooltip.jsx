// グラフにマウスを乗せたときに出る吹き出し（ツールチップ）の見た目
export default function ChartTooltip({ active, payload, label, unit = '件' }) {
  // active = マウスが乗っているときだけ true
  if (!active || !payload || payload.length === 0) return null

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-slate-700">
        {label ?? payload[0]?.name}
      </p>
      {payload.map((item) => (
        <p key={item.dataKey ?? item.name} className="flex items-center gap-2 text-slate-600">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: item.color ?? item.payload?.color }}
          />
          <span>
            {item.value}
            {unit}
          </span>
        </p>
      ))}
    </div>
  )
}
