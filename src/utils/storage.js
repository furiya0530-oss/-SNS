// ────────────────────────────────────────────────
// ブラウザの localStorage に日記データを保存・読み込みするための関数
//
// localStorage は「ブラウザに保存される簡易的なデータ置き場」です。
// ここに保存しておくと、ページを閉じたり再読み込みしても
// データが消えずに残るようになります（同じブラウザ・同じ端末限定）。
// ────────────────────────────────────────────────

// 保存先を区別するための名前（他のサイトのデータと混ざらないようにする）
const POSTS_KEY = 'nozokimi-diary/posts'

/**
 * 保存されている日記一覧を読み込む。
 * 保存されていない・壊れている場合は null を返す
 * （呼び出し側で「null ならサンプルデータを使う」という判断をする）。
 */
export function loadPosts() {
  try {
    const raw = localStorage.getItem(POSTS_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return null

    return parsed
  } catch {
    // JSON が壊れている等、何かおかしければ諦めてサンプルデータに戻す
    return null
  }
}

/** 日記一覧を保存する */
export function savePosts(posts) {
  try {
    localStorage.setItem(POSTS_KEY, JSON.stringify(posts))
  } catch {
    // 保存容量オーバーなどで失敗しても、アプリの動作自体は止めない
  }
}
