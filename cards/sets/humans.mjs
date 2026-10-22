// 人間:数を並べて、人間の数で強くなる。白が中心、赤・緑・青・黒にも少し。
import { cr, ins, sor, ench, kw, etb, attacks, allyEnter, allyDies, upkeep, act, mana, lord, selfIf, discount, affinity, free, F, T, E, iff, control, countPerm, tagAll } from "../lib.mjs";

const H3 = control(F.human, 3);

export const HUMANS = tagAll("人間", [
  cr("hum01", "村の衛兵", "{W}", "人間・兵士", 1, 1, "C", [allyEnter(F.human)(E.countersSelf(1))]),
  cr("hum02", "旗を掲げる少年", "{W}", "人間・兵士", 1, 2, "C", [etb(iff(H3, E.draw(1)))]),
  cr("hum03", "開拓地の民兵", "{1}{W}", "人間・兵士", 2, 2, "C", [selfIf(H3, 1, 1, ["先制攻撃"])]),
  cr("hum04", "民衆の指導者", "{1}{W}{W}", "人間・貴族", 2, 2, "U", [lord(F.human, 1, 1)]),
  cr("hum05", "王都の近衛隊長", "{2}{W}", "人間・騎士", 2, 3, "U", [kw("警戒"), etb(E.token(1, 1, 1, "W", "人間・兵士"))]),
  sor("hum06", "群衆の声", "{W}{W}", "C", spell2(E.token(2, 1, 1, "W", "人間・兵士"))),
  ins("hum07", "結束の誓い", "{1}{W}", "C", spell2(E.pumpAll(2, 1, undefined, "you", F.human))),
  ench("hum08", "人の和", "{2}{W}", "R", [lord(F.human, 1, 0, undefined, false), allyEnter(F.human)(E.gain(1))]),
  cr("hum09", "義勇兵の行列", "{4}{W}", "人間・兵士", 3, 3, "U", [kw("警戒"), affinity(F.human)]),
  cr("hum10", "聖堂騎士団長", "{3}{W}{W}", "人間・騎士", 4, 4, "R", [kw("先制攻撃"), lord(F.human, 1, 1)]),
  cr("hum11", "街角の祈り手", "{1}{W}", "人間・クレリック", 2, 2, "C", [free(H3), etb(E.gain(2))]),
  sor("hum12", "新兵募集", "{1}{W}", "U", spell2(E.tutor({ sub: "人間", maxMV: 2 }))),
  cr("hum13", "下町の喧嘩屋", "{R}", "人間・戦士", 1, 1, "C", [kw("速攻"), selfIf(H3, 2, 0)]),
  cr("hum14", "鍛冶屋の徒弟", "{1}{R}", "人間・職人", 2, 1, "U", [allyEnter(F.human)(E.dmgOpp(1))]),
  cr("hum15", "街の暴れ者", "{4}{R}", "人間・戦士", 4, 3, "C", [kw("速攻"), affinity(F.human)]),
  ins("hum16", "先陣の雄叫び", "{1}{R}", "C", spell2(E.pumpAll(1, 0, ["先制攻撃"], "you", F.human))),
  cr("hum17", "革命の指導者", "{2}{R}{R}", "人間・戦士", 3, 3, "R", [kw("速攻"), attacks(E.pumpAll(1, 0, undefined, "you", F.human))]),
  cr("hum18", "開墾民", "{G}", "人間・ドルイド", 1, 1, "C", [mana("{G}")]),
  cr("hum19", "森の狩人", "{2}{G}", "人間・レンジャー", 3, 2, "C", [kw("到達"), etb(iff(H3, E.countersSelf(1)))]),
  sor("hum20", "開拓団", "{3}{G}", "U", spell2([E.token(3, 1, 1, "G", "人間・兵士"), E.ramp(1)])),
  cr("hum21", "豊穣の村長", "{2}{G}{G}", "人間・ドルイド", 3, 3, "R", [upkeep(E.draw(1), undefined, { if: H3 })]),
  cr("hum22", "港町の学者", "{1}{U}", "人間・ウィザード", 1, 3, "C", [etb(iff(H3, E.draw(1)))]),
  cr("hum23", "王宮の密偵", "{2}{U}", "人間・ならず者", 2, 2, "C", [kw("瞬速"), etb(E.tap(), T.opp)]),
  cr("hum24", "貧民街の盗賊", "{1}{B}", "人間・ならず者", 2, 1, "C", [etb(iff(H3, E.discard(1, "opp")))]),
  cr("hum25", "闇市の商人", "{2}{B}", "人間・ならず者", 2, 2, "U", [allyDies([E.lose(1), E.gain(1)])]),
  cr("hum26", "民衆の英雄", "{R}{W}", "人間・戦士", 2, 2, "U", [kw("速攻"), lord(F.human, 1, 0)]),
  cr("hum27", "開拓地の守り手", "{G}{W}", "人間・兵士", 2, 3, "U", [etb(E.token(1, 1, 1, "W", "人間・兵士"))]),
  cr("hum28", "異端審問官", "{1}{W}{B}", "人間・クレリック", 3, 2, "U", [etb(E.destroy(), { t: "creature", who: "opp", maxPower: 2 })]),
  cr("hum29", "王国の参謀", "{W}{U}", "人間・アドバイザー", 1, 3, "U", [discount(F.human, 1)]),
  sor("hum30", "蜂起", "{2}{R}{W}", "R", spell2(E.token(countPerm(F.human), 1, 1, "R", "人間・戦士", ["速攻"]))),
  ins("hum31", "人の世の守り", "{W}", "C", spell2(E.pump(0, 0, ["破壊不能"]), T.creF(F.human, "you"))),
  sor("hum32", "人類の夜明け", "{4}{W}{W}", "M", spell2([E.token(4, 1, 1, "W", "人間・兵士"), E.countersAll(1, F.human)])),
]);

function spell2(effects, targets) {
  return { a: "spell", effects: [effects].flat(), ...(targets ? { targets: [targets].flat() } : {}) };
}
