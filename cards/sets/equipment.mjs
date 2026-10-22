// 装備:装備品をクリーチャーにつけて強くする(欠色+白赤)。
import { cr, ench, equipment, kw, etb, allyEnter, selfIf, T, E, control, tagAll } from "../lib.mjs";

const EQ = { sub: "装備品" };
const HAS_EQ = control(EQ, 1);

export const EQUIPMENT = tagAll("装備", [
  equipment("eqp01", "鉄の剣", "{1}", "C", "{1}", { p: 2, t: 0 }),
  equipment("eqp02", "革の盾", "{1}", "C", "{1}", { p: 0, t: 2 }),
  equipment("eqp03", "騎士の槍", "{2}", "U", "{2}", { p: 2, t: 1, kw: ["先制攻撃"] }),
  equipment("eqp04", "翼のマント", "{2}", "U", "{1}", { p: 1, t: 1, kw: ["飛行"] }),
  equipment("eqp05", "巨人の大槌", "{3}", "U", "{2}", { p: 3, t: 0, kw: ["トランプル"] }),
  equipment("eqp06", "吸血の短剣", "{2}", "U", "{1}", { p: 1, t: 0, kw: ["絆魂"] }),
  equipment("eqp07", "不壊の鎧", "{3}", "R", "{2}", { p: 0, t: 2, kw: ["破壊不能"] }),
  equipment("eqp08", "英雄の剣", "{3}", "M", "{2}", { p: 1, t: 1, kw: ["二段攻撃"] }),
  cr("eqp09", "鍛冶師の弟子", "{1}{W}", "人間・職人", 2, 2, "U", [etb(E.tutor(EQ))]),
  cr("eqp10", "武装した巡礼者", "{W}", "人間・兵士", 2, 1, "C", [selfIf(HAS_EQ, 1, 1)]),
  ench("eqp11", "武具の聖堂", "{2}{W}", "R", [allyEnter(EQ)(E.token(1, 1, 1, "W", "人間・兵士"))]),
  cr("eqp12", "鍛冶場の火守り", "{2}{R}", "人間・職人", 2, 2, "U", [allyEnter(EQ)(E.dmgOpp(1))]),
  cr("eqp13", "戦場の鍛冶師", "{1}{R}", "人間・職人", 2, 1, "U", [etb(E.ret("battlefield"), T.gyF(EQ))]),
  cr("eqp14", "武装の達人", "{R}{W}", "人間・戦士", 2, 2, "R", [selfIf(HAS_EQ, 0, 0, ["二段攻撃"])]),
  equipment("eqp15", "王者の冠", "{3}", "R", "{1}", { p: 2, t: 2, kw: ["警戒"] }),
  cr("eqp16", "盾の乙女", "{1}{W}", "人間・兵士", 2, 3, "C", [selfIf(HAS_EQ, 1, 1, ["警戒"])]),
]);
void kw;
