import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useProfile } from '@/hooks/useProfile'
import { useProperties } from '@/hooks/useProperties'
import {
  PRO_PLAN_PRICE_LABEL,
  openBillingPortal,
  startCheckout,
} from '@/lib/billing'
import { formatDate } from '@/lib/format'
import { FREE_PLAN_PROPERTY_LIMIT } from '@/lib/planLimits'

const PLAN_FEATURES = [
  { label: '登録できる物件数', free: `${FREE_PLAN_PROPERTY_LIMIT} 件まで`, pro: '無制限' },
  { label: '備品台帳・在庫アラート', free: '◯', pro: '◯' },
  { label: '清掃チェックリスト', free: '◯', pro: '◯' },
  { label: 'CSV 入出力', free: '◯', pro: '◯' },
]

export function PlanPage() {
  const { profile, loading, reload } = useProfile()
  const { properties } = useProperties()
  const [searchParams, setSearchParams] = useSearchParams()

  const [busy, setBusy] = useState<'checkout' | 'portal' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const checkout = searchParams.get('checkout')
  const isPro = profile?.plan === 'pro'

  // Checkout から戻ってきた直後は Webhook の処理が終わっていないことがあるので、
  // プランが切り替わるまで数回だけ読み直す。
  useEffect(() => {
    if (checkout !== 'success') return

    setNotice(
      'お支払いを受け付けました。プランの反映まで少し時間がかかることがあります。',
    )

    let attempts = 0
    const timer = setInterval(() => {
      attempts += 1
      void reload()
      if (attempts >= 5) clearInterval(timer)
    }, 2000)

    return () => clearInterval(timer)
  }, [checkout, reload])

  useEffect(() => {
    if (checkout === 'cancel') {
      setNotice('お支払いは行われませんでした。')
    }
  }, [checkout])

  // 反映されたら案内を消す
  useEffect(() => {
    if (isPro && checkout === 'success') {
      setNotice('Pro プランへのアップグレードが完了しました。')
      const params = new URLSearchParams(searchParams)
      params.delete('checkout')
      setSearchParams(params, { replace: true })
    }
  }, [isPro, checkout, searchParams, setSearchParams])

  async function handle(action: 'checkout' | 'portal') {
    setBusy(action)
    setError(null)
    try {
      if (action === 'checkout') await startCheckout()
      else await openBillingPortal()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '処理に失敗しました。')
      setBusy(null)
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-500">読み込み中...</p>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">プラン</h1>
        <p className="mt-1 text-sm text-slate-500">
          現在のご契約内容と、プランの比較です。
        </p>
      </div>

      {notice && (
        <p role="status" className="rounded-md bg-blue-50 p-3 text-sm text-blue-800">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* 現在の状態 */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <p className="text-sm text-slate-500">現在のプラン</p>
        <p className="mt-1 flex items-center gap-2">
          <span className="text-2xl font-bold text-slate-900">
            {isPro ? 'Pro プラン' : '無料プラン'}
          </span>
          {isPro && (
            <span className="rounded-full bg-slate-900 px-2 py-0.5 text-xs font-medium text-white">
              利用中
            </span>
          )}
        </p>
        <p className="mt-2 text-sm text-slate-500">
          登録済みの物件: {properties.length} 件
          {!isPro && ` / ${FREE_PLAN_PROPERTY_LIMIT} 件`}
        </p>
        {isPro && profile?.plan_expires_at && (
          <p className="mt-1 text-sm text-slate-500">
            次回更新日: {formatDate(profile.plan_expires_at)}
          </p>
        )}
      </div>

      {/* 比較表 */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[32rem] text-left text-sm">
          <thead className="border-b border-slate-200">
            <tr>
              <th className="px-5 py-3 font-medium text-slate-500">機能</th>
              <th className="px-5 py-3">
                <span className="font-bold text-slate-900">無料プラン</span>
                <span className="ml-2 text-xs font-normal text-slate-500">¥0</span>
              </th>
              <th className="px-5 py-3">
                <span className="font-bold text-slate-900">Pro プラン</span>
                <span className="ml-2 text-xs font-normal text-slate-500">
                  {PRO_PLAN_PRICE_LABEL}
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {PLAN_FEATURES.map((feature) => (
              <tr key={feature.label}>
                <td className="px-5 py-3 text-slate-600">{feature.label}</td>
                <td className="px-5 py-3 text-slate-900">{feature.free}</td>
                <td className="px-5 py-3 font-medium text-slate-900">
                  {feature.pro}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 操作 */}
      <div className="flex flex-wrap gap-3">
        {isPro ? (
          <button
            type="button"
            onClick={() => void handle('portal')}
            disabled={busy !== null}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            {busy === 'portal' ? '準備中...' : 'お支払い・解約の手続き'}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void handle('checkout')}
            disabled={busy !== null}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {busy === 'checkout' ? '準備中...' : 'Pro にアップグレード'}
          </button>
        )}
      </div>

      <p className="text-xs text-slate-500">
        お支払いは Stripe の決済ページで行います。解約はカスタマーポータルから
        いつでも可能で、解約後も期間終了までは Pro プランをご利用いただけます。
      </p>
    </div>
  )
}
