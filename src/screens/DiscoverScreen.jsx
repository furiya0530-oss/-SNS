// ────────────────────────────────────────────────
// 【画面1】発見画面
//
// App から受け取った日記の配列を、カード形式で上から順に並べます。
// 自分でデータを持たず、渡されたものを表示するだけのシンプルな画面です。
// ────────────────────────────────────────────────
import DiaryCard from '../components/DiaryCard.jsx'
import { WEEKLY_THEME } from '../constants.js'

/**
 * @param {object[]} posts        表示する日記の配列
 * @param {Function} onToggleLike いいねが押されたときに呼ぶ関数
 * @param {Function} onOpenDetail 日記のコメント欄を開くときに呼ぶ関数
 */
export default function DiscoverScreen({ posts, onToggleLike, onOpenDetail }) {
  // 通報が3件たまって非表示になった日記は、発見画面には出さない
  const visiblePosts = posts.filter((post) => !post.hidden)

  return (
    <>
      {/* 画面上部のタイトル */}
      <header className="topbar">
        <h1 className="topbar-title">発見</h1>
        <p className="topbar-sub">誰かの日記を、こっそり覗く</p>
      </header>

      {/* スクロールする本体部分 */}
      <div className="content">
        {/* 今週のお題バナー（今は表示だけ。絞り込み機能は今後の実装） */}
        <div className="theme-banner">
          <div className="theme-eyebrow">今週のお題</div>
          <div className="theme-title">「{WEEKLY_THEME}」</div>
        </div>

        {/*
          配列を map() で回して、日記1件ごとに DiaryCard を作ります。
          key には他と重複しない値（ここでは id）を必ず渡します。
        */}
        {visiblePosts.map((post) => (
          <DiaryCard key={post.id} post={post} onToggleLike={onToggleLike} onOpenDetail={onOpenDetail} />
        ))}

        {/* 1件も無いときの案内 */}
        {visiblePosts.length === 0 && (
          <p className="empty-note">まだ日記がありません。最初の1本を書いてみませんか。</p>
        )}
      </div>
    </>
  )
}
