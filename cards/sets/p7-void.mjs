// 第7弾「虚無の胎動」(新規展開) 3つの単語:虚無・裏向き・欠色
//   すべて欠色のカード。色を奪い、色を捨て、何もないところから力を得る。
//   虚無(種族・呪文の種類):コストに {C} を持ち、欠色のマナでなければ唱えられない。
//   略奪 N:相手のマナゾーンのカードを裏向き(欠色)にして、タップ状態で自分のマナゾーンに置く(この弾から裏向きになった)。
//   虚化 N:自分のマナゾーンの表向きのカードをN枚裏向き(欠色)にする。
//   虚空 ―:自分のマナゾーンの半分以上が欠色なら / 真空 ―:自分のマナゾーンがすべて欠色なら。
import {
  cr, acr, ins, sor, ench, art, kw, spell, etb, attacks, upkeep, charge, stat, lord, scale, selfIf, discount, mana, crest, tagAll, count,
  T, E,
} from "../lib.mjs";

const VOID = { sub: "虚無" };
const V = { subtype: "虚無" }; // 呪文・エンチャント・アーティファクトの「虚無」
const colorless = count("colorlessMana");
const drone = (n) => E.token(n, 1, 1, "C", "虚無・ドローン");
const voidIf = (cond, e) => ({ ...e, if: cond });
const voidUnless = (cond, e) => ({ ...e, unless: cond });

