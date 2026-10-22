// マナ総量3:マナ総量がちょうど3のカードで固めると得をする。全色+欠色。
import { cr, acr, ins, sor, art, kw, spell, etb, dies, onCast, lord, discount, F, T, E, tagAll } from "../lib.mjs";

const on3 = onCast(F.mv3);

export const THREE = tagAll("マナ総量3", [
  cr("thr01", "三日月の巡礼者", "{2}{W}", "人間・クレリック", 2, 3, "C", [on3(E.gain(1))]),
  ins("thr02", "三位の盾", "{W}", "C", spell(E.pump(2, 2, ["破壊不能"]), T.creF(F.mv3, "you"))),
  cr("thr03", "三叉の賢者", "{2}{U}", "マーフォーク・ウィザード", 2, 2, "U", [on3([E.draw(1), E.discard(1)])]),
  ins("thr04", "三重の否認", "{1}{U}{U}", "C", spell(E.counter(), { t: "spell", maxMV: 3 })),
  cr("thr05", "三途の渡し守", "{2}{B}", "ゾンビ", 3, 2, "U", [dies(E.tutor({ mv: 3, type: "クリーチャー" }))]),
  sor("thr06", "三度の呪い", "{1}{B}{B}", "C", spell([E.lose(2), E.discard(1, "opp")])),
  cr("thr07", "三つ首の猟犬", "{1}{R}{R}", "ヘルハウンド", 3, 2, "C", [kw("速攻")]),
  ins("thr08", "三連の火球", "{2}{R}", "C", spell(E.dmg(3), T.any)),
  cr("thr09", "三本角の獣", "{2}{G}", "ビースト", 3, 3, "C", [kw("トランプル")]),
  sor("thr10", "三つ葉の導き", "{2}{G}", "U", spell(E.tutor(F.mv3))),
  art("thr11", "三角の祭壇", "{3}", "U", [discount(F.mv3, 1)]),
  acr("thr12", "三連の歯車", "{3}", "構築物", 3, 3, "C", [on3(E.pumpSelf(1, 1))]),
  acr("thr13", "三相の観測者", "{3}", "構築物", 2, 2, "U", [etb(E.tutor({ mv: 3, type: "クリーチャー" }))]),
  art("thr14", "三位一体の像", "{3}", "R", [lord(F.mv3, 1, 1, undefined, false)]),
  sor("thr15", "三賢の評議", "{1}{W}{U}", "U", spell([E.draw(2), E.gain(2)])),
  sor("thr16", "三つ巴の炎", "{1}{B}{R}", "U", spell(E.dmgAllOpp(1, true))),
  cr("thr17", "三つ子の精霊", "{1}{G}{U}", "エレメンタル", 3, 3, "U", [on3(E.ramp(1))]),
  cr("thr18", "三騎士の長", "{1}{R}{W}", "人間・騎士", 3, 3, "U", [kw("先制攻撃")]),
  cr("thr19", "三途の大樹", "{1}{B}{G}", "ツリーフォーク", 2, 4, "U", [on3(E.ret("mana"), T.gy)]),
  sor("thr20", "三度目の正直", "{1}{W}{W}", "U", spell(E.ret("battlefield"), T.gyF({ mv: 3, type: "クリーチャー" }))),
  cr("thr21", "三日月の幻影", "{2}{U}", "イリュージョン", 3, 2, "C", [kw("飛行")]),
  ins("thr22", "三番目の刃", "{2}{B}", "C", spell(E.destroy(), T.creF({ maxMV: 3 }))),
]);
