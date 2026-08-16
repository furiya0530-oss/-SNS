import { useEffect, useState } from 'react'
import { Modal } from '@/components/Modal'
import {
  removeItemPhoto,
  resolvePhotoUrls,
  uploadItemPhoto,
  validatePhoto,
} from '@/lib/itemPhotos'
import type { ItemInput } from '@/hooks/useItems'
import { ITEM_CATEGORIES } from '@/types'
import type { Item } from '@/types'
import { btnPrimary, btnSecondary } from '@/lib/ui'
import { ErrorMessage } from '@/components/Feedback'

interface ItemFormDialogProps {
  propertyId: string
  /** 指定すると編集モードになる */
  item?: Item | null
  onSubmit: (input: ItemInput) => Promise<void>
  onClose: () => void
}

export function ItemFormDialog({
  propertyId,
  item,
  onSubmit,
  onClose,
}: ItemFormDialogProps) {
  const isEdit = Boolean(item)

  const [name, setName] = useState(item?.name ?? '')
  const [category, setCategory] = useState(item?.category ?? '')
  const [quantity, setQuantity] = useState(String(item?.quantity ?? 0))
  const [threshold, setThreshold] = useState(String(item?.threshold ?? 0))
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [removePhoto, setRemovePhoto] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 既存の写真を表示する
  useEffect(() => {
    if (!item?.photo_url) return
    let active = true
    void resolvePhotoUrls([item.photo_url]).then((urls) => {
      if (active && item.photo_url) setPreviewUrl(urls[item.photo_url] ?? null)
    })
    return () => {
      active = false
    }
  }, [item])

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null
    if (!selected) return

    const validationError = validatePhoto(selected)
    if (validationError) {
      setError(validationError)
      event.target.value = ''
      return
    }

    setError(null)
    setFile(selected)
    setRemovePhoto(false)
    setPreviewUrl(URL.createObjectURL(selected))
  }

  function handleRemovePhoto() {
    setFile(null)
    setPreviewUrl(null)
    setRemovePhoto(true)
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('備品名を入力してください。')
      return
    }

    const parsedQuantity = Number(quantity)
    const parsedThreshold = Number(threshold)
    if (!Number.isInteger(parsedQuantity) || parsedQuantity < 0) {
      setError('数量は0以上の整数で入力してください。')
      return
    }
    if (!Number.isInteger(parsedThreshold) || parsedThreshold < 0) {
      setError('しきい値は0以上の整数で入力してください。')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      let photoUrl = item?.photo_url ?? null

      if (file) {
        photoUrl = await uploadItemPhoto(propertyId, file)
        // 差し替え時は古い写真を消す
        if (item?.photo_url) await removeItemPhoto(item.photo_url)
      } else if (removePhoto) {
        if (item?.photo_url) await removeItemPhoto(item.photo_url)
        photoUrl = null
      }

      await onSubmit({
        name: trimmedName,
        category: category || null,
        quantity: parsedQuantity,
        threshold: parsedThreshold,
        photo_url: photoUrl,
      })
      onClose()
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : '保存に失敗しました。時間をおいて再度お試しください。',
      )
      setSubmitting(false)
    }
  }

  const inputClass =
    'mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900'

  return (
    <Modal title={isEdit ? '備品を編集' : '備品を追加'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="item-name"
            className="block text-sm font-medium text-slate-700"
          >
            備品名
            <span className="ml-1 text-xs font-normal text-red-600">必須</span>
          </label>
          <input
            id="item-name"
            type="text"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="バスタオル"
            className={inputClass}
          />
        </div>

        <div>
          <label
            htmlFor="item-category"
            className="block text-sm font-medium text-slate-700"
          >
            カテゴリ
          </label>
          <select
            id="item-category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className={inputClass}
          >
            <option value="">未分類</option>
            {ITEM_CATEGORIES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="item-quantity"
              className="block text-sm font-medium text-slate-700"
            >
              数量
            </label>
            <input
              id="item-quantity"
              type="number"
              min={0}
              step={1}
              required
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label
              htmlFor="item-threshold"
              className="block text-sm font-medium text-slate-700"
            >
              しきい値
            </label>
            <input
              id="item-threshold"
              type="number"
              min={0}
              step={1}
              required
              value={threshold}
              onChange={(event) => setThreshold(event.target.value)}
              className={inputClass}
            />
            <p className="mt-1 text-xs text-slate-500">
              数量がこれを下回ると警告します。
            </p>
          </div>
        </div>

        <div>
          <span className="block text-sm font-medium text-slate-700">
            写真
            <span className="ml-1 text-xs font-normal text-slate-400">
              (任意)
            </span>
          </span>

          {previewUrl && (
            <div className="mt-2 flex items-center gap-3">
              <img
                src={previewUrl}
                alt="選択中の写真"
                className="h-16 w-16 rounded-md border border-slate-200 object-cover"
              />
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="text-sm font-medium text-red-600 hover:underline"
              >
                写真を削除
              </button>
            </div>
          )}

          <input
            id="item-photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="mt-2 block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border file:border-slate-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-100"
          />
          <p className="mt-1 text-xs text-slate-500">
            JPEG / PNG / WebP、5MB まで。
          </p>
        </div>

        {error && (
          <ErrorMessage>{error}</ErrorMessage>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className={btnSecondary}
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={submitting}
            className={btnPrimary}
          >
            {submitting ? '保存中...' : isEdit ? '更新' : '追加'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
