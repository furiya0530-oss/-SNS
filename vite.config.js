// Vite（開発サーバー＆ビルドツール）の設定ファイル。
// React を使うためのプラグインを読み込んでいるだけの、最小構成です。
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
