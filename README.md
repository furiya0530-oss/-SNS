# 民泊備品管理アプリ

民泊物件の備品・在庫を管理するための Web アプリです。

## 技術構成

| 領域 | 使用技術 |
| --- | --- |
| フロントエンド | React 19 + Vite + TypeScript |
| スタイリング | Tailwind CSS v4 (`@tailwindcss/vite`) |
| ルーティング | React Router |
| バックエンド / DB / 認証 | Supabase (`@supabase/supabase-js`) |
| 決済 | Stripe (サブスクリプション、フェーズ2で実装) |
| ホスティング | Vercel (想定) |

## セットアップ

```bash
# 1. 依存パッケージをインストール
npm install

# 2. 環境変数を設定
cp .env.example .env.local
#    .env.local を開いて Supabase の URL と anon キーを入力

# 3. 開発サーバーを起動 (http://localhost:5173)
npm run dev
```

Supabase の URL と anon キーは、Supabase ダッシュボードの
**Project Settings > API** から取得できます。

## npm スクリプト

| コマンド | 内容 |
| --- | --- |
| `npm run dev` | 開発サーバーを起動 |
| `npm run build` | 型チェック + 本番ビルド (`dist/`) |
| `npm run preview` | ビルド結果をローカルで確認 |
| `npm run lint` | oxlint による静的解析 |

## フォルダ構成

```
src/
  components/   共通 UI コンポーネント (Layout, ProtectedRoute など)
  pages/        ルーティング単位の画面
  lib/          Supabase クライアントなどの外部サービス連携
  types/        TypeScript の型定義
  hooks/        カスタムフック (useSession など)
```

`@/` は `src/` へのエイリアスです (`vite.config.ts` と `tsconfig.app.json` で設定)。

## 環境変数

`.env.example` にキー名のみを記載しています。実際の値は `.env.local` に書き、
コミットしないでください (`.gitignore` 済み)。

| 変数名 | 用途 |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase プロジェクトの URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase の anon (public) キー |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe の公開可能キー (フェーズ2) |

> `VITE_` プレフィックスの変数はビルド結果に埋め込まれ、ブラウザから参照できます。
> Supabase の `service_role` キーや Stripe のシークレットキーは絶対に置かないでください。

## 現在の実装状況

- [x] Vite + React + TypeScript のプロジェクト初期化
- [x] Tailwind CSS のセットアップ
- [x] Supabase クライアントのセットアップ
- [x] 認証 (マジックリンク) と保護ルート
- [x] 画面の雛形 (ダッシュボード / 物件 / 備品)
- [ ] Supabase のテーブル設計と RLS ポリシー
- [ ] 物件の CRUD
- [ ] 備品と在庫増減の CRUD
- [ ] Stripe サブスクリプション連携
