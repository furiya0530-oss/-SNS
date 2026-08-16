import type { User } from '@supabase/supabase-js'
import type {
  Checklist,
  ChecklistItem,
  ChecklistRecord,
  ChecklistRecordDetail,
  Item,
  Profile,
  Property,
} from '@/types'

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
  id: '00000000-0000-0000-0000-0000000000de',
  email: 'demo@example.com',
  app_metadata: {},
  user_metadata: { name: 'デモオーナー' },
  aud: 'authenticated',
  created_at: '2026-01-15T09:00:00Z',
} as User

export const demoProfile: Profile = {
  id: demoUser.id,
  name: 'デモオーナー',
  role: 'owner',
  plan: 'free',
  plan_expires_at: null,
  stripe_customer_id: null,
  stripe_subscription_id: null,
  created_at: '2026-01-15T09:00:00Z',
}

export const demoProperties: Property[] = [
  {
    id: 'a0000000-0000-0000-0000-000000000001',
    owner_id: demoUser.id,
    name: '浅草ゲストハウス 101',
    address: '東京都台東区浅草 1-2-3',
    created_at: '2026-01-20T09:00:00Z',
  },
  {
    id: 'a0000000-0000-0000-0000-000000000002',
    owner_id: demoUser.id,
    name: '京都町家ステイ',
    address: '京都府京都市中京区',
    created_at: '2026-02-11T09:00:00Z',
  },
  {
    id: 'a0000000-0000-0000-0000-000000000003',
    owner_id: demoUser.id,
    name: '那覇ビーチサイド 2F',
    address: '沖縄県那覇市若狭 4-5-6',
    created_at: '2026-05-02T09:00:00Z',
  },
]

export const demoItems: Item[] = [
  {
    id: 'b0000000-0000-0000-0000-000000000001',
    property_id: demoProperties[0].id,
    name: '歯ブラシセット',
    category: 'amenity',
    quantity: 8,
    threshold: 20,
    photo_url: null,
    updated_at: '2026-08-10T09:00:00Z',
  },
  {
    id: 'b0000000-0000-0000-0000-000000000002',
    property_id: demoProperties[0].id,
    name: 'バスタオル',
    category: 'linen',
    quantity: 24,
    threshold: 12,
    photo_url: null,
    updated_at: '2026-08-09T09:00:00Z',
  },
  {
    id: 'b0000000-0000-0000-0000-000000000003',
    property_id: demoProperties[0].id,
    name: 'トイレットペーパー',
    category: 'consumable',
    quantity: 6,
    threshold: 12,
    photo_url: null,
    updated_at: '2026-08-13T09:00:00Z',
  },
  {
    id: 'b0000000-0000-0000-0000-000000000004',
    property_id: demoProperties[1].id,
    name: 'シャンプー / リンス',
    category: 'amenity',
    quantity: 15,
    threshold: 10,
    photo_url: null,
    updated_at: '2026-08-07T09:00:00Z',
  },
  {
    id: 'b0000000-0000-0000-0000-000000000005',
    property_id: demoProperties[1].id,
    name: 'シーツ (シングル)',
    category: 'linen',
    quantity: 18,
    threshold: 12,
    photo_url: null,
    updated_at: '2026-08-06T09:00:00Z',
  },
  {
    id: 'b0000000-0000-0000-0000-000000000006',
    property_id: demoProperties[1].id,
    name: '食器用洗剤',
    category: 'kitchen',
    quantity: 2,
    threshold: 5,
    photo_url: null,
    updated_at: '2026-08-14T09:00:00Z',
  },
  {
    id: 'b0000000-0000-0000-0000-000000000007',
    property_id: demoProperties[2].id,
    name: 'ビーチタオル',
    category: 'linen',
    quantity: 10,
    threshold: 8,
    photo_url: null,
    updated_at: '2026-08-11T09:00:00Z',
  },
  {
    id: 'b0000000-0000-0000-0000-000000000008',
    property_id: demoProperties[2].id,
    name: '掃除機用フィルター',
    category: 'appliance',
    quantity: 1,
    threshold: 3,
    photo_url: null,
    updated_at: '2026-08-14T09:00:00Z',
  },
]

// ---- チェックリスト ----

export const demoChecklists: Checklist[] = [
  {
    id: 'c0000000-0000-0000-0000-000000000001',
    property_id: demoProperties[0].id,
    title: 'チェックアウト後の清掃',
    created_at: '2026-03-01T09:00:00Z',
  },
  {
    id: 'c0000000-0000-0000-0000-000000000002',
    property_id: demoProperties[1].id,
    title: 'チェックイン前の最終確認',
    created_at: '2026-03-05T09:00:00Z',
  },
]

export const demoChecklistItems: ChecklistItem[] = [
  {
    id: 'd0000000-0000-0000-0000-000000000001',
    checklist_id: demoChecklists[0].id,
    item_id: demoItems[1].id, // バスタオル
    label: 'バスタオルが4枚あるか',
  },
  {
    id: 'd0000000-0000-0000-0000-000000000002',
    checklist_id: demoChecklists[0].id,
    item_id: demoItems[0].id, // 歯ブラシセット
    label: '歯ブラシセットの補充',
  },
  {
    id: 'd0000000-0000-0000-0000-000000000003',
    checklist_id: demoChecklists[0].id,
    item_id: null,
    label: '鍵の返却を確認',
  },
  {
    id: 'd0000000-0000-0000-0000-000000000004',
    checklist_id: demoChecklists[1].id,
    item_id: demoItems[4].id, // シーツ
    label: 'シーツが交換されているか',
  },
]

export const demoChecklistRecords: ChecklistRecord[] = [
  {
    id: 'e0000000-0000-0000-0000-000000000001',
    checklist_id: demoChecklists[0].id,
    property_id: demoProperties[0].id,
    performed_by: demoUser.id,
    performed_at: '2026-08-14T04:30:00Z',
  },
  {
    id: 'e0000000-0000-0000-0000-000000000002',
    checklist_id: demoChecklists[0].id,
    property_id: demoProperties[0].id,
    performed_by: demoUser.id,
    performed_at: '2026-08-09T05:10:00Z',
  },
]

export const demoChecklistRecordDetails: ChecklistRecordDetail[] = [
  {
    id: 'f0000000-0000-0000-0000-000000000001',
    checklist_record_id: demoChecklistRecords[0].id,
    checklist_item_id: demoChecklistItems[0].id,
    status: 'ok',
    comment: null,
  },
  {
    id: 'f0000000-0000-0000-0000-000000000002',
    checklist_record_id: demoChecklistRecords[0].id,
    checklist_item_id: demoChecklistItems[1].id,
    status: 'short',
    comment: '残り8セット。次回までに補充が必要',
  },
  {
    id: 'f0000000-0000-0000-0000-000000000003',
    checklist_record_id: demoChecklistRecords[0].id,
    checklist_item_id: demoChecklistItems[2].id,
    status: 'ok',
    comment: null,
  },
  {
    id: 'f0000000-0000-0000-0000-000000000004',
    checklist_record_id: demoChecklistRecords[1].id,
    checklist_item_id: demoChecklistItems[0].id,
    status: 'broken',
    comment: 'タオル1枚にシミ。処分しました',
  },
]
