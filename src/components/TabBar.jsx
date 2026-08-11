// ────────────────────────────────────────────────
// 画面下のタブバー
//
// 5つのタブすべてに画面が用意されているので、どれでも押せます。
// ────────────────────────────────────────────────

// タブの一覧をデータとして持っておくと、JSX 側が短く書けます
const TABS = [
  { id: 'discover', label: '発見', icon: '🔎' },
  { id: 'following', label: '追いかけ中', icon: '📖' },
  { id: 'post', label: '投稿', icon: '✎' },
  { id: 'notification', label: '通知', icon: '🔔' },
  { id: 'mypage', label: 'マイページ', icon: '◯' },
]

/**
 * @param {string}   activeTab   今選ばれているタブの id
 * @param {Function} onChangeTab タブが押されたときに呼ぶ関数（App から渡される）
 */
export default function TabBar({ activeTab, onChangeTab }) {
  return (
    <nav className="tabbar">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          // 選択中のタブには active クラスを付けて色を変える
          className={`tab ${activeTab === tab.id ? 'active' : ''}`}
          title={tab.label}
          onClick={() => onChangeTab(tab.id)}
        >
          <span className="tab-icon">{tab.icon}</span>
          <span className="tab-label">{tab.label}</span>
        </button>
      ))}
    </nav>
  )
}
