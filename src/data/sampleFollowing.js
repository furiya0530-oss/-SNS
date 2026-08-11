// ────────────────────────────────────────────────
// 「追いかけ中」画面で表示するサンプルデータ
//
// 本来はフォローしている相手の一覧をサーバーから取得しますが、
// ログイン機能がまだ無いので、ここに直接書いています。
//
//   avatarLetter … アイコンに表示する1文字（ペルソナ番号は数字だけで
//                  見分けにくいため、A・B・C…と割り振っている）
//   status      … 'active'（最近も投稿している）/ 'quiet'（最近投稿がない）
//   hasUnread   … 新着があるかどうか（'active' のときだけ意味を持つ）
//   snippet     … 最新の日記の冒頭（一覧でちらっと見せる用）
//   daysSinceUpdate … 最終更新からの日数（'quiet' のときだけ使う）
// ────────────────────────────────────────────────

const sampleFollowing = [
  {
    id: 'f1',
    persona: '#0472',
    avatarLetter: 'A',
    status: 'active',
    hasUnread: true,
    snippet: '今日は久しぶりに祖母の家に行った。庭の紫陽花が…',
  },
  {
    id: 'f2',
    persona: '#2210',
    avatarLetter: 'B',
    status: 'active',
    hasUnread: true,
    snippet: '深夜3時、まだ眠れない。こういう夜は決まって…',
  },
  {
    id: 'f3',
    persona: '#0093',
    avatarLetter: 'C',
    status: 'active',
    hasUnread: false,
    snippet: '引っ越しの荷造りをしていたら、昔の手紙が出てきた',
  },
  {
    id: 'f4',
    persona: '#1120',
    avatarLetter: 'D',
    status: 'quiet',
    daysSinceUpdate: 9,
  },
  {
    id: 'f5',
    persona: '#3387',
    avatarLetter: 'E',
    status: 'quiet',
    daysSinceUpdate: 14,
  },
]

export default sampleFollowing
