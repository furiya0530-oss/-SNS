import { useState } from 'react'
import { Modal } from '@/components/Modal'
import { btnPrimary, btnSecondary } from '@/lib/ui'
import { ErrorMessage } from '@/components/Feedback'

interface CreateChecklistDialogProps {
  onSubmit: (title: string) => Promise<void>
  onClose: () => void
}

/** チェックリストを作る最初のダイアログ。作成後は編集画面へ進む。 */
export function CreateChecklistDialog({
  onSubmit,
  onClose,
}: CreateChecklistDialogProps) {
  const [title, setTitle] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) {
      setError('チェックリスト名を入力してください。')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      await onSubmit(trimmed)
      onClose()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '作成に失敗しました。')
      setSubmitting(false)
    }
  }

  return (
    <Modal title="チェックリストを作成" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="checklist-name"
            className="block text-sm font-medium text-slate-700"
          >
            チェックリスト名
            <span className="ml-1 text-xs font-normal text-red-600">必須</span>
          </label>
          <input
            id="checklist-name"
            type="text"
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="チェックアウト後の清掃"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
          />
          <p className="mt-1 text-xs text-slate-500">
            作成後、確認項目を追加する画面に移動します。
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
            {submitting ? '作成中...' : '作成'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
