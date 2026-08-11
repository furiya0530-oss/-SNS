// ────────────────────────────────────────────────
// アプリ全体をまとめる一番親のコンポーネント
//
// このファイルの役割は大きく2つです。
//   1. 日記データ（posts）を state として持ち、増やしたり更新したりする
//      （ブラウザの localStorage にも保存し、再読み込みしても消えないようにする）
//   2. 今どの画面（タブ）を表示するかを切り替える
//
// 「データを持つ場所」を App に集約しておくと、
// 各画面から同じデータを扱えます。
// ────────────────────────────────────────────────
import { useState, useEffect } from 'react'

import PhoneFrame from './components/PhoneFrame.jsx'
import TabBar from './components/TabBar.jsx'
import DiaryDetailSheet from './components/DiaryDetailSheet.jsx'
import DiscoverScreen from './screens/DiscoverScreen.jsx'
import PostScreen from './screens/PostScreen.jsx'
import FollowingScreen from './screens/FollowingScreen.jsx'
import NotificationScreen from './screens/NotificationScreen.jsx'
import MyPageScreen from './screens/MyPageScreen.jsx'
import samplePosts from './data/samplePosts.js'
import { loadPosts, savePosts } from './utils/storage.js'
import { COMMENT_RIGHT_POST_THRESHOLD, REPORT_HIDE_THRESHOLD } from './constants.js'

/** ログイン機能ができるまでの、仮の「自分」の匿名ペルソナ番号 */
const MY_PERSONA = '#0847'

export default function App() {
  // 【state その1】日記の一覧。
  //
  // useState に「値」ではなく「関数」を渡すと、React は最初の1回だけ
  // その関数を実行して初期値を決めます（これを「遅延初期化」と呼びます）。
  // ここでは「localStorage に保存済みのデータがあればそれを使い、
  // 無ければサンプルデータを使う」という判断をしています。
  const [posts, setPosts] = useState(() => loadPosts() ?? samplePosts)

  // 【state その2】今表示しているタブ
  const [activeTab, setActiveTab] = useState('discover')

  // 【state その3】詳細画面（コメント欄）を開いている日記の id。
  // null のときは詳細画面を閉じている状態を表す。
  const [openPostId, setOpenPostId] = useState(null)

  // posts が変化するたびに、localStorage へ保存し直す。
  // こうしておくことで、投稿やいいねの結果がページ再読み込み後も残る。
  useEffect(() => {
    savePosts(posts)
  }, [posts])

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
      comments: [],
      stamps: { heart: 0, cry: 0, sparkle: 0 },
      reportCount: 0,
      hidden: false,
    }

    // 新しい日記を配列の「先頭」に足して、一覧の一番上に表示させる
    setPosts((currentPosts) => [newPost, ...currentPosts])

    // 投稿し終わったら発見画面へ移動して、反映された結果を見せる
    setActiveTab('discover')
  }

  /** コメントを1件追加する（コメント権がある人だけが呼び出せる想定） */
  function handleAddComment(postId, body) {
    const newComment = {
      id: `comment-${Date.now()}`,
      // このアプリには複数ユーザーのログインが無いので、
      // 自分のコメントには固定で「あなた」というラベルを付ける
      author: 'あなた',
      body,
      createdAt: Date.now(),
    }

    setPosts((currentPosts) =>
      currentPosts.map((post) =>
        post.id === postId ? { ...post, comments: [...post.comments, newComment] } : post,
      ),
    )
  }

  /** スタンプ（🤍 😢 ✨）を押したときの処理。押すたびに1増える */
  function handleAddStamp(postId, stampType) {
    setPosts((currentPosts) =>
      currentPosts.map((post) =>
        post.id === postId
          ? { ...post, stamps: { ...post.stamps, [stampType]: post.stamps[stampType] + 1 } }
          : post,
      ),
    )
  }

  /**
   * 通報ボタンが押されたときの処理。
   * 通報が REPORT_HIDE_THRESHOLD 件たまったら、一覧から自動的に隠す
   * （仕様書どおり、削除ではなく「運営確認待ち」の非表示状態にする）。
   */
  function handleReportPost(postId) {
    setPosts((currentPosts) =>
      currentPosts.map((post) => {
        if (post.id !== postId) return post

        const reportCount = post.reportCount + 1
        return {
          ...post,
          reportCount,
          hidden: reportCount >= REPORT_HIDE_THRESHOLD,
        }
      }),
    )
  }

  // マイページで使う「自分の投稿数」。posts の中から自分のものだけ数える
  const myPostCount = posts.filter((post) => post.persona === MY_PERSONA).length

  // 仕様書のルール：累計5本投稿するとコメント権がもらえる
  const hasCommentRight = myPostCount >= COMMENT_RIGHT_POST_THRESHOLD

  // 詳細画面を開いている日記のデータ本体（開いていなければ undefined）
  const openPost = posts.find((post) => post.id === openPostId)

  return (
    <PhoneFrame>
      {/* activeTab の値によって、表示する画面を切り替える */}
      {activeTab === 'discover' && (
        <DiscoverScreen posts={posts} onToggleLike={handleToggleLike} onOpenDetail={setOpenPostId} />
      )}
      {activeTab === 'following' && <FollowingScreen />}
      {activeTab === 'post' && <PostScreen onSubmit={handleAddPost} />}
      {activeTab === 'notification' && <NotificationScreen />}
      {activeTab === 'mypage' && (
        <MyPageScreen myPersona={MY_PERSONA} myPostCount={myPostCount} />
      )}

      {/* 画面下のタブバー（常に表示） */}
      <TabBar activeTab={activeTab} onChangeTab={setActiveTab} />

      {/* 日記の詳細（コメント欄）。openPost があるときだけ、上に重ねて表示する */}
      {openPost && (
        <DiaryDetailSheet
          post={openPost}
          hasCommentRight={hasCommentRight}
          onClose={() => setOpenPostId(null)}
          onToggleLike={handleToggleLike}
          onAddComment={handleAddComment}
          onAddStamp={handleAddStamp}
          onReport={handleReportPost}
        />
      )}
    </PhoneFrame>
  )
}
