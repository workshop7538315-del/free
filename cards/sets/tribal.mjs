// 部族:ゴブリン・エルフ・ゾンビ・騎士・ウィザード・マーフォーク・ドラゴン。同じ種族をそろえると強くなる。
import { cr, sor, ench, kw, spell, etb, attacks, allyEnter, act, mana, lord, selfIf, scale, discount, F, T, E, iff, control, countPerm, tagAll } from "../lib.mjs";

export const TRIBAL = tagAll("部族", [
  cr("trb01", "ゴブリンの頭目", "{1}{R}", "ゴブリン", 2, 2, "U", [lord(F.goblin, 1, 0, ["速攻"])]),
  sor("trb02", "ゴブリンの群集", "{2}{R}", "C", spell(E.token(3, 1, 1, "R", "ゴブリン"))),
  cr("trb03", "ゴブリンの爆弾魔", "{R}", "ゴブリン", 1, 1, "C", [act({ sacSelf: true }, E.dmg(1), T.any)]),
  cr("trb04", "ゴブリンの戦長", "{2}{R}{R}", "ゴブリン・戦士", 3, 3, "R", [attacks(E.token(1, 1, 1, "R", "ゴブリン", ["速攻"]))]),
  cr("trb05", "エルフの長老", "{1}{G}{G}", "エルフ・ドルイド", 2, 2, "U", [lord(F.elf, 1, 1)]),
  cr("trb06", "エルフの戦士", "{G}", "エルフ・戦士", 1, 1, "C", [selfIf(control(F.elf, 3), 1, 1)]),
  sor("trb07", "エルフの集落", "{2}{G}", "C", spell(E.token(2, 1, 1, "G", "エルフ・戦士"))),
  cr("trb08", "エルフの大族長", "{3}{G}{G}", "エルフ・ドルイド", 1, 1, "R", [scale(countPerm(F.elf), 1, 1)]),
  cr("trb09", "エルフの神秘家", "{G}", "エルフ・ドルイド", 1, 1, "U", [mana("any")]),
  cr("trb10", "ゾンビの王", "{1}{B}{B}", "ゾンビ", 2, 2, "U", [lord(F.zombie, 1, 1)]),
  sor("trb11", "墓から這う群れ", "{3}{B}", "U", spell([E.token(2, 2, 2, "B", "ゾンビ"), iff("threshold", E.token(1, 2, 2, "B", "ゾンビ"))])),
  cr("trb12", "腐った歩兵", "{1}{B}", "ゾンビ", 2, 1, "U", [kw("不屈")]),
  cr("trb13", "疫病のゾンビ", "{2}{B}", "ゾンビ", 2, 3, "C", [etb(E.lose(1))]),
  cr("trb14", "騎士団の指揮官", "{1}{W}{W}", "人間・騎士", 2, 2, "U", [lord(F.knight, 1, 1)]),
  cr("trb15", "遍歴の騎士", "{1}{W}", "人間・騎士", 2, 1, "C", [kw("先制攻撃")]),
  cr("trb16", "黒騎士", "{B}{B}", "人間・騎士", 2, 2, "C", [kw("先制攻撃"), etb(iff(control(F.knight, 2), E.lose(1)))]),
  cr("trb17", "ウィザード塔の長", "{2}{U}", "人間・ウィザード", 2, 2, "U", [lord(F.wizard, 1, 1)]),
  ench("trb18", "ドラゴンの巣", "{3}{R}", "R", [discount({ sub: "ドラゴン" }, 2), allyEnter({ sub: "ドラゴン" })(E.dmgOpp(2))]),
  cr("trb19", "子竜", "{1}{R}", "ドラゴン", 1, 1, "C", [kw("飛行"), act({ mana: "{R}" }, E.pumpSelf(1, 0))]),
  cr("trb20", "海の民の長", "{U}{U}", "マーフォーク", 2, 2, "U", [lord({ sub: "マーフォーク" }, 1, 1)]),
]);
void discount;
void etb;
