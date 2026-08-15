/**
 * アプリ全体で使うドメイン型。
 * Supabase のテーブル設計が固まったら
 * `supabase gen types typescript` で生成した型に置き換える想定。
 */

/** 民泊物件 */
export interface Property {
  id: string
  /** 所有ユーザー (auth.users.id) */
  owner_id: string
  name: string
  address: string | null
  /** 部屋数や定員などのメモ */
  note: string | null
  created_at: string
  updated_at: string
}

/** 備品のカテゴリ */
export type ItemCategory =
  | 'amenity' // アメニティ (歯ブラシ、シャンプーなど)
  | 'linen' // リネン (シーツ、タオルなど)
  | 'cleaning' // 清掃用品
  | 'kitchen' // キッチン用品
  | 'equipment' // 設備・家電
  | 'other'

/** 備品マスタ */
export interface Item {
  id: string
  property_id: string
  name: string
  category: ItemCategory
  /** 単位 (個、セット、本など) */
  unit: string
  /** 現在の在庫数 */
  quantity: number
  /** この数量を下回ったら補充アラートを出す閾値 */
  threshold: number
  created_at: string
  updated_at: string
}

/** 在庫の増減種別 */
export type StockMovementType =
  | 'restock' // 補充
  | 'consume' // 消費
  | 'adjust' // 棚卸しによる調整
  | 'discard' // 廃棄

/** 在庫の増減履歴 */
export interface StockMovement {
  id: string
  item_id: string
  type: StockMovementType
  /** 増減量 (消費・廃棄はマイナス) */
  delta: number
  note: string | null
  /** 操作したユーザー (auth.users.id) */
  created_by: string
  created_at: string
}

/** サブスクリプションのプラン (フェーズ2の Stripe 連携で使用) */
export type SubscriptionPlan = 'free' | 'standard' | 'pro'

/** サブスクリプションの状態 (Stripe の status に対応) */
export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'incomplete'

/** ユーザープロフィール */
export interface Profile {
  /** auth.users.id と同一 */
  id: string
  display_name: string | null
  plan: SubscriptionPlan
  subscription_status: SubscriptionStatus | null
  stripe_customer_id: string | null
  created_at: string
  updated_at: string
}
