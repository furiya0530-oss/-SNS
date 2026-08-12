// 白い枠（カード）で中身を囲む共通部品
export default function Card({ title, subtitle, children, className = '' }) {
  return (
    <section
      className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}
    >
      {title && (
        <header className="mb-3">
          <h3 className="text-sm font-bold text-slate-800">{title}</h3>
          {subtitle && (
            <p className="text-xs text-slate-400">{subtitle}</p>
          )}
        </header>
      )}
      {children}
    </section>
  )
}
