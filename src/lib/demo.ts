import type { User } from '@supabase/supabase-js'
import type { Item, Property } from '@/types'

/**
 * デモモード。
 *
 * `VITE_DEMO_MODE=true` でビルド / 起動すると、Supabase に接続せず
 * サンプルデータだけで画面を確認できる。UI をブラウザで確認するための
 * 仕組みなので、実データを扱う実装が入ったらこのファイルごと削除してよい。
 */
export const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true'

/** デモ用のダミーユーザー。実際の認証は行わない。 */
export const demoUser = {
  id: 'demo-user',
  email: 'demo@example.com',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: '2026-01-15T09:00:00Z',
} as User

export const demoProperties: Property[] = [
  {
    id: 'prop-1',
    owner_id: demoUser.id,
    name: '浅草ゲストハウス 101',
    address: '東京都台東区浅草 1-2-3',
    note: '1LDK / 定員4名',
    created_at: '2026-01-20T09:00:00Z',
    updated_at: '2026-08-01T09:00:00Z',
  },
  {
    id: 'prop-2',
    owner_id: demoUser.id,
    name: '京都町家ステイ',
    address: '京都府京都市中京区',
    note: '一棟貸し / 定員6名',
    created_at: '2026-02-11T09:00:00Z',
    updated_at: '2026-08-05T09:00:00Z',
  },
  {
    id: 'prop-3',
    owner_id: demoUser.id,
    name: '那覇ビーチサイド 2F',
    address: '沖縄県那覇市若狭 4-5-6',
    note: '2DK / 定員5名',
    created_at: '2026-05-02T09:00:00Z',
    updated_at: '2026-08-12T09:00:00Z',
  },
]

export const demoItems: Item[] = [
  {
    id: 'item-1',
    property_id: 'prop-1',
    name: '歯ブラシセット',
    category: 'amenity',
    unit: 'セット',
    quantity: 8,
    threshold: 20,
    created_at: '2026-01-20T09:00:00Z',
    updated_at: '2026-08-10T09:00:00Z',
  },
  {
    id: 'item-2',
    property_id: 'prop-1',
    name: 'バスタオル',
    category: 'linen',
    unit: '枚',
    quantity: 24,
    threshold: 12,
    created_at: '2026-01-20T09:00:00Z',
    updated_at: '2026-08-09T09:00:00Z',
  },
  {
    id: 'item-3',
    property_id: 'prop-1',
    name: 'トイレットペーパー',
    category: 'cleaning',
    unit: 'ロール',
    quantity: 6,
    threshold: 12,
    created_at: '2026-01-20T09:00:00Z',
    updated_at: '2026-08-13T09:00:00Z',
  },
  {
    id: 'item-4',
    property_id: 'prop-2',
    name: 'シャンプー / リンス',
    category: 'amenity',
    unit: '本',
    quantity: 15,
    threshold: 10,
    created_at: '2026-02-11T09:00:00Z',
    updated_at: '2026-08-07T09:00:00Z',
  },
  {
    id: 'item-5',
    property_id: 'prop-2',
    name: 'シーツ (シングル)',
    category: 'linen',
    unit: '枚',
    quantity: 18,
    threshold: 12,
    created_at: '2026-02-11T09:00:00Z',
    updated_at: '2026-08-06T09:00:00Z',
  },
  {
    id: 'item-6',
    property_id: 'prop-2',
    name: '食器用洗剤',
    category: 'kitchen',
    unit: '本',
    quantity: 2,
    threshold: 5,
    created_at: '2026-02-11T09:00:00Z',
    updated_at: '2026-08-14T09:00:00Z',
  },
  {
    id: 'item-7',
    property_id: 'prop-3',
    name: 'ビーチタオル',
    category: 'linen',
    unit: '枚',
    quantity: 10,
    threshold: 8,
    created_at: '2026-05-02T09:00:00Z',
    updated_at: '2026-08-11T09:00:00Z',
  },
  {
    id: 'item-8',
    property_id: 'prop-3',
    name: '掃除機用フィルター',
    category: 'equipment',
    unit: '個',
    quantity: 1,
    threshold: 3,
    created_at: '2026-05-02T09:00:00Z',
    updated_at: '2026-08-14T09:00:00Z',
  },
]
