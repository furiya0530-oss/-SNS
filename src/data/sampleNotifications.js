// ────────────────────────────────────────────────
// 「通知」画面で表示するサンプルデータ
//
//   type   … 通知の種類（アイコンと色の出し分けに使う）
//            'heart'（いいね）/ 'follow'（フォロー）/ 'comment'（コメント）
//   actor  … 通知してきた相手（匿名の連番ID）。いない通知もある
//   message… 通知本文
//   time   … 表示用の時刻（本来は投稿時刻から自動計算する想定）
// ────────────────────────────────────────────────

const sampleNotifications = [
  {
    id: 'n1',
    type: 'heart',
    actor: '読者A',
    message: 'があなたの日記にいいねしました',
    time: '12分前',
  },
  {
    id: 'n2',
    type: 'follow',
    actor: null,
    message: '誰かがあなたを追いかけ始めました',
    time: '1時間前',
  },
  {
    id: 'n3',
    type: 'comment',
    actor: '読者C',
    message: 'があなたの日記にコメントしました：「わかります、私も同じ経験が…」',
    time: '3時間前',
  },
  {
    id: 'n4',
    type: 'heart',
    actor: null,
    message: 'お題「忘れられない一日」の投稿に14件のいいねが集まりました',
    time: '昨日',
  },
]

export default sampleNotifications
