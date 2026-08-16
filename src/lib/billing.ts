import { supabase } from '@/lib/supabase'
import { isDemoMode } from '@/lib/demo'

/**
 * 課金まわりの Edge Function 呼び出し。
 *
 * Stripe のシークレットキーはサーバー側にしか置けないため、
 * Checkout / カスタマーポータルのセッション作成は Edge Function に任せ、
 * ここでは返ってきた URL へ遷移するだけにしている。
 */

/** Pro プランの表示用の情報 (実際の金額は Stripe の Price が正) */
export const PRO_PLAN_PRICE_LABEL = '月額 980円 (税込)'

async function invokeForUrl(
  functionName: 'create-checkout-session' | 'create-portal-session',
): Promise<string> {
  const { data, error } = await supabase.functions.invoke<{
    url?: string
    error?: string
  }>(functionName, { body: {} })

  // Edge Function がエラーを返した場合、本文のメッセージを拾って表示する
  if (error) {
    const message = await readFunctionError(error)
    throw new Error(message)
  }
  if (data?.error) throw new Error(data.error)
  if (!data?.url) throw new Error('決済ページの URL を取得できませんでした。')

  return data.url
}

async function readFunctionError(error: unknown): Promise<string> {
  const context = (error as { context?: Response }).context
  if (context && typeof context.json === 'function') {
    try {
      const body = await context.json()
      if (typeof body?.error === 'string') return body.error
    } catch {
      // JSON でなければ既定のメッセージにする
    }
  }
  if (error instanceof Error && error.message) return error.message
  return '処理に失敗しました。時間をおいてお試しください。'
}

/** Pro プランへのアップグレード (Stripe Checkout へ遷移する) */
export async function startCheckout(): Promise<void> {
  if (isDemoMode) {
    throw new Error(
      'デモモードでは決済に進めません。Supabase と Stripe を設定してからお試しください。',
    )
  }
  window.location.href = await invokeForUrl('create-checkout-session')
}

/** 解約・支払い方法の変更 (Stripe カスタマーポータルへ遷移する) */
export async function openBillingPortal(): Promise<void> {
  if (isDemoMode) {
    throw new Error(
      'デモモードでは開けません。Supabase と Stripe を設定してからお試しください。',
    )
  }
  window.location.href = await invokeForUrl('create-portal-session')
}
