import { useState } from 'react'
import { Modal } from '@/components/Modal'
import type { ChecklistItemInput } from '@/hooks/useChecklistItems'
import type { ChecklistItem, Item } from '@/types'

interface ChecklistItemFormDialogProps {
  checklistItem: ChecklistItem
  items: Item[]
  onSubmit: (input: ChecklistItemInput) => Promise<void>
  onClose: () => void
}

export function ChecklistItemFormDialog({
  checklistItem,
  items,
  onSubmit,
  onClose,
}: ChecklistItemFormDialogProps) {
  const [label, setLabel] = useState(checklistItem.label)
  const [itemId, setItemId] = useState(checklistItem.item_id ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const trimmed = label.trim()
    if (!trimmed) {
      setError('項目名を入力してください。')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      await onSubmit({ label: trimmed, item_id: itemId || null })
      onClose()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '保存に失敗しました。')
      setSubmitting(false)
    }
  }

  const inputClass =
    'mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900'

  return (
    <Modal title="項目を編集" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="edit-label"
            className="block text-sm font-medium text-slate-700"
          >
            項目名
          </label>
          <input
            id="edit-label"
            type="text"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label
            htmlFor="edit-item"
            className="block text-sm font-medium text-slate-700"
          >
            紐づける備品
          </label>
          <select
            id="edit-item"
            value={itemId}
            onChange={(event) => setItemId(event.target.value)}
            className={inputClass}
          >
            <option value="">紐づけない (自由項目)</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">
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
            {submitting ? '保存中...' : '更新'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
