// 第9.5弾「黄金郷の発明家」(新規展開) 3つの単語:開拓・発明・黄金郷 / 白・赤・緑と欠色だけ
//   開拓進化【緑】N:緑のクリーチャー1体を素材にし、マナゾーンのカードをマナ総量の合計がN以上になるように墓地に置いて、
//                    秘蔵庫の開拓者を出す(ソーサリーのタイミングで1ターンに1回)。
//   紋章 ― 埋蔵 N:マナゾーンにあるこのカードを開拓進化で墓地に置くとき、マナ総量に+Nして数える。
//   大開拓進化【緑】N:開拓者1体の上に重ねる開拓進化。3枚以上を墓地に置く。
//   加護《黄金郷への道》:開拓進化で、戦場とマナゾーンの代わりにライブラリーの上から墓地に置いてよい(マナ総量の合計がN以上になるまで)。
//   組み立て【色】:秘蔵庫の発明品(装備品)。マナコストを払い、その色のクリーチャーをタップして、それにつけて出す(1ターンに1回)。
//   武装進化:発明品の条件を満たすと、装備していたクリーチャーを墓地に置き、発明品と秘蔵庫の合体先が合体する(1ターンに1回)。
//   《黄金》:生成されるアーティファクト。生け贄に捧げると好きな色のマナを1つ出す。
import {
  cr, acr, art, ins, sor, ench, equipment, kw, spell, etb, dies, attacks, endStep, act, stat, lord, once, allyEnter, selfIf,
  pioneer, assemble, evolveOnly, buried, charge, modal, gen, control, T, E,
} from "../lib.mjs";

const tagged = (c) => ({ ...c, tags: [...new Set([...(c.tags ?? []), "黄金郷"])] });
const EQ = { sub: "装備品" };
const FLYER = { t: "creature", who: "opp", flying: true };
const PIONEER = { sub: "開拓者" };

// ---------------------------------------------------------------- 生成されるカード
/** 黄金:{0} のアーティファクト。生け贄に捧げて好きな色のマナを1つ出す */
const GOLD = gen("tk-ougon", "黄金", "{0}", "アーティファクト", [{ a: "mana", produce: ["any"], sacSelf: true }]);

