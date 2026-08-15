import { useState } from 'react'
import { Modal } from '@/components/Modal'
import type { PropertyInput } from '@/hooks/useProperties'
import type { Property } from '@/types'

interface PropertyFormDialogProps {
  /** 指定すると編集モードになる */
  property?: Property | null
  onSubmit: (input: PropertyInput) => Promise<void>
  onClose: () => void
}

export function PropertyFormDialog({
  property,
  onSubmit,
  onClose,
}: PropertyFormDialogProps) {
  const isEdit = Boolean(property)
  const [name, setName] = useState(property?.name ?? '')
  const [address, setAddress] = useState(property?.address ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('物件名を入力してください。')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      await onSubmit({
        name: trimmedName,
        address: address.trim() || null,
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

  return (
    <Modal title={isEdit ? '物件を編集' : '物件を追加'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="property-name"
            className="block text-sm font-medium text-slate-700"
          >
            物件名
            <span className="ml-1 text-xs font-normal text-red-600">必須</span>
          </label>
          <input
            id="property-name"
            type="text"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="浅草ゲストハウス 101"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
          />
        </div>

        <div>
          <label
            htmlFor="property-address"
            className="block text-sm font-medium text-slate-700"
          >
            住所
            <span className="ml-1 text-xs font-normal text-slate-400">
              (任意)
            </span>
          </label>
          <input
            id="property-address"
            type="text"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            placeholder="東京都台東区浅草 1-2-3"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
          />
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-md bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {submitting ? '保存中...' : isEdit ? '更新' : '追加'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
