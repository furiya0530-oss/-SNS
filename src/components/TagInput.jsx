// 使用技術などを「タグ」で入力する部品
// 入力して Enter（または カンマ）を押すとタグが追加されます。
import { useState } from 'react'

export default function TagInput({ tags, onChange, placeholder }) {
  const [text, setText] = useState('')

  // タグを追加する
  function addTag() {
    const value = text.trim()
    if (!value) return
    if (tags.includes(value)) {
      // 同じタグは追加しない
      setText('')
      return
    }
    onChange([...tags, value])
    setText('')
  }

  // タグを削除する
  function removeTag(target) {
    onChange(tags.filter((t) => t !== target))
  }

  return (
    <div className="rounded-lg border border-slate-300 p-2 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
      <div className="flex flex-wrap items-center gap-1.5">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="text-blue-400 hover:text-blue-700"
              aria-label={`${tag} を削除`}
            >
              ×
            </button>
          </span>
        ))}

        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            // Enter または カンマ でタグ確定
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault() // フォーム送信を止める
              addTag()
            }
            // 入力が空のとき Backspace で直前のタグを削除
            if (e.key === 'Backspace' && !text && tags.length > 0) {
              removeTag(tags[tags.length - 1])
            }
          }}
          onBlur={addTag} // 入力欄から離れたときも確定
          placeholder={placeholder}
          className="min-w-[8rem] flex-1 px-1 py-1 text-sm outline-none"
        />
      </div>
    </div>
  )
}
