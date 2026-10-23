// 第5弾「再燃の炎」(既存カード強化) 3つの単語:再燃・鍛錬・継承
//   総当たり戦で苦戦した赤系・装備・生け贄・呪文・エルフ・鉄機を立て直す。
//   新規カードはすべて basedOn で元のカードと関係(強化版 / リメイク / サポート)を記録する。
//   REKINDLE_REPRINTS は再録(カードはそのまま、収録パックに第5弾が加わる)。
import {
  cr, acr, ins, sor, ench, art, aura, equipment, kw, spell, etb, charge, castSpell, attacks, allyDies, allyEnter, upkeep, act,
  stat, lord, selfIf, discount, flashback, dash, mana, basedOn, T, E, F, iff, armed, countPerm, control,
} from "../lib.mjs";

const EQ = { sub: "装備品" };
const construct = (n) => E.token(n, 1, 1, "C", "構築物", undefined, true);
/** アーキタイプのタグを付ける(スターターデッキがテーマのカードとして拾う) */
const tag = (t, c) => ({ ...c, tags: [...new Set([...(c.tags ?? []), t])] });

export const REKINDLE = [
  // ---------------------------------------------------------------- 強化版:元のカードの上位互換
  basedOn(cr("rk01", "大火花の小鬼", "{R}", "ゴブリン", 2, 1, "C", [kw("速攻"), charge(E.dmg(1), T.any)]), "r001", "強化版"),
  basedOn(ins("rk02", "稲妻の閃光", "{R}", "U", spell([E.dmg(3), E.lookTop()], T.any)), "r002", "強化版"),
  basedOn(cr("rk03", "隊列の大指揮官", "{2}{W}{W}", "人間・騎士", 3, 3, "R", [lord(F.creature, 1, 1, ["警戒"])]), "w013", "強化版"),
  tag("装備", basedOn(equipment("rk04", "英雄の聖剣", "{2}", "M", "{2}", { p: 2, t: 2, kw: ["二段攻撃"] }), "eqp08", "強化版")),
  tag("呪文", basedOn(cr("rk05", "嵐の大術士", "{1}{U}{R}", "人間・ウィザード", 3, 4, "R", [castSpell([E.dmgOpp(1), E.lookTop()])]), "m018", "強化版")),
  tag("部族", basedOn(cr("rk06", "エルフの大神秘家", "{G}", "エルフ・ドルイド", 1, 2, "U", [mana("any"), etb(E.lookTop())]), "trb09", "強化版")),
  tag("鉄機", basedOn(art("rk07", "鉄機の大司令塔", "{3}", "R", [lord(F.artifact, 1, 1, undefined, false), etb(construct(1))]), "tek04", "強化版")),
  tag("生け贄", basedOn(ench("rk08", "魂の大焼却炉", "{1}{B}{R}", "R", [allyDies([E.dmgOpp(1), E.gain(1)]), act({ sac: {} }, E.dmg(1), T.any)]), "ari12", "強化版")),
  basedOn(cr("rk09", "狂乱の小鬼王", "{1}{R}{R}", "ゴブリン", 2, 2, "R", [lord(F.creature, 1, 1, ["速攻"])]), "r019", "強化版"),
  basedOn(cr("rk10", "赤熱の大巨人", "{3}{R}{R}", "巨人", 5, 5, "R", [kw("速攻", "トランプル")]), "r023", "強化版"),
  // ---------------------------------------------------------------- リメイク:元のカードの考え方を、別の形で作り直す
  basedOn(cr("rk11", "先陣の旗手", "{2}{R}{W}", "人間・兵士", 3, 3, "U", [kw("速攻"), attacks(E.token(1, 1, 1, "W", "人間・兵士", ["速攻"]))]), "w017", "リメイク"),
  tag("呪文", basedOn(ins("rk12", "炎の呪文砕き", "{1}{U}{R}", "U", spell([E.counter(0), E.dmg(2, 1)], [{ t: "spell", noncreature: true }, T.any])), "u012", "リメイク")),
  tag("装備", basedOn(cr("rk13", "武具の英雄", "{1}{R}{W}", "人間・騎士", 3, 2, "R", [kw("先制攻撃"), etb(E.ret("battlefield"), T.gyF(EQ)), selfIf(control(EQ, 1), 1, 1)]), "eqp14", "リメイク")),
  tag("生け贄", basedOn(cr("rk14", "血盟の司祭", "{B}{R}", "人間・クレリック", 2, 2, "U", [act({ sac: {} }, E.dmg(2), T.any)]), "ari02", "リメイク")),
  tag("部族", basedOn(cr("rk15", "エルフの大号令", "{2}{G}{G}", "エルフ・ドルイド", 2, 2, "R", [etb(E.token(countPerm(F.elf), 1, 1, "G", "エルフ・戦士"))]), "trb08", "リメイク")),
  tag("鉄機", basedOn(art("rk16", "鉄機の量産工場", "{3}", "R", [upkeep(construct(1))]), "tek16", "リメイク")),
  tag("呪文", basedOn(cr("rk17", "嵐の詠唱者", "{U}{R}", "人間・ウィザード", 1, 2, "U", [castSpell(E.token(1, 1, 1, "R", "エレメンタル", ["速攻"]))]), "spl01", "リメイク")),
  tag("マナ武装", basedOn(cr("rk18", "烈火の戦士", "{R}", "人間・戦士", 2, 1, "C", [kw("速攻"), selfIf(armed("R", 3), 1, 1, ["先制攻撃"])]), "arm13", "リメイク")),
  // ---------------------------------------------------------------- サポート:元のカードやアーキタイプを支える
  tag("装備", basedOn(ench("rk19", "鍛冶の聖火", "{1}{R}", "U", [discount(EQ, 1), allyEnter(EQ)(E.token(1, 1, 1, "W", "人間・兵士"))]), "eqp08", "サポート")),
  tag("呪文", basedOn(ins("rk20", "炎の連詠", "{1}{R}", "C", [spell(E.dmg(3), T.any), flashback("{2}{R}")]), "spl07", "サポート")),
  tag("部族", basedOn(sor("rk21", "エルフの集い", "{1}{G}", "C", spell([E.tutor({ sub: "エルフ" }), E.ramp(1)])), "trb05", "サポート")),
  tag("生け贄", basedOn(cr("rk22", "志願兵の行列", "{1}{B}", "ゾンビ", 2, 2, "C", [etb(E.token(1, 1, 1, "B", "ゾンビ"))]), "ari15", "サポート")),
  tag("鉄機", basedOn(art("rk23", "鉄機の補給線", "{1}", "C", [etb(construct(1)), discount(F.artifact, 1)]), "tek13", "サポート")),
  basedOn(aura("rk24", "赤き鍛錬", "{R}", "C", [stat({ s: "auraBuff", p: 2, t: 1, kw: ["先制攻撃", "速攻"] })]), "r006", "サポート"),
  tag("装備", basedOn(equipment("rk25", "継承の旗", "{2}", "U", "{1}", { p: 1, t: 1, kw: ["警戒"] }, [etb(E.token(1, 1, 1, "W", "人間・兵士"))]), "eqp03", "サポート")),
  basedOn(ins("rk26", "赤白の連携", "{R}{W}", "U", spell(E.pumpAll(2, 0, ["先制攻撃"]))), "m022", "サポート"),
  tag("呪文", basedOn(sor("rk27", "青赤の閃き", "{U}{R}", "C", spell([E.draw(2), E.discard(1), E.dmgOpp(1)])), "spl04", "サポート")),
  tag("部族", basedOn(cr("rk28", "エルフの戦士長", "{1}{G}", "エルフ・戦士", 2, 2, "C", [lord(F.elf, 1, 0)]), "trb05", "サポート")),
  tag("鉄機", basedOn(acr("rk29", "鉄機の突撃隊長", "{3}", "構築物", 2, 2, "U", [kw("速攻"), lord(F.artifact, 1, 0)]), "tek04", "サポート")),
  basedOn(cr("rk30", "灰の継承者", "{2}{R}", "人間・狂戦士", 3, 2, "C", [kw("輪廻"), dash("{R}")]), "adv12", "サポート"),
];

// 再録:元のカードをそのまま収録する(IDもデータも変わらない)
export const REKINDLE_REPRINTS = ["r008", "r006", "spl04", "ari05", "eqp03", "tek13", "trb05", "g006", "m022", "hum26"];

void sor;
void iff;
void upkeep;
