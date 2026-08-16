-- Stripe サブスクリプション連携用の列
--
-- Webhook は Stripe の顧客 ID しか持たないため、
-- profiles 側に保存しておいて紐づけられるようにする。
--
-- plan / plan_expires_at と同じく、これらの列も本人には更新させない。
-- (authenticated への update 権限は name 列のみに絞ってあるので追加作業は不要)
-- 書き込むのは Edge Function から service_role で行う。

alter table public.profiles
  add column stripe_customer_id text unique,
  add column stripe_subscription_id text;

comment on column public.profiles.stripe_customer_id is
  'Stripe の Customer ID。Webhook から profiles を引くために使う';
comment on column public.profiles.stripe_subscription_id is
  'Stripe の Subscription ID。解約状態の同期に使う';
