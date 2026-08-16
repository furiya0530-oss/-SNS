import {
  corsHeaders,
  getServiceClient,
  getStripe,
  getUserFromRequest,
  jsonResponse,
  requireEnv,
} from '../_shared/stripe.ts'

/**
 * Pro プランへのアップグレード用に Stripe Checkout セッションを作る。
 * 返した url へブラウザを遷移させると Stripe の決済ページが開く。
 */
Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const user = await getUserFromRequest(request)
    if (!user) return jsonResponse({ error: 'ログインが必要です。' }, 401)

    const stripe = getStripe()
    const service = getServiceClient()
    const appUrl = requireEnv('APP_URL')

    const { data: profile } = await service
      .from('profiles')
      .select('stripe_customer_id, plan, name')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.plan === 'pro') {
      return jsonResponse({ error: 'すでに Pro プランをご利用中です。' }, 400)
    }

    // Stripe の顧客が未作成なら作り、profiles に控えておく
    let customerId = profile?.stripe_customer_id ?? null
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        name: profile?.name ?? undefined,
        // Webhook 側で user を引けるようにしておく (保険)
        metadata: { supabase_user_id: user.id },
      })
      customerId = customer.id

      await service
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id)
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: requireEnv('STRIPE_PRICE_ID'), quantity: 1 }],
      success_url: `${appUrl}/plan?checkout=success`,
      cancel_url: `${appUrl}/plan?checkout=cancel`,
      // Webhook で確実にユーザーを特定できるようにする
      client_reference_id: user.id,
      subscription_data: { metadata: { supabase_user_id: user.id } },
      allow_promotion_codes: true,
    })

    return jsonResponse({ url: session.url })
  } catch (error) {
    console.error('create-checkout-session failed', error)
    return jsonResponse(
      { error: '決済ページの作成に失敗しました。時間をおいてお試しください。' },
      500,
    )
  }
})
