import { createClient } from '@supabase/supabase-js'
import { isDemoMode } from '@/lib/demo'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!isDemoMode && (!supabaseUrl || !supabaseAnonKey)) {
  throw new Error(
    'Supabase の環境変数が設定されていません。' +
      '.env.example をコピーして .env.local を作成し、' +
      'VITE_SUPABASE_URL と VITE_SUPABASE_ANON_KEY を設定してください。' +
      '(UI の確認だけなら VITE_DEMO_MODE=true で起動できます)',
  )
}

// デモモードではダミー値でクライアントを作るだけで、実際の通信は行わない。
export const supabase = createClient(
  supabaseUrl || 'https://demo.example.supabase.co',
  supabaseAnonKey || 'demo-anon-key',
  {
    auth: {
      persistSession: !isDemoMode,
      autoRefreshToken: !isDemoMode,
      detectSessionInUrl: !isDemoMode,
    },
  },
)
