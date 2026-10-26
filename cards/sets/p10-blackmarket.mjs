// 第10弾「闇市の大強盗」(新規展開) 3つの単語:快楽・強盗・闇市 / 青・赤・緑だけ
//
// 【舞台】港町の裏街「灰燭街(はいしょくがい)」。灯りの消えない闇市と、街いちばんの金庫を持つ「黄昏銀行」がある。
// 【鉄爪団】(赤緑)黄昏銀行を狙う強盗団。金庫に眠る宝石を盗み出して資金(マナ)に換える。
// 【宝石獣】黄昏銀行の金庫に眠る宝石の魔物。持ち主にだけ従い、盗まれて輝き(マナ)にされても、
//          持ち主の呼び声(マナ解放)で目を覚ます。倒されても、また持ち主の金庫(秘蔵庫)に戻る。
// 【夢花会】(青赤)闇市で架空の薬を売りさばく密売組織。客は「常用者」、道具は「キセル」。
// 【薬】すべて架空のもの。
//   夢花の粉(青):幻を見せる。手札と知恵をもたらす。
//   星屑の粉(赤):体の内から火花が散る。痛みと速さ。
//   幻蜜(緑):甘い蜜。体が大きくなり、大地に溶ける(マナになる)。
//   紅蓮の煙(赤):キセルで吸う煙。怒りと熱。
//   どの薬も「捨てられたとき」に効く(陶酔)。手放すことが一時の快楽になる。代わりに常用者は依存に苦しむ。
//
// キーワード
//   強盗 N:あなたの秘蔵庫からN枚を選び、タップ状態でマナゾーンに置く(秘蔵庫が空なら《札束》を手札に加える)。
//          秘蔵庫のカードは、マナゾーンを離れると秘蔵庫に戻る。
//   宝石獣:秘蔵庫に入るクリーチャー。強盗でマナゾーンに置かれ、マナ解放で唱える。
//   金庫破り ―:あなたの秘蔵庫にカードがないなら有効。
//   陶酔 ―:このカードが手札から捨てられたとき。
//   依存:あなたのアップキープの開始時に、手札を1枚捨てる。捨てられないなら2点のライフを失う。
import {
  cr, art, ins, sor, ench, kw, spell, etb, dies, attacks, act, release, once, lord, selfIf, modal, gen, control,
  gem, vaultCrack, onDiscarded, onDiscard, addiction, T, E,
} from "../lib.mjs";

const tagged = (c) => ({ ...c, tags: [...new Set([...(c.tags ?? []), "闇市"])] });
const G_ = (c) => tagged(c);

// ---------------------------------------------------------------- 生成されるカード
/** 札束:{0} のアーティファクト。生け贄に捧げると好きな色のマナを1つ出す */
const CASH = gen("tk-satsutaba", "札束", "{0}", "アーティファクト", [{ a: "mana", produce: ["any"], sacSelf: true }]);
const heist = (n) => E.heist(n, CASH);
const phantom = (n) => E.token(n, 2, 2, "U", "イリュージョン", ["飛行"]);
const thug = (n) => E.token(n, 2, 1, "R", "人間・ならず者", ["速攻"]);

