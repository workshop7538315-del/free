# デッキビルダー

`cards/cards.json` のカードからデッキを組み、Supabase に保存できるWebアプリです。

- 色・タイプ・テキストでカードを絞り込み、「＋」「−」でデッキに出し入れ
- 40枚ちょうど・同名4枚までのチェック
- マナカーブと「色のバランス」(コストに出てくる色マナ記号の数と、マナにするとその色を出せるカードの枚数)
- ログインするとデッキをSupabaseに保存・読込・削除。デッキは本人にしか見えない
- Supabaseを設定していなければ、ブラウザ内(localStorage)に保存して動く

## 動かす

Node.js 20以上が必要です。

```bash
cd app
npm install
npm run dev
```

表示されたURL(通常 http://localhost:5173)を開きます。

## Supabase の設定

1. [Supabase](https://supabase.com/) でプロジェクトを作る。
2. ダッシュボードの **SQL Editor** で、[`supabase/migrations/20261022000000_create_decks.sql`](../supabase/migrations/20261022000000_create_decks.sql) の中身を貼り付けて実行する。
   (Supabase CLI を使う場合は、リポジトリ直下で `supabase link` → `supabase db push`)
3. **Project Settings → API** で Project URL と anon(publishable)キーを確認する。
4. `app/.env.example` を `app/.env.local` にコピーして、その2つを入れる。

   ```
   VITE_SUPABASE_URL=https://あなたのプロジェクト.supabase.co
   VITE_SUPABASE_ANON_KEY=キー
   ```

5. `npm run dev` を再起動すると、右上に「ログイン」が出る。

### ログイン方式

メールアドレスとパスワードでログインします。Supabase の初期設定では、新規登録すると確認メールが届き、リンクを開くまでログインできません。手早く試すなら **Authentication → Sign In / Providers → Email** の「Confirm email」をオフにしてください。

### 保存されるデータ

`public.decks` テーブル:

| 列 | 内容 |
|---|---|
| id | デッキID |
| user_id | 持ち主(ログイン中のユーザー) |
| name | デッキ名(60文字まで) |
| cards | `{"カードID": 枚数}` のJSON |
| note | メモ(2000文字まで) |
| created_at / updated_at | 作成・更新日時 |

行レベルセキュリティで、自分の行しか読み書き・削除できません。anon キーはブラウザに公開されても問題ない前提のキーです(service_role キーは絶対に入れないでください)。

## 公開する

```bash
npm run build
```

`app/dist/` を静的ホスティング(GitHub Pages、Netlify、Vercel など)に置けば動きます。相対パスで出力しているので、サブディレクトリでも動きます。公開先のURLは Supabase の **Authentication → URL Configuration** の Site URL にも登録してください(確認メールのリンク先になります)。

## カードを増やす

[`cards/README.md`](../cards/README.md) の書式で `cards/cards.json` に追記すると、そのままアプリに出ます。保存済みデッキはカードIDで記録しているので、**IDは後から変えないでください**。
