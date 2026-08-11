// ────────────────────────────────────────────────
// 日記の詳細（コメント欄）を表示する、下からせり上がるシート
//
// 発見画面でカードの「💬 コメント」を押すと、この画面が
// 画面の下から重なるように表示されます（React では、こういう
// 「常に画面の一番上に重ねて出す部品」を作るとき、単に他の要素の
// 後ろに置いて position:absolute で重ねる、という単純な方法で十分です）。
//
// 仕様書のルール：
//   ・コメントできるのは「コメント権」がある人だけ（累計5本投稿で獲得）
//   ・コメント権が無い人は、スタンプ（🤍 😢 ✨）だけ使える
//   ・通報が3件たまると、その日記は一覧から自動的に隠れる
// ────────────────────────────────────────────────
import { useState } from 'react'
import { formatRelativeTime } from '../utils/time.js'

// スタンプの種類と、表示する絵文字・呼び名の対応表
const STAMP_TYPES = [
  { key: 'heart', icon: '🤍' },
  { key: 'cry', icon: '😢' },
  { key: 'sparkle', icon: '✨' },
]

/**
 * @param {object}   post             表示する日記（コメント・スタンプなどを含む）
 * @param {boolean}  hasCommentRight  自分にコメント権があるかどうか
 * @param {Function} onClose          閉じるときに呼ぶ
 * @param {Function} onToggleLike     いいねボタンが押されたときに呼ぶ
 * @param {Function} onAddComment     コメント送信時に呼ぶ (postId, body)
 * @param {Function} onAddStamp       スタンプが押されたときに呼ぶ (postId, stampType)
 * @param {Function} onReport         通報リンクが押されたときに呼ぶ (postId)
 */
export default function DiaryDetailSheet({
  post,
  hasCommentRight,
  onClose,
  onToggleLike,
  onAddComment,
  onAddStamp,
  onReport,
}) {
  // コメント入力欄の内容
  const [commentDraft, setCommentDraft] = useState('')
  // このシートを開いている間に、自分が通報ボタンを押したかどうか
  // （連打で何件も通報できてしまわないようにするための、簡易的な仕組み）
  const [hasReported, setHasReported] = useState(false)

  function handleSubmitComment(event) {
    event.preventDefault()
    const trimmed = commentDraft.trim()
    if (trimmed === '') return

    onAddComment(post.id, trimmed)
    setCommentDraft('')
  }

  function handleReportClick() {
    onReport(post.id)
    setHasReported(true)
  }

  return (
    // オーバーレイの外側（暗い部分）をクリックしても閉じられるようにする
    <div className="detail-overlay" onClick={onClose}>
      {/* シート自体のクリックは、オーバーレイまで伝わせない（閉じてしまわないように） */}
      <div className="detail-sheet" onClick={(event) => event.stopPropagation()}>
        <div className="sheet-handle" />

        <div className="persona-row">
          <span className="persona">
            読者ペルソナ <b>{post.persona}</b>
          </span>
          <span className="card-date">{formatRelativeTime(post.createdAt)}</span>
        </div>

        {/* 発見画面のカードと違い、ここでは全文をそのまま表示する（折りたたまない） */}
        <p className="card-text">{post.body}</p>

        {post.tags.length > 0 && (
          <div className="tags">
            {post.tags.map((tag) => (
              <span className="tag" key={tag}>
                #{tag}
              </span>
            ))}
          </div>
        )}

        <div className="card-bottom">
          <button
            type="button"
            className={`like-btn ${post.liked ? 'liked' : ''}`}
            onClick={() => onToggleLike(post.id)}
            aria-pressed={post.liked}
          >
            <span className="like-icon">{post.liked ? '♥' : '♡'}</span>
            <span className="like-count">{post.likes}</span>
          </button>

          {/* スタンプはコメント権の有無に関わらず、誰でも押せる軽いリアクション */}
          <div className="stamp-row">
            {STAMP_TYPES.map((stamp) => (
              <button
                type="button"
                className="stamp-btn"
                key={stamp.key}
                onClick={() => onAddStamp(post.id, stamp.key)}
              >
                {stamp.icon} <span className="stamp-count">{post.stamps[stamp.key]}</span>
              </button>
            ))}
          </div>
        </div>

        <p className="divider-label">コメント {post.comments.length}件</p>

        {post.comments.map((comment) => (
          <div className="comment-row" key={comment.id}>
            <span className="comment-stamp">{comment.author}</span>
            <p className="comment-body">{comment.body}</p>
          </div>
        ))}

        {hasCommentRight ? (
          <form className="comment-composer" onSubmit={handleSubmitComment}>
            <textarea
              className="comment-input"
              value={commentDraft}
              onChange={(event) => setCommentDraft(event.target.value)}
              placeholder="コメントを書く"
            />
            <button type="submit" className="comment-submit-btn" disabled={commentDraft.trim() === ''}>
              送信
            </button>
          </form>
        ) : (
          <div className="stamp-only-note">
            🔒 コメントは投稿を続けている読者のみ。あなたはスタンプで応援できます。
          </div>
        )}

        <button
          type="button"
          className="report-link"
          onClick={handleReportClick}
          disabled={hasReported || post.hidden}
        >
          ⚑{' '}
          {post.hidden
            ? 'この日記は通報により非表示になっています'
            : hasReported
              ? '通報しました'
              : 'この日記を通報する'}
        </button>
      </div>
    </div>
  )
}
