// Vite（開発サーバー＆ビルドツール）の設定ファイル。
// React を使うためのプラグインを読み込んでいるだけの、最小構成です。
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  plugins: [react()],
  // GitHub Pages はリポジトリ名のサブパス（/-SNS/）に公開されるため、
  // ビルド時だけ base を切り替える。開発サーバー（npm run dev）には影響しない。
  base: command === 'build' ? '/-SNS/' : '/',
}))
