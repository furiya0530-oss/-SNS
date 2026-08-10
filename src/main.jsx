// ────────────────────────────────────────────────
// アプリの入口（エントリーポイント）
// index.html の <div id="root"> の中に、App コンポーネントを描画します。
// 基本的にこのファイルを編集することはあまりありません。
// ────────────────────────────────────────────────
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles.css' // アプリ全体の見た目（CSS）を読み込む

ReactDOM.createRoot(document.getElementById('root')).render(
  // StrictMode は開発中のミスを見つけやすくしてくれる React の機能です
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
