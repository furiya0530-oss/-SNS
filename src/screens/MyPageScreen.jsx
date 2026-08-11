// ────────────────────────────────────────────────
// 【画面5】マイページ
//
// 自分のペルソナ情報と、コメント権の進捗、設定メニューを表示します。
// 投稿数（myPostCount）だけは App.jsx の実際のデータから受け取り、
// それ以外（フォロワー数など）はログイン機能が無いので固定値です。
// ────────────────────────────────────────────────
import { COMMENT_RIGHT_POST_THRESHOLD, APPROX_FOLLOWER_COUNT } from '../constants.js'

// 設定メニューの項目名だけを並べたもの。
// まだ対応する画面が無いので、押しても何も起きない見た目だけの一覧です。
const SETTINGS_ITEMS = ['自分の投稿一覧', '通報履歴', 'ブロックリスト', 'お題を提案する', 'アカウント設定']

/**
 * @param {string} myPersona    自分の匿名ペルソナ番号（例: '#0847'）
 * @param {number} myPostCount  自分が投稿した日記の数
 */
export default function MyPageScreen({ myPersona, myPostCount }) {
  const hasCommentRight = myPostCount >= COMMENT_RIGHT_POST_THRESHOLD
  const progressPercent = Math.min((myPostCount / COMMENT_RIGHT_POST_THRESHOLD) * 100, 100)

  return (
    <>
      <header className="topbar">
        <h1 className="topbar-title">マイページ</h1>
      </header>

      <div className="content">
        <div className="profile-head">
          <div className="profile-avatar">◯</div>
          <div>
            <div className="profile-name">読者ペルソナ {myPersona}</div>
            <div className="profile-meta">
              投稿 {myPostCount}本 ・ だいたい {APPROX_FOLLOWER_COUNT}人 が追いかけています
            </div>
          </div>
        </div>

        <div className="status-card">
          <div className="status-title">コメント権ステータス</div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
          <p className="status-note">
            {hasCommentRight
              ? `獲得済み（累計${myPostCount}本投稿）`
              : `獲得まであと${COMMENT_RIGHT_POST_THRESHOLD - myPostCount}本（累計${myPostCount}本投稿）`}
          </p>
        </div>

        <p className="section-label">設定</p>
        {SETTINGS_ITEMS.map((label) => (
          <div className="settings-row" key={label}>
            <span>{label}</span>
            <span className="chev">›</span>
          </div>
        ))}
      </div>
    </>
  )
}
