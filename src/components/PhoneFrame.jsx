// ────────────────────────────────────────────────
// スマホの外枠を描くだけの、見た目専用コンポーネント
//
// ワイヤーフレームの「スマホ風の枠 + 上のステータスバー」を再現しています。
// children には、中に表示したい画面（発見画面や投稿画面）が入ります。
// ────────────────────────────────────────────────
export default function PhoneFrame({ children }) {
  return (
    <div className="phone">
      <div className="screen">
        {/* スマホ上部の時刻とアプリ名（見た目だけの飾り） */}
        <div className="statusbar">
          <span>9:41</span>
          <span>のぞきみ日記</span>
        </div>

        {/* ここに各画面が入る */}
        {children}
      </div>
    </div>
  )
}
