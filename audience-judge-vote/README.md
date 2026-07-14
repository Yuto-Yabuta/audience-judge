# 観客ジャッジ投票アプリ

「観客ジャッジ投票アプリ 要件定義書 v1.0」（フリースタイルフットボール／フリースタイルバスケ 2on2 イベント向け）に基づき実装。

- 来場者: QRコードから開くWebアプリで、対戦中の2組のどちらが良かったか投票し、気に入った出場者のInstagramをフォローできる。
- 運営: 出場者登録、対戦カード作成、投票の受付開始／締切、結果確認、結果公開のON/OFF、会場掲示用QR表示。

技術構成: Next.js（App Router）+ Supabase（PostgreSQL / Auth / Realtime）+ Vercel。要件定義書 10 章の推奨構成に準拠。

---

## 0. これは何が済んでいて、何がまだか

- コードは一式作成済みです（zipでお渡ししています）。
- 当初GitHubへの自動pushも行う予定でしたが、この作業環境のGitHub連携は「あらかじめ接続された特定のリポジトリのみ」操作可能な制限があり、新規リポジトリの作成はできませんでした。そのため、**GitHubへの登録・Supabaseプロジェクトの作成・Vercelへのデプロイの3つを、お手元のPCで行っていただく**形になります（合計10〜15分程度。下記の通りコマンドをコピペするだけです）。
- このコードはClaudeのクラウド作業環境内では `npm install` 等が実行できない制限があったため、実機ビルド確認はできていません。手元での `npm install` / Vercelへの初回デプロイ時に実際のビルドが走ります。万一ビルドエラーが出た場合は、エラーメッセージをこの会話に貼り付けていただければ、修正版をお渡しします。

---

## 1. コードの展開とデプロイ（もっとも簡単な方法：Vercel CLI）

GitHubを使わず、お手元のMacから直接Vercelにデプロイする方法です。ターミナルで以下を順番に実行してください。

```bash
# 1. zipを展開したフォルダに移動（Downloadsに保存した場合の例）
cd ~/Downloads/audience-judge-vote

# 2. 依存パッケージのインストール
npm install

# 3. Vercel CLIでログイン＆デプロイ（初回はブラウザでログインを求められます）
npx vercel

# 質問には基本的にEnter（デフォルト）でOKです。
# 初回デプロイが終わったら、環境変数を設定してから本番デプロイします（2章のSupabase情報を先に用意してください）。
npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
npx vercel env add SUPABASE_SERVICE_ROLE_KEY production
npx vercel env add NEXT_PUBLIC_APP_URL production

# 4. 本番デプロイ
npx vercel --prod
```

コマンドの最後に本番URL（`https://audience-judge-vote-xxxx.vercel.app` のようなもの）が表示されます。それが来場者用URL・運営URLの両方の起点です。

GitHubでバージョン管理もしたい場合は、GitHubで空のリポジトリ（例: `audience-judge-vote`）を作成した後、同じフォルダで以下を実行すれば履歴も残せます（任意）。

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<あなたのユーザー名>/audience-judge-vote.git
git push -u origin main
```

その後 Vercel ダッシュボードでこのリポジトリを Import すれば、以後は `git push` するだけで自動的に再デプロイされるようになります。

---

## 2. Supabase セットアップ

1. https://supabase.com で無料アカウントを作成し、新規プロジェクトを作成する。
2. 左メニュー「SQL Editor」を開き、本リポジトリの `supabase/schema.sql` の中身を全て貼り付けて実行する（テーブル・インデックス・RLS・Realtime設定・ダミーイベントが作成される）。
3. 左メニュー「Authentication」→「Users」→「Add user」で、運営ログイン用のメールアドレス・パスワードを1つ作成する（このアカウントが `/admin` のログインに使う唯一の管理者アカウント）。
4. 左メニュー「Settings」→「API」を開き、以下の3つをコピーしておく。
   - Project URL
   - `anon` `public` キー
   - `service_role` キー（**絶対に公開しないこと**。Vercelの環境変数にのみ設定する）

---

## 3. 当日までの準備

1. `/admin/login` に2章で作成したメールアドレス・パスワードでログイン。
2. 「出場者管理」で出場プレイヤーを登録（名前・Instagramユーザー名は必須、写真URL・所属は任意）。
3. 「対戦管理」で対戦カード（A組×B組）を作成。
4. 「QR表示」で会場掲示用QRコードを表示・印刷する。

## 4. 当日の運用

1. 対戦開始時、「対戦管理」で該当カードの「受付開始」を押す（他に受付中の対戦があれば自動的に締め切ってから開始する。確認ダイアログが出る）。
2. 来場者はQRから開いた画面でA/Bどちらかに投票し、気に入ればInstagramをフォローする。
3. 演技終了後、「締切」を押す。得票数・割合はリアルタイムに確認できる。
4. 必要に応じて「結果を公開する」を押すと、来場者画面にも得票割合が表示される。
5. 次の対戦へ進み、②〜④を繰り返す。

---

## 5. 仕様上の既定値（要件定義書13章「未決事項」への対応）

- 観客投票は全対戦に適用可能。どの枠を観客ジャッジにするかは運営の運用判断に委ねる（システム側の制限なし）。
- 結果公開は対戦ごとに運営がON/OFF切替（既定はOFF＝非公開）。
- 投票は締切まで変更可（FR-13既定）。
- 出場者写真が未設定の場合は名前の頭文字を代替表示する。
- 大画面表示（任意画面）は本バージョンのスコープ外。
- 管理アカウントはSupabase Authのユーザー1名のみを想定（複数ロールなし）。

## 6. セキュリティ・技術メモ

- 投票の重複防止はDBの一意制約 `UNIQUE(match_id, voter_token)` で担保（クライアント任せにしない、9.3）。
- 同一イベントで「受付中(voting_open)」の対戦が2つ以上同時に存在しないよう、部分一意インデックスをDBに設定。
- `SUPABASE_SERVICE_ROLE_KEY` はサーバ側APIルートのみで使用し、ブラウザには一切露出しない。
- 来場者用のSupabase `anon` キーはテーブルのSELECTのみRLSで許可（投票・フォロー計測などの書き込みは全てサーバAPI経由）。
- 管理APIは、ログイン時に発行されたSupabaseのアクセストークンを `Authorization: Bearer` ヘッダーで検証してから処理する。
- Instagramの自動フォローは技術的に不可能なため（8章）、ディープリンクで最短距離までプロフィール画面へ誘導する設計とした。

## 7. ローカル開発（任意）

```bash
npm install
cp .env.local.example .env.local   # 値をSupabaseの情報で埋める
npm run dev
```

http://localhost:3000 で来場者画面、http://localhost:3000/admin/login で管理画面が確認できる。
