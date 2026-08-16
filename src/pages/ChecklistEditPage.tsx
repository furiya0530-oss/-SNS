import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChecklistItemFormDialog } from '@/components/ChecklistItemFormDialog'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { EmptyState } from '@/components/EmptyState'
import { useChecklistItems } from '@/hooks/useChecklistItems'
import { useChecklists } from '@/hooks/useChecklists'
import { useItems } from '@/hooks/useItems'
import type { ChecklistItem } from '@/types'
import { btnPrimary, btnSecondary, btnSmallDanger, btnSmallGhost } from '@/lib/ui'
import { ErrorMessage, Loading } from '@/components/Feedback'

/** チェックリスト(テンプレート)の編集画面 */
export function ChecklistEditPage() {
  const { propertyId, checklistId } = useParams<{
    propertyId: string
    checklistId: string
  }>()
  const navigate = useNavigate()

  const { checklists, update: updateChecklist } = useChecklists(propertyId)
  const { items } = useItems(propertyId)
  const {
    checklistItems,
    loading,
    error,
    create,
    update,
    remove,
  } = useChecklistItems(checklistId)

  const checklist = checklists.find((c) => c.id === checklistId)

  const [title, setTitle] = useState<string | null>(null)
  const [newLabel, setNewLabel] = useState('')
  const [newItemId, setNewItemId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [editing, setEditing] = useState<ChecklistItem | null>(null)
  const [deleting, setDeleting] = useState<ChecklistItem | null>(null)

  const titleValue = title ?? checklist?.title ?? ''

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault()
    const label = newLabel.trim()
    if (!label) {
      setFormError('項目名を入力してください。')
      return
    }

    setSubmitting(true)
    setFormError(null)
    try {
      await create({ label, item_id: newItemId || null })
      setNewLabel('')
      setNewItemId('')
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : '追加に失敗しました。')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSaveTitle() {
    if (!checklistId) return
    const trimmed = titleValue.trim()
    if (!trimmed || trimmed === checklist?.title) return
    await updateChecklist(checklistId, trimmed)
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          to={`/properties/${propertyId}`}
          className="text-sm text-slate-500 hover:text-slate-900"
        >
          ← 物件詳細
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">
          チェックリストの編集
        </h1>
      </div>

      {/* タイトル */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <label
          htmlFor="checklist-title"
          className="block text-sm font-medium text-slate-700"
        >
          チェックリスト名
        </label>
        <div className="mt-1 flex gap-2">
          <input
            id="checklist-title"
            type="text"
            value={titleValue}
            onChange={(event) => setTitle(event.target.value)}
            onBlur={() => void handleSaveTitle()}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
          />
        </div>
        <p className="mt-1 text-xs text-slate-500">
          入力欄からフォーカスが外れると保存されます。
        </p>
      </div>

      {/* 項目の追加 */}
      <form
        onSubmit={handleAdd}
        className="space-y-3 rounded-xl border border-slate-200 bg-white p-5"
      >
        <h2 className="font-semibold text-slate-900">確認項目を追加</h2>

        <div>
          <label
            htmlFor="new-label"
            className="block text-sm font-medium text-slate-700"
          >
            項目名
          </label>
          <input
            id="new-label"
            type="text"
            value={newLabel}
            onChange={(event) => setNewLabel(event.target.value)}
            placeholder="バスタオルが4枚あるか"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
          />
        </div>

        <div>
          <label
            htmlFor="new-item"
            className="block text-sm font-medium text-slate-700"
          >
            紐づける備品
            <span className="ml-1 text-xs font-normal text-slate-400">
              (任意)
            </span>
          </label>
          <select
            id="new-item"
            value={newItemId}
            onChange={(event) => setNewItemId(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
          >
            <option value="">紐づけない (自由項目)</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-500">
            紐づけると、実施時に「不足」を選んだときに在庫数量へ反映されます。
          </p>
        </div>

        {formError && (
          <ErrorMessage>{formError}</ErrorMessage>
        )}

        <button
          type="submit"
          disabled={submitting}
          className={btnPrimary}
        >
          {submitting ? '追加中...' : '項目を追加'}
        </button>
      </form>

      {/* 項目一覧 */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">
          確認項目 ({checklistItems.length})
        </h2>

        {error && (
          <ErrorMessage>{error}</ErrorMessage>
        )}

        {loading ? (
          <Loading />
        ) : checklistItems.length === 0 ? (
          <EmptyState>
            まだ項目がありません。上のフォームから追加してください。
          </EmptyState>
        ) : (
          <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
            {checklistItems.map((checklistItem) => {
              const linked = items.find((i) => i.id === checklistItem.item_id)
              return (
                <li
                  key={checklistItem.id}
                  className="flex items-center justify-between gap-4 px-5 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">
                      {checklistItem.label}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {linked ? `備品: ${linked.name}` : '自由項目'}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => setEditing(checklistItem)}
                      className={btnSmallGhost}
                    >
                      編集
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleting(checklistItem)}
                      className={btnSmallDanger}
                    >
                      削除
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {checklistItems.length > 0 && (
        <button
          type="button"
          onClick={() =>
            navigate(`/properties/${propertyId}/checklists/${checklistId}/run`)
          }
          className={btnSecondary}
        >
          このチェックリストを実施する
        </button>
      )}

      {editing && (
        <ChecklistItemFormDialog
          checklistItem={editing}
          items={items}
          onSubmit={async (input) => {
            await update(editing.id, input)
          }}
          onClose={() => setEditing(null)}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="項目を削除"
          message={`「${deleting.label}」を削除します。過去の実施記録も一緒に削除されます。`}
          onConfirm={() => remove(deleting.id)}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  )
}
