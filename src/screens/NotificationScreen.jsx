// ────────────────────────────────────────────────
// 【画面4】通知
//
// いいね・フォロー・コメントの通知を新しい順に並べます。
// sampleNotifications.js の固定データを表示するだけの画面です。
// ────────────────────────────────────────────────
import sampleNotifications from '../data/sampleNotifications.js'

// 通知の種類ごとに、表示するアイコンと色（CSSクラス）を決めておく
const ICON_BY_TYPE = {
  heart: '♡',
  follow: '＋',
  comment: '✎',
}

export default function NotificationScreen() {
  return (
    <>
      <header className="topbar">
        <h1 className="topbar-title">通知</h1>
      </header>

      <div className="content">
        {sampleNotifications.map((notif) => (
          <div className="notif" key={notif.id}>
            <div className={`notif-icon notif-icon-${notif.type}`}>{ICON_BY_TYPE[notif.type]}</div>
            <div>
              <p className="notif-text">
                {notif.actor && <b>{notif.actor}</b>}
                {notif.message}
              </p>
              <p className="notif-time">{notif.time}</p>
            </div>
          </div>
        ))}

        {sampleNotifications.length === 0 && (
          <p className="empty-note">通知はまだありません。</p>
        )}
      </div>
    </>
  )
}
