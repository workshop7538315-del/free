# カードデータ

| ファイル | 内容 |
|---|---|
| `sets/*.mjs` | **カードの定義**。アーキタイプごとのファイル(`core.mjs` が最初の166種類) |
| `lib.mjs` | カードの書き方の補助と、効果データから文章を作る処理 |
| `build.mjs` | 全セットをまとめて検証し、`cards.json` と `decks.json` を作る |
| `cards.json` | `build.mjs` が作る全カードのデータ(手で編集しない) |
| `decks.json` | `build.mjs` が作るスターターデッキ(2色の汎用10種類+アーキタイプ18種類) |
| `keywords.json` | キーワードの説明(ツールチップと絞り込みで使う) |

## カードを追加・変更する

1. `sets/` の該当するファイルに書き足す(新しいアーキタイプなら新しいファイルを作り、`build.mjs` の `SETS` に加える)。
2. リポジトリ直下で `node cards/build.mjs` を実行する。`cards.json` と `decks.json` が作り直される。
3. `cd app && npm run simulate` で、CPU同士の自動対戦を回してエラーが出ないか確かめる。

カードの文章は効果のデータから自動で作られるので、文章と実際のゲームでの動きがずれません。言い回しを自分で決めたい能力だけ `text` を書きます。

検証で次のようなミスは止まります:IDやカード名の重複、不明なマナ記号、対象の指定漏れ、「星詠み」「鉄機」の名前を他のセットで使うこと(名前を参照するテーマは2つまでのため)。

## 書き方の例

```js
// クリーチャー:ID, 名前, コスト, 種族, パワー, タフネス, レアリティ(C/U/R/M), 能力
cr("r001", "火花の小鬼", "{R}", "ゴブリン", 1, 1, "C", [kw("速攻"), charge(E.dmgOpp(1))]),

// インスタント:対象を指定して効果
ins("r002", "稲妻の一閃", "{R}", "C", spell(E.dmg(3), T.any)),

// 燃焼つき:燃焼したときだけ効果が変わる
ins("r017", "激情の火炎", "{1}{R}{R}", "U", [burn(2), spell(
  [unless("burned", E.dmg(3)), iff("burned", E.dmg(5))], T.cre)]),
```

効果の種類と書き方は `app/src/game/schema.ts` にまとめてあります。主なもの:

| 種類 | 書き方 |
|---|---|
| キーワード | `kw("飛行", "絆魂")` |
| 呪文の効果 | `spell(効果, 対象)` |
| 誘発 | `etb`(戦場に出たとき)、`dies`(死亡したとき)、`attacks`(攻撃するたび)、`charge`(チャージ時)、`upkeep`、`castSpell`、`allyDies` |
| 常在 | `stat({ s: "anthem", p: 1, t: 1, others: true })` など |
| 起動 | `act({ mana: "{1}", tap: true }, 効果, 対象)` |
| マナ能力 | `mana("{G}")`、`mana("any")` |
| 燃焼・マナ解放 | `burn(2)`、`release("{5}{G}{G}")` |
| 条件 | `iff("burned" / "kicked" / "threshold" / "highlander" など, 効果)`、`iff(armed("R", 5), 効果)`、`iff(control(F.human, 3), 効果)`、`unless(...)` |
| 追加の能力 | `kicker("{2}")`、`flashback("{3}{B}")`、`cycling("{2}")`、`affinity(F.human)`、`free(条件)`、`equipment(...)`、`aura(...)` |
| 種族などで絞る | `lord(F.human, 1, 1)`、`allyEnter(F.enchant)(効果)`、`onCast(F.mv3)(効果)`、`E.tutor(F.hoshi)` |

## 項目

| 項目 | 内容 |
|---|---|
| id | 一意なID。最初の166種類は色の頭文字+3桁(w001など)、それ以降はセットの略号+2桁(hum01など)。**一度決めたら変えない**(保存済みデッキがIDで参照するため)。削ったカードの番号は欠番にする |
| tags | アーキタイプ。セットごとに `tagAll` で付け、種族・タイプからも自動で付く |
| cost | MTG表記。{W}{U}{B}{R}{G}{C}、数字、{X}、混成 {W/U}、単色混成 {2/W} |
| type / subtype | カードタイプと種族など |
| power / toughness | クリーチャーのみ |
| rarity | コモン/アンコモン/レア/神話レア |
| text | 自動生成されるルール文章 |
| abilities | 効果のデータ(エンジンが実行する) |

カードの色はマナコストから自動で決まります([docs/rules.md](../docs/rules.md) 5.5)。