export const ELDORADO = [
  // ================================================================ 秘蔵庫:開拓者(緑)
  tagged(cr("eld01", "苔むす開拓者", "{2}{G}", "エルフ・開拓者", 2, 2, "C", [pioneer(6, "G"), kw("到達"), etb(E.create(GOLD))])),
  tagged(cr("eld02", "黄金郷の先駆者", "{3}{G}", "人間・開拓者", 3, 3, "U", [pioneer(9, "G"), kw("到達"), etb(E.draw(1))])),
  tagged(cr("eld03", "密林を拓く巨獣", "{5}{G}", "ビースト・開拓者", 5, 5, "R", [pioneer(13, "G"), kw("トランプル"), etb(E.duelSelf(), T.opp)])),
  tagged(cr("eld04", "大樹海の覇者", "{6}{G}{G}", "ビースト・開拓者", 6, 6, "R", [pioneer(18, "G"), kw("到達", "トランプル"), etb([E.ramp(2), E.create(GOLD)])])),
  tagged(cr("eld05", "黄金郷の大開拓者 エル・ドラード", "{7}{G}{G}{G}", "人間・開拓者", 6, 6, "M", [
    pioneer(24, "G", true),
    kw("到達", "トランプル"),
    etb([E.blessing("黄金郷への道"), E.create(GOLD, 2)]),
    attacks(E.countersAll(1, PIONEER)),
  ])),

  // ================================================================ 秘蔵庫:発明品と合体先(白・赤・欠色)
  tagged(equipment("eld06", "からくり翼", "{2}", "U", "{2}", { p: 1, t: 1, kw: ["飛行"] }, [assemble("W", "eld07", "天翔ける機械騎士")])),
  tagged(acr("eld07", "天翔ける機械騎士", "{4}{W}{W}", "人間・騎士・機兵", 5, 5, "R", [evolveOnly(), kw("飛行", "先制攻撃"), etb(E.create(GOLD))])),
  tagged(equipment("eld08", "炎機の籠手", "{1}", "U", "{2}", { p: 2, t: 0, kw: ["速攻"] }, [assemble("R", "eld09", "炎鋼の巨兵")])),
  tagged(acr("eld09", "炎鋼の巨兵", "{4}{R}{R}", "構築物・機兵", 6, 5, "R", [evolveOnly(), kw("速攻", "トランプル"), etb(E.dmg(3), T.opp)])),
  tagged(equipment("eld10", "黄金の大盾", "{3}", "U", "{2}", { p: 0, t: 3, kw: ["警戒"] }, [assemble("W", "eld11", "黄金郷の守護機兵", "twoEquip")])),
  tagged(acr("eld11", "黄金郷の守護機兵", "{4}{W}", "構築物・機兵", 4, 7, "R", [evolveOnly(), kw("警戒"), etb([E.gain(4), E.create(GOLD)])])),
  tagged(equipment("eld12", "発明家の鉄槌", "{1}", "U", "{1}", { p: 1, t: 0 }, [assemble("R", "eld13", "鉄槌の発明王")])),
  tagged(acr("eld13", "鉄槌の発明王", "{3}{R}{W}", "人間・職人・機兵", 4, 4, "M", [evolveOnly(), kw("先制攻撃"), lord({ type: "クリーチャー" }, 1, 0), etb(E.tutor(EQ))])),

  // ================================================================ 緑のメイン:マナを育て、大型をマナにする
  tagged(sor("eld14", "開拓の鍬", "{1}{G}", "C", spell([E.ramp(1), E.create(GOLD)]))),
  tagged(cr("eld15", "森を拓く者", "{1}{G}", "エルフ・ドルイド", 1, 2, "C", [{ a: "mana", produce: ["{G}"] }, dies(E.create(GOLD))])),
  tagged(ench("eld16", "黄金郷の地図", "{2}{G}", "C", [etb([E.lookTop(), E.draw(1)])])),
  tagged(cr("eld17", "開拓地の巨獣", "{4}{G}", "ビースト", 5, 5, "C", [kw("トランプル"), etb(E.lookTop())])),
  tagged(cr("eld18", "大地の測量士", "{2}{G}", "人間・ドルイド", 2, 3, "C", [kw("到達"), etb(E.ramp(1, true))])),
  tagged(cr("eld19", "密林の大蛇", "{5}{G}", "ヘビ", 6, 5, "U", [kw("到達"), etb(E.dmg(3), FLYER)])),
  tagged(ins("eld20", "黄金の種", "{G}", "C", modal([["あなたのクリーチャー1体は+2/+2", E.pump(2, 2), T.you], ["《黄金》を1枚生成する", E.create(GOLD)]]))),
  tagged(sor("eld21", "開拓者の行進", "{3}{G}{G}", "U", spell([E.countersAll(1), E.draw(1)]))),
  tagged(cr("eld22", "開拓の巨人", "{6}{G}", "巨人", 7, 7, "U", [kw("トランプル"), etb(E.create(GOLD, 2))])),
  tagged(cr("eld23", "根を張る古木", "{3}{G}", "ツリーフォーク", 2, 6, "C", [kw("到達"), { a: "mana", produce: ["any"] }])),
  tagged(sor("eld39", "黄金郷への旅路", "{2}{G}", "U", spell([E.tutor({ type: "クリーチャー", color: "G" }), E.create(GOLD)]))),
  tagged(ench("eld40", "開拓の終着点", "{2}{G}{G}", "R", [lord(PIONEER, 2, 2, ["トランプル"], false), allyEnter(PIONEER)(E.draw(1))])),
  tagged(cr("eld44", "黄金郷の語り部", "{1}{G}", "エルフ・シャーマン", 2, 2, "C", [once(allyEnter(PIONEER)(E.draw(1))), etb(E.lookTop())])),

  // ================================================================ 白赤のメイン:発明家と装備
  tagged(cr("eld24", "若き発明家", "{1}{R}", "人間・職人", 2, 1, "C", [kw("速攻"), etb(E.create(GOLD))])),
  tagged(cr("eld25", "工房の見習い", "{W}", "人間・職人", 1, 2, "C", [selfIf(control(EQ, 1), 1, 1), etb(E.lookTop())])),
  tagged(art("eld26", "鍛冶場の炉", "{2}", "C", [act({ mana: "{1}", tap: true }, E.pump(1, 0, ["先制攻撃"]), T.you), etb(E.create(GOLD))])),
  tagged(acr("eld27", "機械仕掛けの斥候", "{2}", "構築物", 1, 1, "C", [kw("飛行"), etb(E.lookTop())])),
  tagged(sor("eld28", "発明家の閃き", "{1}{R}", "C", modal([["クリーチャー1体かプレイヤー1人に2点", E.dmg(2), T.any], ["1枚引き、《黄金》を1枚生成する", [E.draw(1), E.create(GOLD)]]]))),
  tagged(cr("eld29", "光の工匠", "{2}{W}", "人間・職人", 2, 3, "U", [etb(E.tutor(EQ))])),
  tagged(ins("eld30", "黄金の天秤", "{1}{W}", "C", modal([["あなたのクリーチャー1体は+2/+2", E.pump(2, 2), T.you], ["3点のライフを得て、《黄金》を1枚生成する", [E.gain(3), E.create(GOLD)]]]))),
  tagged(ench("eld31", "発明の大工房", "{1}{R}{W}", "R", [once(allyEnter(EQ)(E.draw(1))), endStep(E.create(GOLD), undefined, { if: control(EQ, 2) })])),
  tagged(sor("eld32", "鋼の行軍", "{2}{R}{W}", "U", spell([E.pumpAll(1, 1), E.create(GOLD)]))),
  tagged(equipment("eld33", "試作の剣", "{1}", "C", "{1}", { p: 1, t: 1 }, [etb(E.create(GOLD))])),
  tagged(cr("eld34", "発明家の助手", "{1}{W}", "人間・職人", 2, 2, "C", [once(allyEnter(EQ)(E.gain(2)))])),
  tagged(equipment("eld35", "黄金の鎧", "{2}", "U", "{2}", { p: 1, t: 2, kw: ["警戒"] }, [etb(E.lookTop())])),

  // ================================================================ 黄金郷(多色・複数の効果)
  tagged(cr("eld36", "黄金郷の門番", "{2}{G}{W}", "人間・兵士", 3, 4, "U", [kw("警戒", "到達"), etb(E.create(GOLD))])),
  tagged(cr("eld37", "炎樹の発明家", "{1}{R}{G}", "人間・職人", 3, 2, "U", [kw("速攻"), etb(E.create(GOLD))])),
  tagged(cr("eld38", "黄金の亡者", "{3}{R}{G}", "ゾンビ", 4, 4, "U", [kw("トランプル"), etb(E.create(GOLD)), dies(E.create(GOLD))])),
  tagged(art("eld41", "黄金像", "{3}", "U", [etb(E.create(GOLD)), act({ sacSelf: true }, E.draw(2))])),
  tagged(ins("eld42", "機兵の設計図", "{1}{W}", "C", spell([E.draw(1), E.create(GOLD)]))),
  tagged(cr("eld43", "黄金を守る竜", "{4}{R}{R}", "ドラゴン", 5, 5, "R", [kw("飛行"), etb(E.create(GOLD, 2))])),
  tagged(sor("eld45", "黄金郷の発見", "{2}{R}{G}{W}", "M", modal([
    ["マナを2枚増やし、《黄金》を2枚生成する", [E.ramp(2), E.create(GOLD, 2)]],
    ["あなたのクリーチャーは+2/+2とトランプル。1枚引く", [E.pumpAll(2, 2, ["トランプル"]), E.draw(1)]],
  ]))),
  // ================================================================ 埋蔵とチャージ時(マナゾーンに置いて開拓に使う)
  tagged(ench("eld46", "黄金の鉱脈", "{2}{G}", "C", [buried(4), etb(E.lookTop())])),
  tagged(cr("eld47", "地底の黄金竜", "{7}{G}{G}", "ドラゴン", 8, 8, "R", [kw("トランプル"), charge(E.draw(1), undefined, { if: control(PIONEER, 1) }), buried(3)])),
  tagged(cr("eld48", "開拓民の荷馬車", "{2}{G}", "人間・開拓民", 2, 3, "C", [charge(E.lookTop()), buried(2)])),
  tagged(cr("eld49", "大地に眠る巨像", "{8}{G}", "巨人", 9, 9, "U", [kw("到達", "トランプル"), buried(2)])),
  tagged(cr("eld50", "黄金の苗木", "{G}", "植物", 1, 1, "C", [{ a: "mana", produce: ["{G}"] }, buried(3)])),
  tagged(art("eld51", "古代の金貨", "{1}", "C", [etb(E.create(GOLD)), buried(3)])),
  tagged(sor("eld52", "密林の財宝", "{4}{G}{G}", "U", [spell([E.ramp(2), E.draw(1)]), buried(2)].flat())),
  tagged(ench("eld53", "黄金郷の地脈", "{2}{G}", "U", [charge(E.create(GOLD)), buried(2)])),
  tagged(cr("eld54", "眠れる黄金郷の守護者", "{6}{G}{G}", "ビースト", 7, 8, "M", [kw("到達"), charge(E.create(GOLD), undefined, { if: control(PIONEER, 1) }), buried(4)])),
];

void stat;
void attacks;
