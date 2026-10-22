// その他:追加払い・循環・背水・獰猛・二段攻撃・破壊不能などを持つカード。
import { cr, acr, ins, kw, spell, etb, kicker, cycling, selfIf, T, E, iff } from "../lib.mjs";

export const MISC = [
  cr("mis01", "戦乙女", "{2}{W}", "人間・兵士", 2, 2, "U", [kw("飛行"), kicker("{2}{W}"), etb(iff("kicked", E.countersSelf(2)))]),
  cr("mis02", "嵐の大海蛇", "{5}{U}{U}", "海蛇", 7, 7, "C", [cycling("{2}")]),
  cr("mis03", "背水の亡霊", "{1}{B}", "スピリット", 2, 2, "U", [selfIf("hellbent", 2, 1, ["飛行"])]),
  cr("mis04", "双刃の剣士", "{2}{R}", "人間・戦士", 2, 2, "U", [kw("二段攻撃")]),
  ins("mis05", "獰猛な咆哮", "{1}{G}", "C", spell([E.pump(2, 2), iff("ferocious", E.draw(1))], T.cre)),
  acr("mis06", "不滅の像", "{5}", "ゴーレム", 4, 4, "U", [kw("破壊不能")]),
  cr("mis07", "混沌の双頭竜", "{3}{B}{R}", "ドラゴン", 4, 4, "M", [kw("飛行", "二段攻撃")]),
];
