/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Supabase プロジェクトの URL (例: https://xxxx.supabase.co) */
  readonly VITE_SUPABASE_URL: string
  /** Supabase の anon (public) キー */
  readonly VITE_SUPABASE_ANON_KEY: string
  /** Stripe の publishable キー (フェーズ2の決済機能で使用) */
  readonly VITE_STRIPE_PUBLISHABLE_KEY?: string
  /** 'true' なら Supabase に接続せずサンプルデータで画面を表示する */
  readonly VITE_DEMO_MODE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
