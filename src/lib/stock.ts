import type { Item } from '@/types'

/** 在庫がしきい値を下回っているか (在庫アラートの判定) */
export function isLowStock(item: Item): boolean {
  return item.quantity < item.threshold
}

/** しきい値を下回っている備品を数える */
export function countLowStock(items: Item[]): number {
  return items.filter(isLowStock).length
}
