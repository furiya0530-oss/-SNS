/**
 * 通信中・エラー表示の共通コンポーネント。
 * 画面ごとに書き方がばらつかないようにここへ集約する。
 */

/** 回転するスピナー。アニメーションを抑える設定を尊重する。 */
export function Spinner({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`animate-spin motion-reduce:animate-none ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
        className="opacity-25"
      />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  )
}

/** 読み込み中の表示 */
export function Loading({ label = '読み込み中...' }: { label?: string }) {
  return (
    <p
      role="status"
      aria-live="polite"
      className="flex items-center gap-2 py-4 text-sm text-slate-500"
    >
      <Spinner className="h-4 w-4" />
      {label}
    </p>
  )
}

/** エラーメッセージ */
export function ErrorMessage({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">
      {children}
    </p>
  )
}

/** 完了などの通知 */
export function SuccessMessage({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="status"
      className="rounded-md bg-green-50 p-3 text-sm text-green-700"
    >
      {children}
    </p>
  )
}
