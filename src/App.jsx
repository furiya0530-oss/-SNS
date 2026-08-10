// ────────────────────────────────────────────────
// アプリ全体をまとめる一番親のコンポーネント
//
// このファイルの役割は大きく2つです。
//   1. 日記データ（posts）を state として持ち、増やしたり更新したりする
//   2. 今どの画面（タブ）を表示するかを切り替える
//
// 「データを持つ場所」を App に集約しておくと、
// 発見画面と投稿画面の両方から同じデータを扱えます。
// ────────────────────────────────────────────────
import { useState } from 'react'

import PhoneFrame from './components/PhoneFrame.jsx'
import TabBar from './components/TabBar.jsx'
import DiscoverScreen from './screens/DiscoverScreen.jsx'
import PostScreen from './screens/PostScreen.jsx'
import samplePosts from './data/samplePosts.js'

/** ログイン機能ができるまでの、仮の「自分」の匿名ペルソナ番号 */
const MY_PERSONA = '#0847'

export default function App() {
  // 【state その1】日記の一覧。最初はサンプルデータが入っている。
  //   posts     … 今の日記一覧（配列）
  //   setPosts  … 日記一覧を新しい内容に差し替える関数
  const [posts, setPosts] = useState(samplePosts)

  // 【state その2】今表示しているタブ（'discover' か 'post'）
  const [activeTab, setActiveTab] = useState('discover')

  /**
   * いいねボタンが押されたときの処理。
   * 押すたびに「いいね済み ⇄ 未いいね」が切り替わり、数もそれに合わせて増減します。
   *
   * ポイント：React では配列を直接書き換えず、
   * map() で「新しい配列」を作って setPosts に渡します。
   * そうしないと React が変化に気づけず、画面が更新されません。
   */
  function handleToggleLike(postId) {
    setPosts((currentPosts) =>
      currentPosts.map((post) => {
        // 押された日記以外は、そのまま返す
        if (post.id !== postId) return post

        // 押された日記だけ、いいね状態を反転させたコピーを作って返す
        return {
          ...post,
          liked: !post.liked,
          likes: post.liked ? post.likes - 1 : post.likes + 1,
        }
      }),
    )
  }

  /**
   * 投稿画面から呼ばれる、新しい日記を追加する処理。
   *
   * @param {{ body: string, tags: string[] }} draft 投稿画面で入力された内容
   */
  function handleAddPost({ body, tags }) {
    const newPost = {
      // id は重複しなければ何でもよいので、投稿時刻をそのまま使う
      id: `post-${Date.now()}`,
      persona: MY_PERSONA,
      body,
      tags,
      createdAt: Date.now(),
      likes: 0,
      liked: false,
    }

    // 新しい日記を配列の「先頭」に足して、一覧の一番上に表示させる
    setPosts((currentPosts) => [newPost, ...currentPosts])

    // 投稿し終わったら発見画面へ移動して、反映された結果を見せる
    setActiveTab('discover')
  }

  return (
    <PhoneFrame>
      {/* activeTab の値によって、表示する画面を切り替える */}
      {activeTab === 'discover' && (
        <DiscoverScreen posts={posts} onToggleLike={handleToggleLike} />
      )}
      {activeTab === 'post' && <PostScreen onSubmit={handleAddPost} />}

      {/* 画面下のタブバー（常に表示） */}
      <TabBar activeTab={activeTab} onChangeTab={setActiveTab} />
    </PhoneFrame>
  )
}
