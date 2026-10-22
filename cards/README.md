# カードデータ

| ファイル | 内容 |
|---|---|
| `build.mjs` | **カードの定義の本体**。ここを編集する |
| `cards.json` | `build.mjs` が作る全カードのデータ(手で編集しない) |
| `decks.json` | `build.mjs` が作るスターターデッキ(2色×10種類) |
| `keywords.json` | キーワードの説明(ツールチップと絞り込みで使う) |

## カードを追加・変更する

1. `build.mjs` のカード一覧(`W` `U` `B` `Rd` `G` `Cl` `M`)に書き足す。
2. リポジトリ直下で `node cards/build.mjs` を実行する。`cards.json` と `decks.json` が作り直される。
3. `cd app && npm run simulate` で、CPU同士の自動対戦を回してエラーが出ないか確かめる。

カードの文章は効果のデータから自動で作られるので、文章と実際のゲームでの動きがずれません。言い回しを自分で決めたい能力だけ `text` を書きます。

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
| 条件 | `iff("burned" / "bloom" / "fewerMana", 効果)`、`unless(...)` |

## 項目

| 項目 | 内容 |
|---|---|
| id | 一意なID。色の頭文字(w/u/b/r/g/c=欠色/m=多色)+3桁。**一度決めたら変えない**(保存済みデッキがIDで参照するため) |
| cost | MTG表記。{W}{U}{B}{R}{G}{C}、数字、{X}、混成 {W/U}、単色混成 {2/W} |
| type / subtype | カードタイプと種族など |
| power / toughness | クリーチャーのみ |
| rarity | コモン/アンコモン/レア/神話レア |
| text | 自動生成されるルール文章 |
| abilities | 効果のデータ(エンジンが実行する) |

カードの色はマナコストから自動で決まります([docs/rules.md](../docs/rules.md) 5.5)。
