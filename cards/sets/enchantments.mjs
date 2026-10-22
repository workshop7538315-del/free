// エンチャント:オーラ、エンチャント・クリーチャー、「エンチャントが出るたび」(星座)。白・緑・青が中心。
import { cr, ecr, ins, sor, ench, art, aura, kw, spell, etb, allyEnter, act, stat, lord, scale, F, T, E, countPerm, tagAll } from "../lib.mjs";

const buff = (p, t, kws) => stat({ s: "auraBuff", p, t, ...(kws ? { kw: kws } : {}) });
const onEnchant = allyEnter(F.enchant);

export const ENCHANTMENTS = tagAll("エンチャント", [
  aura("enc01", "祈りの光輪", "{W}", "C", [buff(1, 1, ["絆魂"])]),
  aura("enc02", "天啓の鎧", "{1}{W}", "C", [buff(2, 2)]),
  aura("enc03", "光輝の翼", "{2}{W}", "U", [buff(1, 1, ["飛行"])]),
  ecr("enc04", "星座の祭司", "{1}{W}", "人間・クレリック", 2, 2, "U", [onEnchant(E.gain(2))]),
  ench("enc05", "聖域の結界", "{2}{W}", "R", [onEnchant(E.token(1, 1, 1, "W", "スピリット", ["飛行"]))]),
  ecr("enc06", "加護を授ける者", "{3}{W}", "スピリット", 2, 4, "R", [kw("飛行"), scale(countPerm(F.enchant), 1, 0)]),
  ecr("enc07", "夢見の霧", "{1}{U}", "スピリット", 1, 3, "C", [onEnchant(E.lookTop())]),
  aura("enc08", "深海の祝福", "{1}{U}", "C", [buff(1, 1, ["呪禁"]), etb(E.draw(1))]),
  aura("enc09", "夢の帳", "{2}{U}", "C", [stat({ s: "pacify" })]),
  ench("enc10", "星図の書斎", "{2}{U}", "R", [onEnchant(E.draw(1))]),
  aura("enc11", "呪縛の烙印", "{1}{B}", "C", [buff(-2, -2)]),
  ench("enc12", "死の契約", "{2}{B}", "U", [onEnchant([E.lose(1), E.gain(1)])]),
  ecr("enc13", "怨念の霊", "{2}{B}", "スピリット", 2, 2, "C", [kw("接死")]),
  aura("enc14", "炎の紋章", "{R}", "C", [buff(2, 0, ["速攻"])]),
  ench("enc15", "火の神殿", "{2}{R}", "U", [onEnchant(E.dmgOpp(1)), etb(E.dmgOpp(1))]),
  aura("enc16", "森の祝福", "{G}", "C", [buff(1, 2, ["到達"])]),
  aura("enc17", "大地の力", "{2}{G}", "U", [buff(3, 3, ["トランプル"])]),
  ecr("enc18", "星座の牡鹿", "{2}{G}", "鹿", 3, 3, "C", [onEnchant(E.countersSelf(1))]),
  ench("enc19", "豊穣の神殿", "{1}{G}", "U", [onEnchant(E.ramp(1))]),
  ecr("enc20", "森の女神", "{3}{G}{G}", "神", 4, 5, "R", [kw("到達"), scale(countPerm(F.enchant), 1, 1)]),
  ench("enc22", "調和の祭壇", "{G}{W}", "U", [lord(F.enchant, 1, 1, undefined, false)]),
  sor("enc23", "星々の導き", "{1}{W}{U}", "U", spell([E.tutor(F.enchant), E.gain(2)])),
  ecr("enc24", "夢魔", "{1}{U}{B}", "ホラー", 2, 3, "U", [kw("飛行"), etb(E.discard(1, "opp"))]),
  ecr("enc25", "炎樹の精霊", "{R}{G}", "エレメンタル", 3, 2, "C", [kw("速攻")]),
  ecr("enc26", "星座の守護獣", "{2}{G}{W}", "ビースト", 3, 4, "R", [onEnchant(E.countersAll(1))]),
  ins("enc27", "浄化の光", "{1}{W}", "C", spell(E.exile(), T.perm(["エンチャント", "アーティファクト"], "opp"))),
  art("enc28", "古き星座盤", "{3}", "U", [act({ mana: "{3}", tap: true }, E.tutor(F.enchant))]),
  aura("enc29", "呪いの重圧", "{2}{B}", "U", [buff(-3, -3)]),
]);

// 未使用の番号 enc21, enc30 は欠番(後から追加するときに使える)
void cr;
