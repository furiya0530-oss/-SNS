import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { authErrorMessage } from '@/lib/authErrors'
import { useSession } from '@/hooks/useSession'

type Mode = 'login' | 'signup'

/** Supabase Auth のパスワード最小文字数の既定値 */
const MIN_PASSWORD_LENGTH = 6

export function LoginPage() {
  const { session, loading } = useSession()
  const location = useLocation()

  const [mode, setMode] = useState<Mode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (loading) return null

  // ログイン済みなら、元々開こうとしていたページ (無ければダッシュボード) へ。
  if (session) {
    const from =
      (location.state as { from?: string } | null)?.from ?? '/'
    return <Navigate to={from} replace />
  }

  function switchMode(next: Mode) {
    setMode(next)
    setError(null)
    setMessage(null)
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    setMessage(null)

    try {
      if (mode === 'login') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (signInError) throw signInError
        // 成功時は onAuthStateChange でセッションが入り、上の Navigate が動く。
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            // profiles を作るトリガーがこの name を使う。
            data: { name: name.trim() || null },
            emailRedirectTo: window.location.origin,
          },
        })
        if (signUpError) throw signUpError

        if (!data.session) {
          // メール確認が有効な場合はここに来る。
          setMessage(
            '確認メールを送信しました。メール内のリンクを開くと登録が完了します。',
          )
        }
      }
    } catch (caught) {
      setError(authErrorMessage(caught))
    } finally {
      setSubmitting(false)
    }
  }

  const isSignup = mode === 'signup'

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold text-slate-900">民泊備品管理</h1>
          <p className="mt-1 text-sm text-slate-500">
            物件ごとの備品と在庫をまとめて管理します。
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          {/* タブ切り替え */}
          <div
            role="tablist"
            aria-label="ログインと新規登録の切り替え"
            className="mb-6 grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1"
          >
            {(
              [
                { value: 'login', label: 'ログイン' },
                { value: 'signup', label: '新規登録' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={mode === tab.value}
                onClick={() => switchMode(tab.value)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  mode === tab.value
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignup && (
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-slate-700"
                >
                  お名前
                  <span className="ml-1 text-xs font-normal text-slate-400">
                    (任意)
                  </span>
                </label>
                <input
                  id="name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="山田 太郎"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                />
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-700"
              >
                メールアドレス
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-700"
              >
                パスワード
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={MIN_PASSWORD_LENGTH}
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
              />
              {isSignup && (
                <p className="mt-1 text-xs text-slate-500">
                  {MIN_PASSWORD_LENGTH}文字以上で入力してください。
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {submitting
                ? '処理中...'
                : isSignup
                  ? 'アカウントを作成'
                  : 'ログイン'}
            </button>
          </form>

          {message && (
            <p className="mt-4 rounded-md bg-green-50 p-3 text-sm text-green-700">
              {message}
            </p>
          )}
          {error && (
            <p
              role="alert"
              className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </p>
          )}
        </div>

        <p className="mt-4 text-center text-sm text-slate-500">
          {isSignup ? 'すでにアカウントをお持ちですか?' : 'アカウントは未登録ですか?'}{' '}
          <button
            type="button"
            onClick={() => switchMode(isSignup ? 'login' : 'signup')}
            className="font-medium text-slate-900 underline underline-offset-2"
          >
            {isSignup ? 'ログイン' : '新規登録'}
          </button>
        </p>
      </div>
    </div>
  )
}
