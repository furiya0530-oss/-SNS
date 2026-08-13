// ============================================
// 「1ファイル版」を作るスクリプト
//
// npm run build で作られる dist フォルダは、
//   index.html + assets/○○.js + assets/○○.css
// の3つに分かれています。
//
// この状態のまま index.html をダブルクリックしても、
// ブラウザの安全上のルール（file:// からは JavaScript モジュールを
// 読み込めない）で真っ白になってしまいます。
//
// そこで CSS と JavaScript を index.html の中に埋め込んで、
// 1個のHTMLファイル（dist/standalone.html）にまとめます。
// このファイルはダブルクリックするだけでブラウザで開けます。
// ============================================

import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const distDir = 'dist'
const assetsDir = join(distDir, 'assets')

// dist/assets の中から .js と .css のファイル名を探す
const files = readdirSync(assetsDir)
const jsFile = files.find((f) => f.endsWith('.js'))
const cssFile = files.find((f) => f.endsWith('.css'))

if (!jsFile || !cssFile) {
  console.error('先に `npm run build` を実行してください。')
  process.exit(1)
}

const js = readFileSync(join(assetsDir, jsFile), 'utf8')
const css = readFileSync(join(assetsDir, cssFile), 'utf8')

// HTMLの中にJavaScriptを書くとき、文字列に "</script>" が含まれていると
// そこでスクリプトが終わったと誤解されるため、安全な形に置き換えます。
const safeJs = js.replaceAll('</script', '<\\/script')

const html = `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>100個アプリ制作チャレンジ管理</title>
    <style>${css}</style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module">${safeJs}</script>
  </body>
</html>
`

const outPath = join(distDir, 'standalone.html')
writeFileSync(outPath, html)

console.log(`✅ 1ファイル版を作りました: ${outPath}`)
console.log('   このファイルをダブルクリックするとブラウザで開けます。')
