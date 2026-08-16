# 民泊備品管理アプリ

民泊物件の備品・在庫を管理するための Web アプリです。

## 技術構成

| 領域 | 使用技術 |
| --- | --- |
| フロントエンド | React 19 + Vite + TypeScript |
| スタイリング | Tailwind CSS v4 (`@tailwindcss/vite`) |
| ルーティング | React Router |
| バックエンド / DB / 認証 | Supabase (`@supabase/supabase-js`) |
| 決済 | Stripe (サブスクリプション + Supabase Edge Functions) |
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

### Supabase なしで画面だけ確認する (デモモード)

Supabase をまだ用意していない場合は、デモモードでサンプルデータのまま起動できます。

```bash
npm run dev:demo
```

デモモードでは Supabase に接続せず、認証もスキップしてログイン済みとして扱います。
画面上部に黄色いバーが出ている間はサンプルデータです。

共有用に 1 枚の HTML へまとめることもできます (出力先は `preview/index.html`)。

```bash
npm run build:preview
```

デモ関連のコードは `src/lib/demo.ts` に集約してあるので、
実データの実装が入ったらこのファイルごと削除できます。

## データベース (Supabase)

スキーマは `supabase/migrations/` に SQL で置いています。

```bash
# Supabase CLI でリモートプロジェクトへ適用
supabase link --project-ref <project-ref>
supabase db push

# ローカルの Supabase スタックで試す場合
supabase start
```

CLI を使わない場合は、SQL の中身を Supabase ダッシュボードの
**SQL Editor** に貼り付けて実行しても同じ結果になります。

テーブル構成は以下の通りで、すべてのテーブルで RLS を有効化し、
**ログインユーザーは自分が `owner_id` の物件に紐づくデータだけ**を読み書きできます。

```
profiles ── properties ─┬─ items
                        ├─ checklists ── checklist_items
                        └─ checklist_records ── checklist_record_details
```

### 認証

メールアドレス + パスワードで登録・ログインします (`/login` のタブで切り替え)。
新規登録時は DB の `on_auth_user_created` トリガーが `profiles` の行を
`plan = 'free'` で自動作成します。

Supabase ダッシュボードの **Authentication > Providers > Email** で
「Confirm email」を有効にしている場合は、確認メールのリンクを開くまで
ログインが完了しません。ローカルで手早く試したい場合はこの設定を切ってください。

### 備品の写真 (Storage)

備品写真は `item-photos` バケットに置きます。物件の内部が写る可能性があるため
**非公開バケット**にして、表示時に署名付き URL を発行しています。

オブジェクトのパスは `<property_id>/<uuid>.<ext>` で、
先頭フォルダの物件を持っているユーザーだけが読み書きできるよう
`storage.objects` に RLS ポリシーを設定しています。
そのため `items.photo_url` に入るのは公開 URL ではなく**バケット内のパス**です。

対応形式は JPEG / PNG / WebP、上限 5MB です (バケット側でも制限しています)。

### 清掃チェックリスト

物件ごとにチェックリスト(テンプレート)を作り、実施時に項目ごとへ
「OK / 不足 / 破損」を記録します。「不足」「破損」にはコメントを残せます。

「不足」を選んだ項目が備品に紐づいている場合は、`items.quantity` を更新します。

- 実施画面で**現在の残数**を入力できます (清掃スタッフが現物を見て入力する想定)
- 未入力の場合は「しきい値 - 1」にして、在庫アラートが必ず立つようにします

記録の作成・明細の作成・数量の更新は DB 関数 `submit_checklist_record` で
**1 トランザクション**にまとめています。途中で失敗したときに記録だけ残って
数量が古いまま、という状態を防ぐためです。

### CSV 入出力

`/csv` から、備品台帳とチェック履歴を CSV で書き出せます。備品一覧の画面にも
書き出しボタンを置いてあります。Excel (Windows) で開いても文字化けしないよう、
**UTF-8 BOM 付き・改行 CRLF** で出力します。

取り込みは「ファイルを選ぶ → 内容をプレビュー → 確定」の 2 段階です。

- 物件は**名前**で突き合わせます。CSV に無い物件名はエラーにします
  (CSV から物件を作れると、無料プランの物件数制限をすり抜けられるため)
- 同じ物件に同名の備品があれば更新、無ければ新規登録します
- 不正な行は行番号と理由を表示し、**正常な行だけ**を取り込みます
- 取り込みは DB 関数 `import_items` で 1 トランザクションにまとめており、
  途中で失敗した場合は 1 行も反映されません

### 課金 (Stripe)

