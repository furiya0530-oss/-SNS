import {
  corsHeaders,
  getServiceClient,
  getStripe,
  getUserFromRequest,
  jsonResponse,
  requireEnv,
} from '../_shared/stripe.ts'

/**
 * 解約や支払い方法の変更を行う Stripe カスタマーポータルのセッションを作る。
 */
Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const user = await getUserFromRequest(request)
    if (!user) return jsonResponse({ error: 'ログインが必要です。' }, 401)

    const service = getServiceClient()
    const { data: profile } = await service
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile?.stripe_customer_id) {
      return jsonResponse(
        { error: 'お支払い情報が見つかりません。先に Pro プランへお申し込みください。' },
        400,
      )
    }

    const session = await getStripe().billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${requireEnv('APP_URL')}/plan`,
    })

    return jsonResponse({ url: session.url })
  } catch (error) {
    console.error('create-portal-session failed', error)
    return jsonResponse(
      { error: 'お手続きページの作成に失敗しました。時間をおいてお試しください。' },
      500,
    )
  }
})
