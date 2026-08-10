// ────────────────────────────────────────────────
// 画面下のタブバー
//
// 今回作ったのは「発見」と「投稿」の2画面だけなので、
// それ以外のタブは押せない状態（準備中）にしてあります。
// 画面を作ったら enabled を true にすれば、そのまま使えます。
// ────────────────────────────────────────────────

// タブの一覧をデータとして持っておくと、JSX 側が短く書けます
const TABS = [
  { id: 'discover', label: '発見', icon: '🔎', enabled: true },
  { id: 'following', label: '追いかけ中', icon: '📖', enabled: false },
  { id: 'post', label: '投稿', icon: '✎', enabled: true },
  { id: 'notification', label: '通知', icon: '🔔', enabled: false },
  { id: 'mypage', label: 'マイページ', icon: '◯', enabled: false },
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
          disabled={!tab.enabled}
          title={tab.enabled ? tab.label : `${tab.label}（準備中）`}
          onClick={() => onChangeTab(tab.id)}
        >
          <span className="tab-icon">{tab.icon}</span>
          <span className="tab-label">{tab.label}</span>
        </button>
      ))}
    </nav>
  )
}