export const BLACK_MARKET = [
  // ================================================================ 秘蔵庫:宝石獣(強盗でマナに置き、マナ解放で唱える)
  G_(cr("bm01", "紅玉の番獣", "{3}{R}", "宝石獣", 4, 3, "U", [gem(), release("{3}{R}"), vaultCrack(2), kw("速攻")])),
  G_(cr("bm02", "翠玉の大亀", "{4}{G}", "宝石獣", 4, 6, "U", [gem(), release("{4}{G}"), vaultCrack(2), kw("到達"), etb(E.ramp(1, true))])),
  G_(cr("bm03", "蒼玉の霊鳥", "{3}{U}", "宝石獣", 3, 3, "U", [gem(), release("{3}{U}"), vaultCrack(2), kw("飛行"), etb(E.draw(1))])),
  G_(cr("bm04", "金剛の巨人", "{6}{R}{G}", "宝石獣・巨人", 7, 7, "R", [gem(), release("{6}{R}{G}"), vaultCrack(3), kw("トランプル"), etb(E.dmg(3), T.opp)])),
  G_(cr("bm05", "黒曜の魔狼", "{2}{R}", "宝石獣・狼", 3, 2, "C", [gem(), release("{2}{R}"), vaultCrack(1), kw("速攻"), attacks(E.dmgOpp(1))])),
  G_(cr("bm06", "琥珀の大蛇", "{3}{G}", "宝石獣・ヘビ", 4, 4, "C", [gem(), release("{3}{G}"), vaultCrack(2), kw("到達")])),
  G_(cr("bm07", "月長石の幻獣", "{4}{U}{U}", "宝石獣", 4, 5, "R", [gem(), release("{4}{U}{U}"), vaultCrack(2), kw("飛行"), etb(E.bounce(), T.opp)])),
  G_(cr("bm08", "虹彩の宝石竜", "{5}{U}{R}{G}", "宝石獣・ドラゴン", 6, 6, "M", [gem(), release("{5}{U}{R}{G}"), vaultCrack(3), kw("飛行", "速攻"), etb(E.draw(2))])),

  // ================================================================ 鉄爪団(赤緑):強盗
  G_(cr("bm10", "鉄爪団の金庫破り", "{2}{R}{G}", "人間・ならず者", 3, 3, "U", [etb(heist(1))])),
  G_(sor("bm11", "真昼の銀行襲撃", "{1}{R}{G}", "U", spell([heist(2), E.draw(1)]))),
  G_(cr("bm12", "鉄爪団の見張り", "{1}{G}", "人間・ならず者", 1, 1, "C", [etb(heist(1))])),
  G_(cr("bm13", "合鍵師", "{1}{R}", "人間・ならず者", 2, 1, "C", [kw("速攻"), dies(heist(1))])),
  G_(sor("bm14", "大金庫の爆破", "{3}{R}", "C", spell([E.dmg(3), heist(1)], T.cre))),
  G_(art("bm15", "逃走用の馬車", "{2}", "C", [{ a: "mana", produce: ["any"] }, etb(E.lookTop())])),
  G_(cr("bm16", "鉄爪団の首領", "{3}{R}{G}", "人間・ならず者", 4, 4, "M", [kw("トランプル"), etb(heist(1)), selfIf("vaultEmpty", 2, 2, ["速攻"])])),
  G_(ench("bm17", "黄昏銀行の見取り図", "{1}{G}", "C", [etb(heist(1))])),
  G_(cr("bm18", "宝石泥棒", "{1}{U}{R}", "人間・ならず者", 2, 2, "U", [kw("飛行"), etb(heist(1))])),
  G_(sor("bm19", "札束の山", "{2}{G}", "C", spell([E.create(CASH, 2), E.draw(1)]))),
  G_(ins("bm20", "鉄爪団の決行", "{R}{G}", "C", modal([["あなたのクリーチャー1体は+2/+2とトランプル", E.pump(2, 2, ["トランプル"]), T.you], ["強盗 1", heist(1)]]))),
  G_(sor("bm21", "灰燭街の大抗争", "{3}{R}{G}", "R", spell([E.dmgAllOpp(2), heist(1)]))),
  G_(cr("bm22", "金庫番の買収", "{2}{G}", "人間・ならず者", 1, 3, "C", [kw("到達"), etb(heist(1))])),
  G_(cr("bm23", "鉄爪団の荒くれ", "{2}{R}", "人間・ならず者", 3, 2, "C", [kw("速攻"), selfIf("vaultEmpty", 2, 0, ["トランプル"])])),
  G_(cr("bm24", "宝石鑑定士", "{2}{G}", "人間・職人", 1, 4, "U", [{ a: "mana", produce: ["any"] }, once(onDiscard()(E.lookTop()))])),
  G_(sor("bm25", "盗品の山分け", "{1}{R}", "C", spell([thug(1), heist(1)]))),

  // ================================================================ 薬(陶酔):捨てられたら効く
  G_(sor("bm30", "夢花の粉", "{1}{U}", "C", [spell([E.draw(2), E.discard(1)]), onDiscarded(E.draw(1))].flat())),
  G_(sor("bm31", "星屑の粉", "{2}{R}", "C", [spell(E.dmg(3), T.any), onDiscarded(E.dmg(2), T.any)].flat())),
  G_(cr("bm32", "幻蜜の大樹", "{6}{G}", "ツリーフォーク", 7, 7, "U", [kw("トランプル"), onDiscarded(E.selfToMana())])),
  G_(ins("bm33", "紅蓮の煙", "{1}{R}", "C", [spell(E.pump(3, 0, ["先制攻撃"]), T.you), onDiscarded(thug(1))].flat())),
  G_(cr("bm34", "夢花の幻影", "{3}{U}", "イリュージョン", 3, 3, "C", [kw("飛行"), onDiscarded(phantom(1))])),
  G_(cr("bm35", "幻蜜の大熊", "{3}{G}", "熊", 4, 4, "C", [onDiscarded(E.selfToMana())])),
  G_(cr("bm36", "星屑の狂戦士", "{3}{R}", "人間・戦士", 4, 3, "U", [kw("速攻"), onDiscarded(E.dmgOpp(2))])),
  G_(sor("bm37", "夢花の大輪", "{4}{U}{U}", "R", [spell(E.draw(3)), onDiscarded(E.draw(2))].flat())),
  G_(cr("bm38", "幻蜜の大海獣", "{6}{G}{U}", "リバイアサン", 7, 8, "R", [kw("呪禁"), onDiscarded([E.selfToMana(), E.draw(1)])])),
  G_(sor("bm39", "幻蜜の滴り", "{2}{G}", "C", [spell([E.ramp(1), E.countersAll(1)]), onDiscarded(E.countersAll(1))].flat())),
  G_(ins("bm40", "幻視の渦", "{U}", "C", [spell([E.lookTop(), E.draw(1)]), onDiscarded(E.lookTop())].flat())),
  G_(cr("bm41", "紅蓮の竜", "{5}{R}{R}", "ドラゴン", 6, 5, "R", [kw("飛行"), onDiscarded(E.dmg(3), T.cre)])),
  G_(sor("bm42", "星屑の嵐", "{3}{R}{R}", "U", [spell(E.dmgAllOpp(2)), onDiscarded(E.dmgOpp(3))].flat())),
  G_(ench("bm43", "幻蜜の森", "{3}{G}", "U", [lord({ type: "クリーチャー" }, 1, 1, undefined, false), onDiscarded(E.countersAll(1))])),
  G_(ins("bm44", "夢花の霧", "{2}{U}", "C", [spell(E.counter(0), T.spell), onDiscarded(phantom(1))].flat())),
  G_(cr("bm45", "星屑の小鬼", "{R}", "ゴブリン", 2, 1, "C", [kw("速攻"), onDiscarded(E.dmg(1), T.any)])),

  // ================================================================ キセル(捨てる手段)
  G_(art("bm50", "夢花のキセル", "{1}", "C", [act({ mana: "{1}", tap: true, discard: 1 }, E.draw(1))])),
  G_(art("bm51", "紅蓮のキセル", "{2}", "U", [act({ tap: true, discard: 1 }, E.dmg(1), T.any)])),
  G_(art("bm52", "幻蜜のキセル", "{2}", "U", [act({ mana: "{1}", tap: true, discard: 1 }, E.ramp(1, true))])),

  // ================================================================ 常用者(捨てる手段と依存)
  G_(cr("bm53", "夢花の常用者", "{1}{U}", "人間・常用者", 1, 1, "C", [addiction(), etb(E.draw(2))])),
  G_(cr("bm54", "紅蓮の常用者", "{1}{R}", "人間・常用者", 3, 2, "C", [kw("速攻"), addiction()])),
  G_(cr("bm55", "幻蜜の常用者", "{2}{G}", "人間・常用者", 5, 4, "U", [addiction()])),
  G_(cr("bm56", "キセルを燻らす密売人", "{1}{U}{R}", "人間・ならず者", 2, 3, "U", [act({ tap: true, discard: 1 }, E.draw(1))])),
  G_(cr("bm57", "夢花会の売人", "{2}{U}", "人間・ならず者", 2, 2, "C", [etb([E.draw(2), E.discard(1)])])),
  G_(cr("bm58", "夢花会の元締め", "{2}{U}{R}", "人間・ならず者", 3, 4, "M", [onDiscard()(E.dmgOpp(1)), etb([E.draw(2), E.discard(2)])])),
  G_(sor("bm59", "路地裏の取引", "{R}", "C", spell([E.discard(1), E.draw(2)]))),
  G_(ins("bm60", "夢うつつの閃き", "{1}{U}", "C", spell([E.draw(2), E.discard(1)]))),
  G_(ins("bm61", "闇市の取引", "{1}{U}{R}", "U", modal([["2枚捨て、3枚引く", [E.discard(2), E.draw(3)]], ["マナ総量2以下の呪文を打ち消す", E.counter(0), { t: "spell", maxMV: 2 }]]))),
  G_(ench("bm62", "依存の連鎖", "{1}{R}", "U", [onDiscard()(E.dmgOpp(1))])),
  G_(cr("bm63", "夢花畑の番人", "{2}{G}{U}", "エルフ・ならず者", 3, 4, "U", [kw("到達"), onDiscard()(E.countersSelf(1))])),
  G_(cr("bm64", "常用者の溜まり場の主", "{3}{U}{R}", "人間・ならず者", 4, 4, "R", [kw("飛行"), once(onDiscard()(E.draw(1)))])),

  // ================================================================ 灰燭街(複数の効果)
  G_(cr("bm65", "灰燭街の用心棒", "{2}{R}{G}", "人間・戦士", 4, 3, "C", [kw("トランプル"), etb(E.duelSelf(), T.opp)])),
  G_(cr("bm66", "港の荷役", "{1}{G}", "人間", 2, 2, "C", [etb(E.lookTop()), { a: "mana", produce: ["{G}"] }])),
  G_(sor("bm67", "闇市の大強盗", "{2}{U}{R}{G}", "M", spell([heist(3), E.draw(2), E.discard(1)]))),
  G_(cr("bm68", "黄昏銀行の頭取", "{4}{G}{U}", "人間・貴族", 4, 5, "R", [kw("到達"), etb(E.create(CASH, 2)), selfIf(control({ type: "アーティファクト" }, 2), 2, 2)])),
  G_(ins("bm69", "裏切りの密告", "{U}{R}", "C", modal([["クリーチャー1体に2点", E.dmg(2), T.cre], ["2枚引き、1枚捨てる", [E.draw(2), E.discard(1)]]]))),
];
