// ────────────────────────────────────────────────
// 日記1件分のカード
//
// 「渡された1件のデータを、どう表示するか」だけを担当します。
// データを書き換える処理（いいねの計算など）は App.jsx 側にあり、
// このコンポーネントは onToggleLike を「呼ぶだけ」です。
// こう分けておくと、部品を他の画面でも使い回せます。
// ────────────────────────────────────────────────
import { useState } from 'react'
import { formatRelativeTime } from '../utils/time.js'

/**
 * @param {object}   post         日記1件のデータ
 * @param {Function} onToggleLike いいねが押されたときに呼ぶ関数
 * @param {Function} onOpenDetail 「コメント」が押されたとき、詳細画面を開くために呼ぶ関数
 */
export default function DiaryCard({ post, onToggleLike, onOpenDetail }) {
  // 本文をすべて表示しているかどうか。最初は折りたたんだ状態（false）。
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <article className="card">
      <div className="card-inner">
        {/* 上段：匿名ペルソナ番号 と 投稿日時 */}
        <div className="card-top">
          <span className="persona">
            読者ペルソナ <b>{post.persona}</b>
          </span>
          <span className="card-date">{formatRelativeTime(post.createdAt)}</span>
        </div>

        {/* 本文。折りたたみ中は clamp クラスで4行までに切り詰める */}
        <div className={`card-text ${isExpanded ? '' : 'clamp'}`}>{post.body}</div>

        <button
          type="button"
          className="read-more"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? '閉じる' : '続きを読む'}
        </button>

        {/* ハッシュタグ。1つも無いときは表示しない */}
        {post.tags.length > 0 && (
          <div className="tags">
            {post.tags.map((tag) => (
              <span className="tag" key={tag}>
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* 下段：いいねボタン */}
        <div className="card-bottom">
          <button
            type="button"
            className={`like-btn ${post.liked ? 'liked' : ''}`}
            // クリックされたら、どの日記かを id で App に伝える
            onClick={() => onToggleLike(post.id)}
            aria-pressed={post.liked}
          >
            <span className="like-icon">{post.liked ? '♥' : '♡'}</span>
            <span className="like-count">{post.likes}</span>
          </button>

          <button type="button" className="comment-count-btn" onClick={() => onOpenDetail(post.id)}>
            <span className="comment-icon">💬</span>
            <span className="comment-count">{post.comments.length}</span>
          </button>
        </div>
      </div>
    </article>
  )
}
