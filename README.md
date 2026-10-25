# 文法カンパニー（英文法学び直しアプリ）

TOEICを受ける社会人が、中学英文法をビジネス英語で学び直すスマホアプリです。
新入社員から始まり、文法ステージをクリアするごとに昇進していきます。
詳しい要件は [docs/requirements.md](docs/requirements.md) を見てください。

いまはフェーズ1（一人用）まで作ってあります。

## 動かし方

パソコンに [Node.js](https://nodejs.org/)（バージョン20以上）を入れ、スマホに **Expo Go** アプリを入れておきます。

```bash
git clone <このリポジトリのURL>
cd -SNS
npm install
npx expo start
```

画面に出るQRコードをスマホで読み取ると、Expo Go でアプリが開きます（パソコンとスマホは同じWi-Fiにつないでください）。

## 動作確認のしかた（ステップごと）

| ステップ | 確認すること |
|---|---|
| 1. 土台 | 下に「オフィス」「文法ログ」「設定」の3つのタブがあり、切り替えられる |
| 2. 保存 | 1問解いてからアプリを完全に閉じ、開き直しても「今日の回答」が残っている |
| 3. 問題 | 「今すぐ1問解く」で新入社員ステージの5問が出る。英文と正解が正しいか確認する |
| 4. 出題画面 | 60秒のカウントダウンが動く。回答すると正誤と田中部長の解説が出る。60秒を過ぎて答えると「遅刻」マークがつく |
| 5. 通知 | 設定画面の「1分後に試しに出題する」を押してアプリを閉じ、1分後に通知が届く。タップすると出題画面が開く |
| 6. 未処理案件 | 通知に答えないと、オフィス画面の「未処理案件」が増える。10件たまると1つ降格する |
| 7. 上司キャラ | 状況（未処理あり、全問正解など）でオフィス画面のセリフが変わる |
| 8. 文法ログ | 「文法ログ」タブに、今日解いた問題と今週の成績表が出る |
| 9. 昇進試験 | 下の「昇進試験の準備」をしたあと、今のステージで10問正解すると受験できる |

自動テスト（ゲームのルールの確認）は `npm test`、型チェックは `npm run typecheck` で実行できます。

## ルールの数値を変えるには

[src/lib/rules.ts](src/lib/rules.ts) にまとめてあります（未決事項の仮の値）。

- 降格になる未処理案件の数: 10件
- 昇進試験を受けられる条件: 今のステージで10問正解
- 昇進試験: 10問中8問以上で合格
- 遅刻: 開いてから60秒を超えて回答、または通知から30分以上たってから開いた

1日の出題回数と時間帯は、アプリの設定画面で変えられます。

## 昇進試験の準備（Supabase と Claude API）

昇進試験の問題は、AI（Claude API）がその場で作ります。APIキーをアプリの中に書かないよう、Supabase の Edge Function を経由して呼び出します。

1. [Anthropic Console](https://console.anthropic.com/) でAPIキーを作る
2. [Supabase](https://supabase.com/) でプロジェクトを作る
3. Supabase CLI でログインし、関数を公開してAPIキーを登録する
   ```bash
   npx supabase login
   npx supabase link --project-ref <プロジェクトID>
   npx supabase secrets set ANTHROPIC_API_KEY=<AnthropicのAPIキー>
   npx supabase functions deploy generate-exam
   ```
4. `.env.example` を `.env` という名前でコピーし、Supabase の URL と anon key（Project Settings → API）を入れる
5. `npx expo start` を起動し直す

関数の中身は [supabase/functions/generate-exam/index.ts](supabase/functions/generate-exam/index.ts) です。次の流れで問題を作ります。

1. Claude が、ステージの単元から10問を作る（間違えの多い単元を多めに出す）
2. 別の呼び出しで、Claude が問題を解き直し、「正解が1つだけか」を確かめる
3. 不合格の問題だけを作り直す（最大3回）

## 問題を追加するには

`src/data/questions/stage1.json` と同じ形で、ステージごとのファイルを作ります。作ったら `src/data/questions/index.ts` で読み込みます。単元名は `src/data/stages.ts` と同じものにしてください。`npm test` を実行すると、形の間違い（選択肢が4つない、単元名が違うなど）を見つけられます。正解が1つだけになっているかは、自分で確認してから登録してください。

今のステージの問題がまだないときは、前のステージの問題が復習として出ます。

## フォルダ構成

```
src/app/            画面（ファイル1つが1画面）
  (tabs)/index.tsx  オフィス（ホーム）
  (tabs)/log.tsx    文法ログ
  (tabs)/settings.tsx 設定
  quiz.tsx          出題画面
  exam.tsx          昇進試験
src/lib/            画面以外の処理
  game.ts           ゲームのルール（テストあり）
  notifications.ts  通知の予約
  storage.ts        端末内への保存
src/data/           ステージ・単元の解説・問題
supabase/functions/ 昇進試験の問題を作るサーバー側の処理
```

## 将来の拡張に向けて

出題の記録（Delivery）には、ユーザーID・出題ID・回答時刻を持たせてあります。フェーズ2の全国一斉出題とフェーズ3のグループ機能では、この記録をサーバーに送って集計します。
