import { supabase } from '@/lib/supabase'
import { isDemoMode } from '@/lib/demo'

export const ITEM_PHOTO_BUCKET = 'item-photos'

/** バケット側の制限と揃える */
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024
export const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']

const SIGNED_URL_TTL_SECONDS = 60 * 60

/** すでに表示できる URL か (デモの blob: や公開バケットの URL) */
function isDirectUrl(value: string): boolean {
  return /^(https?:|blob:|data:)/.test(value)
}

/** アップロード前の検証。問題があればメッセージを返す。 */
export function validatePhoto(file: File): string | null {
  if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
    return 'JPEG / PNG / WebP 形式の画像を選んでください。'
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return '画像サイズは 5MB までです。'
  }
  return null
}

/**
 * 写真をアップロードし、items.photo_url に保存する値を返す。
 * 非公開バケットなのでパスを返す (URL ではない)。
 */
export async function uploadItemPhoto(
  propertyId: string,
  file: File,
): Promise<string> {
  if (isDemoMode) {
    // デモでは実際にアップロードせず、その場で表示できる URL を返す
    return URL.createObjectURL(file)
  }

  const extension = file.type === 'image/png'
    ? 'png'
    : file.type === 'image/webp'
      ? 'webp'
      : 'jpg'
  const path = `${propertyId}/${crypto.randomUUID()}.${extension}`

  const { error } = await supabase.storage
    .from(ITEM_PHOTO_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false })

  if (error) throw error
  return path
}

/** 備品を削除・写真を差し替えたときに、元の写真を消す。 */
export async function removeItemPhoto(photoUrl: string | null): Promise<void> {
  if (!photoUrl || isDemoMode || isDirectUrl(photoUrl)) return
  // 写真の削除に失敗しても本体の操作は続行したいので、ここでは投げない
  await supabase.storage.from(ITEM_PHOTO_BUCKET).remove([photoUrl]).catch(() => {})
}

/**
 * photo_url の配列から、表示用 URL の対応表を作る。
 * 非公開バケットのパスは署名付き URL に変換する。
 */
export async function resolvePhotoUrls(
  photoUrls: (string | null)[],
): Promise<Record<string, string>> {
  const result: Record<string, string> = {}
  const paths: string[] = []

  for (const value of photoUrls) {
    if (!value) continue
    if (isDirectUrl(value)) result[value] = value
    else paths.push(value)
  }

  if (paths.length === 0 || isDemoMode) return result

  const { data, error } = await supabase.storage
    .from(ITEM_PHOTO_BUCKET)
    .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS)

  if (error || !data) return result

  for (const entry of data) {
    if (entry.signedUrl && entry.path) result[entry.path] = entry.signedUrl
  }
  return result
}
