// 呪文:インスタントとソーサリーを唱えるたびに得をする(青赤)。追加払いや循環も。
import { cr, ins, sor, art, kw, spell, etb, castSpell, kicker, cycling, discount, F, T, E, iff, unless, count, tagAll } from "../lib.mjs";

const K = "kicked";

export const SPELLS = tagAll("呪文", [
  cr("spl01", "見習い魔術師", "{U}", "人間・ウィザード", 1, 1, "C", [castSpell(E.pumpSelf(1, 1))]),
  ins("spl02", "ひらめき", "{1}{U}", "C", spell([E.lookTop(), E.draw(1)])),
  cr("spl03", "秘術の学徒", "{1}{U}", "人間・ウィザード", 1, 3, "C", [castSpell(E.lookTop())]),
  cr("spl04", "渦の大魔術師", "{3}{U}{U}", "人間・ウィザード", 3, 4, "R", [castSpell(E.draw(1))]),
  ins("spl05", "小さな否認", "{U}", "C", [spell(E.counter(), { t: "spell", maxMV: 2 }), cycling("{2}")]),
  ins("spl06", "天候操作", "{3}{U}", "C", spell([E.bounce(), E.draw(1)], T.cre)),
  cr("spl07", "火花術師", "{1}{R}", "人間・ウィザード", 2, 1, "C", [castSpell(E.dmgOpp(1))]),
  cr("spl08", "炎の練達者", "{R}{R}", "人間・ウィザード", 2, 2, "U", [kw("速攻"), castSpell(E.pumpSelf(2, 0))]),
  ins("spl09", "稲妻の連鎖", "{1}{R}", "C", [kicker("{2}"), spell([unless(K, E.dmg(2)), iff(K, E.dmg(4))], T.any)]),
  sor("spl10", "焦熱の書", "{R}", "C", spell([E.dmg(1), E.draw(1)], T.any)),
  cr("spl11", "炎嵐の魔導師", "{3}{R}{R}", "人間・ウィザード", 3, 3, "R", [castSpell(E.dmg(2), T.any)]),
  sor("spl12", "衝動", "{1}{R}", "C", spell([E.discard(1), E.draw(2)])),
  cr("spl13", "嵐の双子", "{1}{U}{R}", "エレメンタル", 2, 3, "U", [kw("飛行"), castSpell(E.pumpSelf(1, 1))]),
  sor("spl14", "知の炎", "{2}{U}{R}", "U", spell(E.dmg(count("hand")), T.any)),
  cr("spl15", "嵐の王", "{3}{U}{R}", "ドラゴン", 4, 4, "R", [kw("飛行"), castSpell(E.dmgOpp(2))]),
  ins("spl17", "大いなる知恵", "{X}{U}{U}", "R", spell(E.draw("X"))),
  sor("spl18", "爆炎", "{X}{R}{R}", "R", spell(E.dmgAllOpp("X"))),
  cr("spl19", "速攻の呪文使い", "{R}", "ゴブリン・ウィザード", 1, 1, "C", [kw("速攻"), castSpell(E.pumpSelf(1, 0))]),
  cr("spl20", "霧の術士", "{2}{U}", "人間・ウィザード", 2, 3, "C", [kw("瞬速"), etb(E.tap(), T.opp)]),
  ins("spl21", "呪文返し", "{1}{U}{U}", "U", [kicker("{2}"), spell([E.counter(), iff(K, E.draw(2))], T.spell)]),
  sor("spl22", "火の玉の雨", "{4}{R}{R}", "U", spell(E.dmg(5), T.any)),
  ins("spl23", "魔力の奔流", "{U}{R}", "C", spell([E.draw(2), E.discard(1)])),
  art("spl24", "呪文書の写本", "{2}", "R", [discount(F.spell, 1)]),
]);
// spl16 は欠番