`/plan` でプランの比較と契約状況を表示し、Stripe Checkout へ遷移します。
解約や支払い方法の変更は Stripe カスタマーポータルで行います。

Stripe のシークレットキーはブラウザに置けないため、セッション作成と
Webhook の受け口は Supabase Edge Functions に置いています。

| 関数 | 役割 |
| --- | --- |
| `create-checkout-session` | Checkout セッションを作る (要ログイン) |
| `create-portal-session` | カスタマーポータルのセッションを作る (要ログイン) |
| `stripe-webhook` | 契約状況を `profiles.plan` へ同期する |

#### セットアップ手順

1. Stripe で Pro プランの商品と月額 Price を作る
2. シークレットを登録する

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_...
supabase secrets set STRIPE_PRICE_ID=price_...
supabase secrets set APP_URL=https://<本番URL>
```

3. 関数をデプロイする (Webhook は Stripe から呼ばれるので JWT 検証を外す)

```bash
supabase functions deploy create-checkout-session
supabase functions deploy create-portal-session
supabase functions deploy stripe-webhook --no-verify-jwt
```

4. Stripe ダッシュボードで Webhook エンドポイントを登録する
   URL: `https://<project-ref>.supabase.co/functions/v1/stripe-webhook`
   イベント: `checkout.session.completed`,
   `customer.subscription.created/updated/deleted`
5. 発行された署名シークレットを登録する

```bash
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

`plan` は本人が更新できない列にしてあるため、課金状態を書き換えるのは
Webhook (service_role) だけです。Checkout から戻った直後は Webhook の処理が
まだ終わっていないことがあるので、画面側でプランが切り替わるまで数回
読み直します。

### プランによる制限

無料プラン (`plan = 'free'`) のユーザーが登録できる物件は 1 件までです。
画面側で 2 件目の登録を止めるだけでなく、**DB のトリガーでも同じ制限**をかけています
(`supabase/migrations/20260815010000_free_plan_property_limit.sql`)。
画面のチェックは API を直接叩けば回避できるためです。

上限値は SQL の `public.free_plan_property_limit()` と
`src/lib/planLimits.ts` の `FREE_PLAN_PROPERTY_LIMIT` の 2 箇所にあります。
変更するときは両方揃えてください。

型定義 (`src/types/database.ts`) はスキーマと同じ形で手書きしています。
CLI が使えるようになったら次のコマンドで置き換えられます。

```bash
supabase gen types typescript --linked > src/types/database.ts
```

## npm スクリプト

| コマンド | 内容 |
| --- | --- |
| `npm run dev` | 開発サーバーを起動 |
| `npm run dev:demo` | デモモードで開発サーバーを起動 (Supabase 不要) |
| `npm run build` | 型チェック + 本番ビルド (`dist/`) |
| `npm run build:demo` | デモモードでビルド |
| `npm run build:preview` | デモビルドを 1 枚の HTML (`preview/index.html`) にまとめる |
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
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe の公開可能キー (現在は未使用) |
| `VITE_DEMO_MODE` | `true` でデモモード (`.env.demo` で設定済み) |

> `VITE_` プレフィックスの変数はビルド結果に埋め込まれ、ブラウザから参照できます。
> Supabase の `service_role` キーや Stripe のシークレットキーは絶対に置かないでください。

> **デプロイ時の注意**: `VITE_` 変数は実行時ではなく**ビルド時**に値が埋め込まれます。
> Vercel では環境変数を設定した上でビルドしてください。未設定のままビルドすると、
> Supabase クライアントの初期化前にエラーを投げる分岐が定数化され、
> クライアントごとバンドルから削除されます (画面を開いた時点でエラーになります)。

## 現在の実装状況

- [x] Vite + React + TypeScript のプロジェクト初期化
- [x] Tailwind CSS のセットアップ
- [x] Supabase クライアントのセットアップ
- [x] 認証 (メール / パスワード) と保護ルート
- [x] 画面の雛形 (ダッシュボード / 物件 / 備品)
- [x] デモモード (Supabase なしで画面を確認できる)
- [x] Supabase のテーブル設計と RLS ポリシー
- [x] 物件の CRUD (無料プランは1件までの制限つき)
- [x] 備品台帳 (CRUD・数量の増減・カテゴリ絞り込み・在庫アラート・写真)
- [x] 清掃チェックリスト (テンプレート・実施・履歴)
- [x] CSV 入出力 (備品台帳の書き出し/取り込み・チェック履歴の書き出し)
- [x] Stripe サブスクリプション連携 (プラン画面・Checkout・Webhook・解約)
- [ ] 仕上げ (レスポンシブ・ローディング/エラー表示の統一)
