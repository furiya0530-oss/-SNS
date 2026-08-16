import Stripe from 'https://esm.sh/stripe@17.7.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'

/**
 * Edge Function 共通のセットアップ。
 *
 * 必要な環境変数 (supabase secrets set で登録する):
 *   STRIPE_SECRET_KEY         sk_...
 *   STRIPE_WEBHOOK_SECRET     whsec_...   (stripe-webhook のみ)
 *   STRIPE_PRICE_ID           price_...   (Pro プランの月額料金)
 *   APP_URL                   https://example.vercel.app
 *   SUPABASE_URL              (Supabase が自動で入れる)
 *   SUPABASE_ANON_KEY         (Supabase が自動で入れる)
 *   SUPABASE_SERVICE_ROLE_KEY (Supabase が自動で入れる)
 */

export function requireEnv(name: string): string {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`環境変数 ${name} が設定されていません`)
  return value
}

export function getStripe(): Stripe {
  return new Stripe(requireEnv('STRIPE_SECRET_KEY'), {
    apiVersion: '2025-02-24.acacia',
    // Deno では fetch ベースの HTTP クライアントを使う必要がある
    httpClient: Stripe.createFetchHttpClient(),
  })
}

/** RLS を無視して profiles を更新するためのクライアント (Webhook 用) */
export function getServiceClient() {
  return createClient(
    requireEnv('SUPABASE_URL'),
    requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { persistSession: false } },
  )
}

/**
 * リクエストの Authorization ヘッダーからログインユーザーを取得する。
 * トークンが無効なら null を返す。
 */
export async function getUserFromRequest(request: Request) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader) return null

  const client = createClient(
    requireEnv('SUPABASE_URL'),
    requireEnv('SUPABASE_ANON_KEY'),
    {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    },
  )

  const { data, error } = await client.auth.getUser()
  if (error) return null
  return data.user
}

export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
