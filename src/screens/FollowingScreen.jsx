// ────────────────────────────────────────────────
// 【画面3】追いかけ中
//
// フォローした相手の一覧を、「新着あり」と「最近更新なし」に分けて表示します。
// ログイン機能がまだ無いので、一覧の中身は sampleFollowing.js の固定データです。
// ────────────────────────────────────────────────
import sampleFollowing from '../data/sampleFollowing.js'

// 仕様どおり、正確な人数ではなく「だいたい〜人」というゆるい表現にする
const APPROX_FOLLOWING_COUNT = 18

export default function FollowingScreen() {
  // status が 'active' のものと 'quiet' のものに仕分けする
  const activeList = sampleFollowing.filter((f) => f.status === 'active')
  const quietList = sampleFollowing.filter((f) => f.status === 'quiet')

  return (
    <>
      <header className="topbar">
        <h1 className="topbar-title">追いかけ中</h1>
        <p className="topbar-sub">だいたい {APPROX_FOLLOWING_COUNT}人 を追いかけています</p>
      </header>

      <div className="content">
        <p className="section-label">新着</p>
        {activeList.map((person) => (
          <div className="follow-row" key={person.id}>
            <div className="avatar">{person.avatarLetter}</div>
            <div className="follow-meta">
              <div className="follow-name">{person.persona}</div>
              <div className="follow-snippet">{person.snippet}</div>
            </div>
            {person.hasUnread && <div className="new-dot" />}
          </div>
        ))}

        <p className="section-label section-label-spaced">今週は更新なし</p>
        {quietList.map((person) => (
          <div className="follow-row" key={person.id}>
            <div className="avatar avatar-quiet">{person.avatarLetter}</div>
            <div className="follow-meta">
              <div className="follow-name">{person.persona}</div>
              <div className="follow-snippet follow-snippet-quiet">
                最終更新から{person.daysSinceUpdate}日
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