export const VOIDS = tagAll("虚無", [
  // ---------------------------------------------------------------- 欠色を集める(虚無ではない。どのマナでも唱えられる)
  art("vd01", "虚ろの石", "{2}", "C", [mana("{C}")]),
  art("vd02", "裏返しの鏡", "{4}", "C", [etb([E.veil(2), E.draw(1)])]),
  sor("vd03", "色抜きの儀", "{2}", "C", spell([E.veil(1), E.draw(1)])),
  art("vd04", "無色の祭壇", "{3}", "U", [mana("{C}{C}")]),
  sor("vd05", "虚無の呼び声", "{2}", "U", spell(E.tutor(VOID))),
  art("vd06", "侵蝕の楔", "{3}", "U", [etb(E.plunder(1))]),
  acr("vd07", "色抜きの番人", "{2}", "構築物", 1, 3, "C", [mana("{C}")]),
  // ---------------------------------------------------------------- 虚無のクリーチャー
  cr("vd08", "虚無の幼生", "{C}", "虚無・ドローン", 1, 1, "C", [selfIf("void", 1, 0)]),
  cr("vd09", "虚無の斥候", "{1}{C}", "虚無・ドローン", 2, 2, "C", [selfIf("vacuum", 0, 0, ["速攻"])]),
  cr("vd10", "色彩の吸収者", "{3}{C}", "虚無・ホラー", 2, 3, "U", [etb(E.plunder(1))]),
  cr("vd11", "欠色を喰らうもの", "{3}{C}", "虚無・ホラー", 0, 4, "U", [scale(colorless, 1, 0)]),
  cr("vd12", "深淵の眼", "{2}{C}", "虚無・眼", 1, 4, "C", [kw("飛行"), etb([E.veil(1), E.draw(1)])]),
  cr("vd13", "虚無の触手", "{1}{C}{C}", "虚無・ホラー", 3, 3, "C", [selfIf("vacuum", 0, 0, ["威迫"])]),
  cr("vd14", "裏返る巨人", "{4}{C}", "虚無・巨人", 5, 5, "U", [etb(E.plunder(1))]),
  cr("vd15", "虚無の司祭", "{2}{C}", "虚無・クレリック", 2, 2, "U", [discount(VOID, 1)]),
  cr("vd16", "虚無の大口", "{5}{C}{C}", "虚無・巨獣", 7, 7, "R", [kw("トランプル"), etb(E.plunder(1))]),
  cr("vd17", "終焉をもたらすもの", "{7}{C}{C}", "虚無・巨獣", 10, 10, "M", [kw("トランプル"), etb(E.plunder(2))]),
  cr("vd18", "虚無の群体", "{3}{C}", "虚無・ドローン", 2, 2, "C", [etb(drone(2))]),
  cr("vd19", "静寂の歩哨", "{2}{C}", "虚無・ドローン", 2, 4, "C", [kw("鉄壁")]),
  cr("vd20", "虚空の追跡者", "{3}{C}", "虚無・ホラー", 3, 3, "U", [selfIf("void", 0, 0, ["飛行"])]),
  cr("vd21", "色彩の簒奪者", "{4}{C}{C}", "虚無・ホラー", 4, 5, "R", [upkeep([E.lose(1), E.gain(1)], undefined, { if: "vacuum" })]),
  cr("vd22", "虚無の母体", "{4}{C}{C}", "虚無・母体", 2, 6, "R", [upkeep([voidUnless("vacuum", drone(1)), voidIf("vacuum", drone(2))])]),
  cr("vd23", "無に還すもの", "{4}{C}", "虚無・ホラー", 3, 3, "U", [etb(voidIf("vacuum", E.exile(0)), T.opp)]),
  cr("vd24", "虚ろな巨像", "{6}{C}", "虚無・巨人", 7, 7, "C", [selfIf("void", 0, 0, ["トランプル"])]),
  // ---------------------------------------------------------------- 虚無の呪文
  ins("vd25", "虚無の一撃", "{2}{C}", "C", spell([voidUnless("void", E.dmg(2)), voidIf("void", E.dmg(3))], T.any), V),
  ins("vd26", "消去", "{3}{C}", "U", spell(E.exile(0), { t: "creature", filter: { maxMV: 3 } }), V),
  ins("vd27", "虚無の封印", "{1}{C}{C}", "U", spell([E.counter(0), voidIf("vacuum", E.draw(1))], T.spell), V),
  sor("vd28", "色彩の剥奪", "{3}{C}", "U", spell([E.plunder(2), E.draw(1)]), V),
  sor("vd29", "虚無の拡散", "{5}{C}{C}", "R", spell(E.dmgAllOpp(3)), V),
  sor("vd30", "深淵への回帰", "{2}{C}", "C", spell(E.ret("hand"), T.gyF(VOID)), V),
  ins("vd31", "無の帳", "{2}{C}", "C", spell([E.tap(0, true), E.draw(1)], T.opp), V),
  sor("vd32", "虚無の帰結", "{5}{C}{C}", "M", spell([E.destroyAll(4), drone(3)]), V),
  // ---------------------------------------------------------------- 虚無のパーマネント
  ench("vd33", "虚無の門", "{2}{C}", "R", [lord(VOID, 1, 1, undefined, false)], V),
  ench("vd34", "裏返しの儀式", "{1}{C}", "U", [etb(E.veil(1)), upkeep(E.lookTop())], V),
  art("vd35", "虚無の刻印", "{1}{C}", "U", [mana("{C}"), crest(discount(VOID, 1))], V),
  // ---------------------------------------------------------------- 虚無のクリーチャー(続き)
  cr("vd36", "虚ろの残響", "{1}{C}", "虚無・スピリット", 2, 1, "C", [kw("輪廻")]),
  cr("vd37", "漂う虚無", "{2}{C}", "虚無・スピリット", 2, 2, "C", [kw("飛行")]),
  cr("vd38", "欠片の巨獣", "{4}{C}", "虚無・巨獣", 4, 4, "C", [selfIf("vacuum", 1, 1, ["トランプル"])]),
  cr("vd39", "虚無の祭司長", "{3}{C}{C}", "虚無・クレリック", 3, 4, "R", [upkeep(E.draw(1), undefined, { if: "vacuum" })]),
  cr("vd40", "色を奪う手", "{2}{C}", "虚無・ホラー", 2, 2, "U", [kw("威迫"), attacks([E.lose(1), E.gain(1)], undefined, { if: "void" })]),
]);

void charge;
void stat;
