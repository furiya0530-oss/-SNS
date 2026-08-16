import { useEffect, useState } from 'react'
import { resolvePhotoUrls } from '@/lib/itemPhotos'
import type { Item } from '@/types'

/**
 * 備品の photo_url を表示できる URL に変換する。
 * 非公開バケットのパスは署名付き URL になる。
 */
export function useItemPhotoUrls(items: Item[]) {
  const [urls, setUrls] = useState<Record<string, string>>({})

  // 対象が変わったときだけ発行し直す
  const key = items
    .map((item) => item.photo_url)
    .filter(Boolean)
    .sort()
    .join('|')

  useEffect(() => {
    let active = true
    const paths = items.map((item) => item.photo_url)

    if (paths.every((path) => !path)) {
      setUrls({})
      return
    }

    void resolvePhotoUrls(paths).then((resolved) => {
      if (active) setUrls(resolved)
    })

    return () => {
      active = false
    }
    // key で写真の集合が変わったかを判定している
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return urls
}
