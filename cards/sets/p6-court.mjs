// 第6弾「宮廷の暗闘」(新規展開) 3つの単語:貴族・陰謀・決闘
//   表では貴族が剣を抜いて決闘し、裏では陰謀が相手の手札と戦力を削る。
//   決闘:自分のクリーチャーと相手のクリーチャーが互いにパワー分のダメージを与え合う。相手だけが倒れたら「勝ち」。
//   陰謀 ―:このターン、対戦相手がカードを捨てたか、対戦相手のクリーチャーが戦場を離れていたなら有効。
//   貴族:新しい種族。各色にいて、白・黒・多色の貴族が仲間を強くする。
import {
  cr, acr, ins, sor, ench, art, equipment, kw, spell, etb, attacks, endStep, duelWin, stat, lord, selfIf, discount, mana, control,
  T, E,
} from "../lib.mjs";

const NOBLE = { sub: "貴族" };
/** アーキタイプのタグ */
const tag = (tags, c) => ({ ...c, tags: [...new Set([...(c.tags ?? []), ...[tags].flat()])] });
const D = "決闘";
const I = "陰謀";
const N = "貴族";
const duelTargets = [T.you, T.opp];

export const COURT = [
  // ---------------------------------------------------------------- 白:誇り高い騎士と貴族
  tag(N, cr("ct01", "宮廷の衛士", "{1}{W}", "人間・兵士", 2, 2, "C", [selfIf(control(NOBLE, 1), 1, 1, ["警戒"])])),
  tag(D, cr("ct02", "白銀の決闘者", "{1}{W}", "人間・騎士", 2, 1, "U", [kw("先制攻撃"), etb(E.duelSelf(), T.opp)])),
  tag(D, cr("ct03", "誉れの剣術指南", "{2}{W}", "人間・騎士", 2, 3, "U", [kw("先制攻撃"), duelWin(E.token(1, 1, 1, "W", "人間・兵士"))])),
  tag(D, ins("ct04", "公爵夫人の庇護", "{1}{W}", "C", spell(E.pump(1, 3, ["先制攻撃"]), T.you))),
  tag(N, cr("ct05", "白百合の公爵", "{3}{W}{W}", "人間・貴族", 4, 4, "R", [kw("警戒"), lord(NOBLE, 1, 1)])),
  tag(D, sor("ct06", "御前試合", "{2}{W}", "U", spell([E.pump(2, 2, undefined, 0), E.duel(E.gain(3))], duelTargets))),
  // ---------------------------------------------------------------- 青:密偵と情報
  tag(I, cr("ct07", "宮廷の密告者", "{1}{U}", "人間・ならず者", 1, 2, "C", [endStep(E.draw(1), undefined, { if: "intrigue" })])),
  tag(I, ins("ct08", "影の書簡", "{3}{U}", "C", spell([E.bounce(0), E.draw(1)], T.opp))),
  tag([I, N], cr("ct09", "宮廷魔術師", "{2}{U}", "人間・ウィザード・貴族", 2, 3, "U", [selfIf("intrigue", 1, 1, ["飛行"])])),
  tag([I, N], cr("ct10", "影の宰相", "{3}{U}{U}", "人間・貴族", 3, 5, "R", [kw("飛行"), endStep(E.draw(2), undefined, { if: "intrigue" })])),
  tag(I, ins("ct11", "密談", "{1}{U}", "C", spell([{ ...E.draw(1), unless: "intrigue" }, { ...E.draw(2), if: "intrigue" }]))),
  // ---------------------------------------------------------------- 黒:毒と暗殺
  tag(I, cr("ct12", "毒杯の給仕", "{2}{B}", "人間・ならず者", 2, 2, "C", [kw("接死")])),
  tag(I, ins("ct13", "暗殺者の契約", "{1}{B}", "C", spell(E.destroy(0), { t: "creature", who: "opp", maxPower: 3 }))),
  tag([I, N], cr("ct14", "夜会の吸血鬼", "{2}{B}", "吸血鬼・貴族", 2, 2, "U", [kw("飛行"), endStep([E.lose(2), E.gain(2)], undefined, { if: "intrigue" })])),
  tag(I, cr("ct15", "囁く侍従", "{1}{B}", "人間・ならず者", 1, 1, "C", [etb(E.discard(1, "opp"))])),
  tag([I, N], cr("ct16", "黒薔薇の伯爵", "{3}{B}{B}", "吸血鬼・貴族", 4, 4, "R", [kw("飛行"), endStep(E.sac(), undefined, { if: "intrigue" })])),
  tag(I, sor("ct17", "葬られた密約", "{2}{B}", "U", spell(E.discard(2, "opp")))),
  // ---------------------------------------------------------------- 赤:血気と挑戦
  tag(D, cr("ct18", "喧嘩っ早い剣士", "{R}", "人間・戦士", 2, 1, "C", [kw("速攻"), duelWin(E.countersSelf(1))])),
  tag(D, sor("ct19", "果たし状", "{R}", "C", spell(E.duel(E.dmgOpp(2)), duelTargets))),
  tag(D, cr("ct20", "決闘場の勇者", "{2}{R}", "人間・戦士", 3, 2, "U", [kw("先制攻撃"), etb(E.duelSelf(), T.opp)])),
  tag(D, ench("ct21", "挑発の旗", "{2}{R}", "U", [stat({ s: "anthem", p: 1, t: 0 }), duelWin(E.dmgOpp(1))])),
  tag([D, N], cr("ct22", "炎剣の侯爵", "{3}{R}{R}", "人間・貴族", 5, 4, "R", [kw("速攻", "先制攻撃"), attacks(E.duelSelf(), T.opp)])),
  tag(D, ins("ct23", "反撃の一閃", "{1}{R}", "C", spell(E.duel(), duelTargets))),
  // ---------------------------------------------------------------- 緑:野生の力比べ
  tag(D, cr("ct24", "森の決闘者", "{1}{G}", "エルフ・戦士", 2, 2, "C", [duelWin(E.ramp(1))])),
  tag(D, sor("ct25", "獣王の挑戦", "{G}", "C", spell(E.duel(E.counters(1, 0)), duelTargets))),
  tag(D, cr("ct26", "角突きの大鹿", "{3}{G}", "ビースト", 4, 4, "U", [etb(E.duelSelf(), T.opp)])),
  tag(N, cr("ct27", "エルフの辺境伯", "{2}{G}", "エルフ・貴族", 2, 3, "U", [mana("any"), lord(NOBLE, 0, 1)])),
  tag(D, cr("ct28", "大樹の守護騎士", "{4}{G}{G}", "人間・騎士", 6, 6, "R", [kw("トランプル"), etb(E.duelSelf(E.draw(1)), T.opp)])),
  tag(D, sor("ct29", "縄張り争い", "{2}{G}", "U", spell([E.counters(1, 0), E.duel(E.draw(1))], duelTargets))),
  // ---------------------------------------------------------------- 多色
  tag([N, I], cr("ct30", "宮廷の女王", "{2}{W}{B}", "人間・貴族", 3, 4, "M", [kw("絆魂"), lord(NOBLE, 1, 1)])),
  tag([D, N], cr("ct31", "剣と薔薇の騎士", "{R}{W}", "人間・騎士・貴族", 2, 2, "U", [kw("先制攻撃"), etb(E.duelSelf(), T.opp)])),
  tag([I, N], cr("ct32", "毒蛇の大使", "{U}{B}", "人間・ならず者・貴族", 2, 2, "U", [etb(E.discard(1, "opp")), selfIf("intrigue", 1, 1, ["飛行"])])),
  tag(D, ench("ct33", "誓いの決闘場", "{R}{G}", "U", [duelWin(E.draw(1))])),
  tag([I, N], cr("ct34", "陰謀団の首魁", "{1}{U}{B}", "人間・貴族", 3, 3, "R", [endStep([E.lose(2), E.draw(1)], undefined, { if: "intrigue" })])),
  tag([D, I], ins("ct35", "断頭台の宣告", "{B}{R}", "U", spell(E.duel(E.discard(1, "opp")), duelTargets))),
  tag([D, N], cr("ct36", "王家の巡察", "{1}{G}{W}", "人間・貴族", 3, 3, "U", [kw("警戒"), etb(E.duelSelf(E.gain(2)), T.opp)])),
  tag([N, I], ench("ct37", "三家の盟約", "{W}{U}{B}", "R", [lord(NOBLE, 1, 1, undefined, false), endStep(E.draw(1), undefined, { if: "intrigue" })])),
  // ---------------------------------------------------------------- 欠色
  tag([D, "装備"], equipment("ct38", "決闘用の細剣", "{1}", "U", "{2}", { p: 1, t: 0, kw: ["接死"] })),
  tag(N, art("ct39", "王家の印章", "{3}", "U", [mana("any"), discount(NOBLE, 1)])),
  tag(D, acr("ct40", "審判の像", "{4}", "構築物", 3, 4, "U", [kw("警戒"), etb(E.duelSelf(), T.opp)])),
];
