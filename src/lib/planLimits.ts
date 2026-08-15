import type { PlanType } from '@/types'

/** 無料プランで登録できる物件数の上限 (DB 側の制限と揃える) */
export const FREE_PLAN_PROPERTY_LIMIT = 1

/** アップグレードを促すメッセージ */
export const UPGRADE_REQUIRED_MESSAGE = 'Proプランへのアップグレードが必要です'

/** これ以上物件を追加できるか */
export function canAddProperty(
  plan: PlanType | undefined,
  propertyCount: number,
): boolean {
  if (plan !== 'free') return true
  return propertyCount < FREE_PLAN_PROPERTY_LIMIT
}

/**
 * DB のトリガーが上限で弾いたエラーかどうか。
 * 画面側のチェックをすり抜けた場合 (API 直叩きなど) はこちらで拾う。
 */
export function isPropertyLimitError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false
  const message = (error as { message?: unknown }).message
  return typeof message === 'string' && message.includes('free_plan_property_limit')
}
