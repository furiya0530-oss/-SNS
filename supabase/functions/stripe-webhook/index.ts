import type Stripe from 'https://esm.sh/stripe@17.7.0?target=deno'
import { getServiceClient, getStripe, requireEnv } from '../_shared/stripe.ts'

/**
 * Stripe からの Webhook を受け取り、profiles の plan を同期する。
 *
 * このエンドポイントは Stripe から呼ばれるので JWT 認証を外す必要がある。
 *   supabase functions deploy stripe-webhook --no-verify-jwt
 *
 * 署名を検証しているため、誰でも叩ける状態でも偽の通知は受け付けない。
 */

/** 契約が有効とみなすステータス */
const ACTIVE_STATUSES = new Set(['active', 'trialing'])

function periodEnd(subscription: Stripe.Subscription): string | null {
  // API バージョンによって位置が違うため両方見る
  const raw =
    (subscription as unknown as { current_period_end?: number })
      .current_period_end ??
    subscription.items?.data?.[0]?.current_period_end

  return raw ? new Date(raw * 1000).toISOString() : null
}

Deno.serve(async (request) => {
  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return new Response('missing stripe-signature', { status: 400 })
  }

  const stripe = getStripe()
  // 署名検証には生のボディが必要
  const body = await request.text()

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      requireEnv('STRIPE_WEBHOOK_SECRET'),
    )
  } catch (error) {
    console.error('signature verification failed', error)
    return new Response('invalid signature', { status: 400 })
  }

  const service = getServiceClient()

  /** 顧客 ID から profiles を更新する */
  async function updateByCustomer(
    customerId: string,
    values: Record<string, unknown>,
  ) {
    const { error } = await service
      .from('profiles')
      .update(values)
      .eq('stripe_customer_id', customerId)

    if (error) throw new Error(error.message)
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const customerId = String(session.customer)
        const userId = session.client_reference_id

        // 初回はまだ stripe_customer_id が入っていない可能性があるので、
        // client_reference_id を使って確実に紐づける
        if (userId) {
          await service
            .from('profiles')
            .update({ stripe_customer_id: customerId })
            .eq('id', userId)
        }

        if (session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            String(session.subscription),
          )
          await updateByCustomer(customerId, {
            plan: ACTIVE_STATUSES.has(subscription.status) ? 'pro' : 'free',
            plan_expires_at: periodEnd(subscription),
            stripe_subscription_id: subscription.id,
          })
        }
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await updateByCustomer(String(subscription.customer), {
          plan: ACTIVE_STATUSES.has(subscription.status) ? 'pro' : 'free',
          plan_expires_at: periodEnd(subscription),
          stripe_subscription_id: subscription.id,
        })
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await updateByCustomer(String(subscription.customer), {
          plan: 'free',
          plan_expires_at: null,
          stripe_subscription_id: null,
        })
        break
      }

      default:
        // 購読していないイベントは無視する (200 を返さないと再送され続ける)
        break
    }
  } catch (error) {
    console.error(`failed to handle ${event.type}`, error)
    // 500 を返すと Stripe が再送してくれる
    return new Response('handler failed', { status: 500 })
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
