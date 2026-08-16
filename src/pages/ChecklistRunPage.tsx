import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { EmptyState } from '@/components/EmptyState'
import { useChecklistItems } from '@/hooks/useChecklistItems'
import { useChecklistRecords } from '@/hooks/useChecklistRecords'
import type { ChecklistResultInput } from '@/hooks/useChecklistRecords'
import { useChecklists } from '@/hooks/useChecklists'
import { useItems } from '@/hooks/useItems'
import { CHECKLIST_STATUS_LABELS } from '@/types'
import type { ChecklistStatus } from '@/types'
import { ErrorMessage, Loading } from '@/components/Feedback'

interface Answer {
  status: ChecklistStatus | null
  comment: string
  remaining: string
}

const STATUS_ORDER: ChecklistStatus[] = ['ok', 'short', 'broken']

const STATUS_BUTTON_CLASSES: Record<ChecklistStatus, { on: string; off: string }> = {
  ok: {
    on: 'border-green-600 bg-green-600 text-white',
    off: 'border-slate-300 bg-white text-slate-700 hover:bg-green-50',
  },
  short: {
    on: 'border-amber-500 bg-amber-500 text-white',
    off: 'border-slate-300 bg-white text-slate-700 hover:bg-amber-50',
  },
  broken: {
    on: 'border-red-600 bg-red-600 text-white',
    off: 'border-slate-300 bg-white text-slate-700 hover:bg-red-50',
  },
}

