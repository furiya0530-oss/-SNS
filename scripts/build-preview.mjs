/**
 * デモビルド (dist/) の JS と CSS を 1 枚の HTML に埋め込み、
 * preview/index.html を出力する。
 *
 * 単体ファイルで完結するので、静的ホストや共有リンクにそのまま置ける。
 *
 *   npm run build:preview
 */
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const distDir = path.join(root, 'dist')
const assetsDir = path.join(distDir, 'assets')
const outFile = path.join(root, 'preview', 'index.html')

const assets = await readdir(assetsDir)
const jsFile = assets.find((name) => name.endsWith('.js'))
const cssFile = assets.find((name) => name.endsWith('.css'))

if (!jsFile || !cssFile) {
  throw new Error(
    'dist/assets に JS/CSS が見つかりません。先に `npm run build:demo` を実行してください。',
  )
}

const js = await readFile(path.join(assetsDir, jsFile), 'utf8')
const css = await readFile(path.join(assetsDir, cssFile), 'utf8')

// インライン化した中身が script/style タグを閉じてしまわないようにエスケープする。
const safeJs = js.replaceAll('</script', '<\\/script')
const safeCss = css.replaceAll('</style', '<\\/style')

const html = `<title>民泊備品管理</title>
<style>
${safeCss}
</style>
<div id="root"></div>
<script type="module">
${safeJs}
</script>
`

await mkdir(path.dirname(outFile), { recursive: true })
await writeFile(outFile, html, 'utf8')

const kb = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(1)
console.log(`preview/index.html を出力しました (${kb} KB)`)
