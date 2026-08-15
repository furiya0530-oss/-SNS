import { useState } from 'react'
import { Modal } from '@/components/Modal'

interface ConfirmDialogProps {
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => Promise<void>
  onClose: () => void
}

/** 取り消せない操作の前に出す確認ダイアログ。 */
export function ConfirmDialog({
  title,
  message,
  confirmLabel = '削除',
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConfirm() {
    setSubmitting(true)
    setError(null)
    try {
      await onConfirm()
      onClose()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '削除に失敗しました。')
      setSubmitting(false)
    }
  }

  return (
    <Modal title={title} onClose={onClose}>
      <p className="text-sm text-slate-600">{message}</p>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          キャンセル
        </button>
        <button
          type="button"
          onClick={() => void handleConfirm()}
          disabled={submitting}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          {submitting ? '削除中...' : confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
