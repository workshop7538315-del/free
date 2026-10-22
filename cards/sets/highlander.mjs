// 孤高:デッキに同名カードを2枚以上入れない(ハイランダー)と強くなる。
import { cr, ins, sor, ench, art, kw, spell, etb, upkeep, mana, selfIf, T, E, iff, unless, tagAll } from "../lib.mjs";

const HL = "highlander";

export const HIGHLANDER = tagAll("孤高", [
  cr("hig01", "孤高の聖騎士", "{2}{W}{W}", "人間・騎士", 3, 3, "R", [selfIf(HL, 2, 2, ["先制攻撃", "警戒"])]),
  ins("hig02", "唯一の誓い", "{W}", "U", spell([unless(HL, E.pump(2, 2)), iff(HL, E.pump(2, 2, ["破壊不能"]))], T.cre)),
  cr("hig03", "ただ一人の天使", "{3}{W}{W}", "天使", 4, 4, "M", [kw("飛行"), etb([iff(HL, E.gain(5)), iff(HL, E.token(2, 1, 1, "W", "スピリット", ["飛行"]))])]),
  cr("hig04", "孤高の賢者", "{2}{U}", "人間・ウィザード", 1, 3, "U", [etb([unless(HL, E.draw(1)), iff(HL, E.draw(2))])]),
  ench("hig05", "千の書架", "{1}{U}{U}", "R", [upkeep(E.draw(1), undefined, { if: HL })]),
  ins("hig06", "唯一無二の否定", "{1}{U}", "U", spell([E.counter(), iff(HL, E.draw(1))], { t: "spell", maxMV: 3 })),
  cr("hig07", "孤独な吸血鬼", "{1}{B}{B}", "吸血鬼", 2, 2, "U", [kw("飛行"), selfIf(HL, 2, 2, ["絆魂"])]),
  sor("hig08", "唯一の死", "{2}{B}", "U", spell([E.destroy(), iff(HL, E.gain(3))], T.cre)),
  ench("hig09", "墓所の独り言", "{B}{B}", "R", [upkeep(E.ret("hand"), T.gyCre, { if: HL })]),
  cr("hig10", "孤高の剣豪", "{1}{R}", "人間・戦士", 2, 1, "U", [kw("速攻"), selfIf(HL, 1, 0, ["二段攻撃"])]),
  ins("hig11", "唯一の炎", "{1}{R}", "C", spell([unless(HL, E.dmg(3)), iff(HL, E.dmg(4))], T.any)),
  cr("hig12", "独りの巨竜", "{4}{R}{R}", "ドラゴン", 5, 5, "M", [kw("飛行"), etb(iff(HL, E.dmgAllOpp(3)))]),
  cr("hig13", "孤高の巨獣", "{3}{G}{G}", "ビースト", 5, 5, "R", [kw("トランプル"), selfIf(HL, 2, 2, ["呪禁"])]),
  cr("hig14", "一本杉", "{1}{G}", "ツリーフォーク", 1, 4, "C", [kw("到達"), etb(iff(HL, E.ramp(1)))]),
  sor("hig15", "ただひとつの種", "{G}", "C", spell([unless(HL, E.ramp(1)), iff(HL, E.ramp(2))])),
  art("hig16", "唯一の鍵", "{2}", "U", [mana("any"), etb(iff(HL, E.draw(1)))]),
  cr("hig17", "孤高の王", "{W}{U}{B}{R}{G}", "人間・王", 5, 5, "M", [kw("飛行", "警戒"), etb([iff(HL, E.draw(2)), iff(HL, E.gain(5))])]),
  cr("hig18", "唯一の暴君", "{2}{R}{G}", "ビースト", 4, 4, "R", [kw("トランプル", "速攻"), selfIf(HL, 2, 2)]),
]);