/** チェックリスト実施画面 (現場でスマホから使う想定) */
export function ChecklistRunPage() {
  const { propertyId, checklistId } = useParams<{
    propertyId: string
    checklistId: string
  }>()
  const navigate = useNavigate()

  const { checklists } = useChecklists(propertyId)
  const { checklistItems, loading } = useChecklistItems(checklistId)
  const { items } = useItems(propertyId)
  const { submit } = useChecklistRecords(propertyId)

  const [answers, setAnswers] = useState<Record<string, Answer>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checklist = checklists.find((c) => c.id === checklistId)
  const answeredCount = checklistItems.filter(
    (ci) => answers[ci.id]?.status,
  ).length
  const allAnswered =
    checklistItems.length > 0 && answeredCount === checklistItems.length

  function setStatus(checklistItemId: string, status: ChecklistStatus) {
    setAnswers((prev) => ({
      ...prev,
      [checklistItemId]: {
        status,
        comment: prev[checklistItemId]?.comment ?? '',
        remaining: prev[checklistItemId]?.remaining ?? '',
      },
    }))
  }

  function setField(
    checklistItemId: string,
    field: 'comment' | 'remaining',
    value: string,
  ) {
    setAnswers((prev) => ({
      ...prev,
      [checklistItemId]: {
        status: prev[checklistItemId]?.status ?? null,
        comment: prev[checklistItemId]?.comment ?? '',
        remaining: prev[checklistItemId]?.remaining ?? '',
        [field]: value,
      },
    }))
  }

  async function handleSubmit() {
    if (!checklistId) return

    const results: ChecklistResultInput[] = []
    for (const checklistItem of checklistItems) {
      const answer = answers[checklistItem.id]
      if (!answer?.status) {
        setError('すべての項目を選択してください。')
        return
      }

      const remaining =
        answer.status === 'short' && answer.remaining.trim() !== ''
          ? Number(answer.remaining)
          : null

      if (remaining !== null && (!Number.isInteger(remaining) || remaining < 0)) {
        setError('残数は0以上の整数で入力してください。')
        return
      }

      results.push({
        checklist_item_id: checklistItem.id,
        status: answer.status,
        comment: answer.comment.trim() || null,
        remaining_quantity: remaining,
      })
    }

    setSubmitting(true)
    setError(null)
    try {
      await submit(checklistId, results)
      navigate(`/properties/${propertyId}/records`)
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
    <div className="space-y-6">
      <div>
        <Link
          to={`/properties/${propertyId}`}
          className="text-sm text-slate-500 hover:text-slate-900"
        >
          ← 物件詳細
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">
          {checklist?.title ?? 'チェックリスト'}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          各項目の状態を選んでください。({answeredCount} / {checklistItems.length})
        </p>
      </div>

      {loading ? (
        <Loading />
      ) : checklistItems.length === 0 ? (
        <EmptyState>
          このチェックリストには項目がありません。先に項目を追加してください。
        </EmptyState>
      ) : (
        <ul className="space-y-4">
          {checklistItems.map((checklistItem) => {
            const answer = answers[checklistItem.id]
            const linked = items.find((i) => i.id === checklistItem.item_id)
            const needsComment =
              answer?.status === 'short' || answer?.status === 'broken'

            return (
              <li
                key={checklistItem.id}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <p className="font-medium text-slate-900">
                  {checklistItem.label}
                </p>
                {linked && (
                  <p className="mt-0.5 text-xs text-slate-500">
                    備品: {linked.name} (現在 {linked.quantity} / しきい値{' '}
                    {linked.threshold})
                  </p>
                )}

                {/* スマホでも押しやすい大きめのボタン */}
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {STATUS_ORDER.map((status) => {
                    const selected = answer?.status === status
                    const classes = STATUS_BUTTON_CLASSES[status]
                    return (
                      <button
                        key={status}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setStatus(checklistItem.id, status)}
                        className={`rounded-lg border py-3 text-sm font-bold transition-colors ${
                          selected ? classes.on : classes.off
                        }`}
                      >
                        {CHECKLIST_STATUS_LABELS[status]}
                      </button>
                    )
                  })}
                </div>

                {/* 不足のときは残数を聞く */}
                {answer?.status === 'short' && linked && (
                  <div className="mt-3">
                    <label
                      htmlFor={`remaining-${checklistItem.id}`}
                      className="block text-sm font-medium text-slate-700"
                    >
                      現在の残数
                      <span className="ml-1 text-xs font-normal text-slate-400">
                        (任意)
                      </span>
                    </label>
                    <input
                      id={`remaining-${checklistItem.id}`}
                      type="number"
                      min={0}
                      step={1}
                      inputMode="numeric"
                      value={answer.remaining}
                      onChange={(event) =>
                        setField(checklistItem.id, 'remaining', event.target.value)
                      }
                      placeholder={String(Math.max(0, linked.threshold - 1))}
                      className="mt-1 w-32 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      未入力の場合はしきい値を下回る数 (
                      {Math.max(0, linked.threshold - 1)}) で記録します。
                    </p>
                  </div>
                )}

                {/* 不足・破損はコメントを残せる */}
                {needsComment && (
                  <div className="mt-3">
                    <label
                      htmlFor={`comment-${checklistItem.id}`}
                      className="block text-sm font-medium text-slate-700"
                    >
                      コメント
                      <span className="ml-1 text-xs font-normal text-slate-400">
                        (任意)
                      </span>
                    </label>
                    <textarea
                      id={`comment-${checklistItem.id}`}
                      rows={2}
                      value={answer.comment}
                      onChange={(event) =>
                        setField(checklistItem.id, 'comment', event.target.value)
                      }
                      placeholder={
                        answer.status === 'broken'
                          ? '破損の状況を書いてください'
                          : '補充が必要な数量など'
                      }
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                    />
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {error && (
        <ErrorMessage>{error}</ErrorMessage>
      )}

      {checklistItems.length > 0 && (
        <div className="sticky bottom-0 -mx-4 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting || !allAnswered}
            className="w-full rounded-lg bg-slate-900 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-40"
          >
            {submitting
              ? '保存中...'
              : allAnswered
                ? '実施を記録する'
                : `未選択の項目があります (残り ${checklistItems.length - answeredCount})`}
          </button>
        </div>
      )}
    </div>
  )
}
