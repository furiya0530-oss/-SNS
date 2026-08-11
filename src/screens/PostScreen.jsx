// ────────────────────────────────────────────────
// 【画面2】投稿画面
//
// 入力中の内容（本文・タグ）は、この画面の中だけで state として持ちます。
// 「投稿する」を押したときだけ、親（App）に内容を渡して一覧に追加してもらいます。
// ────────────────────────────────────────────────
import { useState } from 'react'
import { MIN_BODY_LENGTH, MAX_TAGS } from '../constants.js'

/**
 * @param {Function} onSubmit 投稿ボタンが押されたときに呼ぶ関数（App から渡される）
 */
export default function PostScreen({ onSubmit }) {
  // 本文の入力内容
  const [body, setBody] = useState('')
  // 確定したハッシュタグの一覧（例: ['日常', '夜']）
  const [tags, setTags] = useState([])
  // ハッシュタグ入力欄に今打っている途中の文字
  const [tagDraft, setTagDraft] = useState('')

  // 入力から計算できる値は、state にせず毎回その場で計算するのがコツです
  const charCount = body.trim().length
  const isLongEnough = charCount >= MIN_BODY_LENGTH
  const isTagFull = tags.length >= MAX_TAGS
  // 進捗バーの長さ（％）。400字を超えたら 100% で止める
  const progressPercent = Math.min((charCount / MIN_BODY_LENGTH) * 100, 100)

  /** ハッシュタグを1つ追加する */
  function handleAddTag() {
    // 前後の空白と、先頭の「#」を取り除く
    const newTag = tagDraft.trim().replace(/^#+/, '')

    // 空・上限オーバー・重複 のときは追加しない
    if (newTag === '' || isTagFull || tags.includes(newTag)) {
      setTagDraft('')
      return
    }

    setTags([...tags, newTag]) // 既存のタグ + 新しいタグ、で新しい配列を作る
    setTagDraft('') // 入力欄を空に戻す
  }

  /** ハッシュタグを1つ削除する */
  function handleRemoveTag(targetTag) {
    // filter() で「消したいタグ以外」だけを残した新しい配列を作る
    setTags(tags.filter((tag) => tag !== targetTag))
  }

  /** 入力欄で Enter キーが押されたときも、タグを追加できるようにする */
  function handleTagKeyDown(event) {
    if (event.key === 'Enter') {
      event.preventDefault() // フォームが送信されてしまうのを防ぐ
      handleAddTag()
    }
  }

  /** 「日記を投稿する」ボタンが押されたときの処理 */
  function handleSubmit(event) {
    event.preventDefault() // ページのリロードを防ぐ（フォームの既定の動作）

    if (!isLongEnough) return // 念のため、文字数が足りなければ何もしない

    // 親（App）に入力内容を渡す。一覧への追加は App 側が担当。
    onSubmit({ body: body.trim(), tags })

    // 入力欄を空に戻して、次の投稿に備える
    setBody('')
    setTags([])
    setTagDraft('')
  }

  return (
    <>
      <header className="topbar">
        <h1 className="topbar-title">投稿</h1>
        <p className="topbar-sub">今日の出来事を書きとめる</p>
      </header>

      <div className="content">
        <form onSubmit={handleSubmit}>
          {/* ── 本文 ───────────────────────── */}
          <label className="field-label" htmlFor="body-input">
            本文
          </label>
          <textarea
            id="body-input"
            className="editor"
            value={body}
            // 入力されるたびに state を更新する（これで画面の表示も変わる）
            onChange={(event) => setBody(event.target.value)}
            placeholder="今日の出来事、思ったこと、誰にも言えなかったこと──。長い文章ほど、誰かの心に残ります。"
          />

          {/* 文字数カウンター */}
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
          <p className={`char-count ${isLongEnough ? 'ok' : ''}`}>
            {isLongEnough
              ? `${charCount} 字 ・ 投稿できます`
              : `${charCount} / ${MIN_BODY_LENGTH} 字（あと ${MIN_BODY_LENGTH - charCount} 字）`}
          </p>

          {/* ── ハッシュタグ ───────────────── */}
          <label className="field-label" htmlFor="tag-input">
            ハッシュタグ（最大{MAX_TAGS}個 ・ 残り {MAX_TAGS - tags.length} 個）
          </label>
          <div className="hashtag-input">
            {/* 追加済みのタグをチップとして表示。× を押すと削除できる */}
            {tags.map((tag) => (
              <span className="hashtag-chip" key={tag}>
                #{tag}
                <button
                  type="button"
                  className="chip-remove"
                  onClick={() => handleRemoveTag(tag)}
                  aria-label={`${tag} を削除`}
                >
                  ×
                </button>
              </span>
            ))}

            <input
              id="tag-input"
              className="tag-field"
              type="text"
              value={tagDraft}
              onChange={(event) => setTagDraft(event.target.value)}
              onKeyDown={handleTagKeyDown}
              disabled={isTagFull}
              placeholder={isTagFull ? '上限に達しました' : '入力して Enter'}
            />

            <button
              type="button"
              className="tag-add-btn"
              onClick={handleAddTag}
              disabled={isTagFull || tagDraft.trim() === ''}
            >
              ＋ 追加
            </button>
          </div>

          {/* ── 投稿ボタン ─────────────────── */}
          <button type="submit" className="submit-btn" disabled={!isLongEnough}>
            日記を投稿する
          </button>
          {!isLongEnough && (
            <p className="submit-note">
              長文限定のSNSです。{MIN_BODY_LENGTH}字を超えると投稿できます。
            </p>
          )}
        </form>
      </div>
    </>
  )
}
