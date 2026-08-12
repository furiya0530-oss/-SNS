import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Vite の設定ファイル。
// plugins に react と tailwindcss を登録することで、
// JSX（HTMLっぽい書き方）と Tailwind のクラスが使えるようになります。
export default defineConfig({
  plugins: [react(), tailwindcss()],
})
