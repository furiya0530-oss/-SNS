import { useState } from 'react'
import { Modal } from '@/components/Modal'
import { btnDanger, btnSecondary } from '@/lib/ui'

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
          className={btnSecondary}
        >
          キャンセル
        </button>
        <button
          type="button"
          onClick={() => void handleConfirm()}
          disabled={submitting}
          className={btnDanger}
        >
          {submitting ? '削除中...' : confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
