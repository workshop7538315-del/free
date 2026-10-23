# デッキビルダーとCPU対戦

`cards/cards.json` のカードからデッキを組み、Supabase に保存できるWebアプリです。

- 色・タイプ・テキストでカードを絞り込み、「＋」「−」でデッキに出し入れ
- 40枚ちょうど・同名4枚までのチェック
- マナカーブと「色のバランス」(コストに出てくる色マナ記号の数と、マナにするとその色を出せるカードの枚数)
- ログインするとデッキをSupabaseに保存・読込・削除。デッキは本人にしか見えない
- Supabaseを設定していなければ、ブラウザ内(localStorage)に保存して動く

## CPU対戦

上部の「対戦する」からCPUと対戦できます。

- 使えるデッキ:作成中のデッキ(40枚ちょうどでルールを満たすもの)、保存したデッキ、スターターデッキ10種類
- ルールの処理はすべて自動です。カードを選ぶと、唱える・チャージ・能力の起動など、できることが表示されます
- 対象を選ぶ場面では、選べるカードやプレイヤーが赤く光ります

### しくみ

| ファイル | 役割 |
|---|---|
| `src/game/engine.ts` | ルールエンジン。ターン進行、チャージ、マナの支払い、スタックと優先権、効果の解決、戦闘、状況起因処理 |
| `src/game/payment.ts` | マナの自動支払い(混成・単色混成・{C}・{X}に対応) |
| `src/game/ai.ts` | CPUの思考 |
| `src/game/human.ts` | 人間側。エンジンからの質問を画面に出す |
| `src/game/schema.ts` | カード効果のデータ形式 |
| `src/components/battle/` | 対戦画面 |

エンジンは、決定が必要な場面で「質問」を出して答えを待つ作りです。人間は画面で、CPUは `ai.ts` で答えます。

### 自動対戦テスト

```bash
npm run simulate        # 200戦
npm run simulate -- 1000
```

CPU同士を対戦させ、エラーの有無、デッキ別の勝率、一度も使われなかったカードを表示します。カードを追加・変更したら実行してください。

### ティア表

```bash
npm run tier            # スターターデッキの総当たり(1組40戦、約3分)
npm run tier -- 100     # 1組100戦
```

結果は [`docs/tier.md`](../docs/tier.md)(ティア表と相性表)と `docs/tier-data.json` に書き出されます。

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
