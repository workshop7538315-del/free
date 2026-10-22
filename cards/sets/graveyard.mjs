// 墓地:墓地を肥やして深淵(墓地7枚以上)を満たし、再演や墓地回収で使い回す。ライブラリー破壊も。
import { cr, acr, ins, sor, ench, art, kw, spell, etb, upkeep, act, flashback, selfIf, free, T, E, iff, unless, tagAll } from "../lib.mjs";

const TH = "threshold";

export const GRAVEYARD = tagAll("墓地", [
  cr("grv01", "墓場の鼠", "{B}", "ネズミ", 1, 1, "C", [etb(E.mill(3, "you"))]),
  cr("grv02", "這い出る屍", "{1}{B}", "ゾンビ", 2, 2, "C", [selfIf(TH, 2, 1)]),
  sor("grv03", "墓の囁き", "{B}", "C", spell([E.mill(3, "you"), E.draw(1)])),
  sor("grv04", "冥界からの帰還", "{2}{B}{B}", "U", [spell(E.ret("battlefield"), T.gyCre), flashback("{4}{B}{B}")]),
  cr("grv05", "骨の巨像", "{6}{B}", "ゾンビ・巨人", 6, 6, "R", [kw("威迫"), free(TH)]),
  ins("grv06", "屍肉の宴", "{1}{B}", "C", [spell(E.pump(-2, -2), T.cre), flashback("{3}{B}")]),
  cr("grv07", "墓所の大司祭", "{3}{B}", "人間・クレリック", 3, 4, "U", [etb(iff(TH, E.destroy()), T.opp)]),
  sor("grv09", "記憶の洪水", "{1}{U}", "C", spell(E.mill(5, "opp"))),
  ench("grv10", "底なしの淵", "{2}{U}{U}", "R", [upkeep(E.mill(3, "opp"))]),
  cr("grv11", "知識喰らい", "{2}{U}", "ホラー", 2, 4, "U", [etb(E.mill(4, "opp")), selfIf(TH, 1, 0, ["飛行"])]),
  cr("grv12", "深淵の大海蛇", "{5}{U}", "海蛇", 5, 5, "R", [kw("呪禁"), free(TH)]),
  ins("grv13", "打ち消しの残響", "{2}{U}", "C", [spell(E.counter(), { t: "spell", noncreature: true }), flashback("{4}{U}")]),
  cr("grv14", "腐葉土の獣", "{1}{G}", "ビースト", 2, 2, "C", [selfIf(TH, 2, 2)]),
  sor("grv15", "土に還る", "{G}", "C", spell([E.mill(3, "you"), E.ramp(1)])),
  sor("grv16", "再生の雨", "{2}{G}", "U", [spell(E.ret("hand"), T.gyCre), flashback("{4}{G}")]),
  cr("grv17", "大地の墓守", "{3}{G}", "エルフ・シャーマン", 3, 3, "U", [etb(E.mill(3, "you")), selfIf(TH, 3, 3, ["トランプル"])]),
  sor("grv18", "再演の種", "{1}{G}", "C", [spell(E.ramp(1)), flashback("{3}{G}")]),
  cr("grv19", "深き淵の魔術師", "{U}{B}", "人間・ウィザード", 2, 3, "U", [etb([E.mill(3, "you"), E.draw(1)])]),
  sor("grv20", "記憶の葬列", "{2}{U}{B}", "R", spell([E.mill(8, "opp"), E.draw(1)])),
  sor("grv21", "腐敗と再生", "{1}{B}{G}", "U", spell([E.mill(3, "you"), E.ret("hand")], T.gyCre)),
  cr("grv22", "墓地の王", "{2}{B}{G}", "ゾンビ・エルフ", 3, 3, "R", [etb(E.mill(3, "you")), selfIf(TH, 3, 3, ["トランプル"])]),
  sor("grv23", "死者の目覚め", "{B}", "C", [spell(E.ret("hand"), T.gyCre), flashback("{2}{B}")]),
  ins("grv24", "深淵の刃", "{B}", "C", spell([unless(TH, E.pump(-1, -1)), iff(TH, E.pump(-3, -3))], T.cre)),
  art("grv25", "墓所の扉", "{1}", "C", [act({ mana: "{2}", tap: true }, E.mill(2, "opp"))]),
  sor("grv26", "時の反復", "{2}{U}", "U", [spell(E.draw(2)), flashback("{5}{U}")]),
  sor("grv27", "燃える記憶", "{1}{R}", "C", [spell(E.dmg(2), T.any), flashback("{3}{R}")]),
  sor("grv28", "霊魂の集い", "{2}{W}", "C", [spell(E.token(1, 1, 1, "W", "スピリット", ["飛行"])), flashback("{3}{W}")]),
  cr("grv30", "永遠の死者", "{2}{B}{B}", "ゾンビ", 3, 3, "R", [kw("不屈")]),
]);
// grv08, grv29 は欠番
void acr;
