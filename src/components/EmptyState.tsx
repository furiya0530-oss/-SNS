/** データがまだ無いときに表示するプレースホルダー。 */
export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-slate-300 p-6 text-sm text-slate-500">
      {children}
    </p>
  )
}
