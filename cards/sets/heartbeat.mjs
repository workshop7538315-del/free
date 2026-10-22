// 鼓動:マナゾーンにカードが置かれるたびに得をする(上陸に相当)。マナゾーンの色の数を数える能力も(緑赤中心)。
import { cr, ins, sor, ench, art, kw, spell, etb, charge, manaEnter, upkeep, mana, scale, T, E, count, tagAll } from "../lib.mjs";

const colors = count("colorsInMana");

export const HEARTBEAT = tagAll("鼓動", [
  cr("hrt01", "鼓動の狼", "{1}{G}", "狼", 2, 2, "C", [manaEnter(E.pumpSelf(1, 1))]),
  cr("hrt02", "大地の芽", "{G}", "植物", 0, 2, "U", [manaEnter(E.countersSelf(1))]),
  ench("hrt03", "地脈の加護", "{1}{G}", "R", [manaEnter(E.counters(1), T.you)]),
  cr("hrt04", "地脈の巨人", "{4}{G}", "巨人", 4, 4, "C", [manaEnter(E.pumpSelf(2, 2))]),
  sor("hrt05", "地脈の呼び声", "{1}{G}", "U", spell(E.tutor({}, "mana"))),
  cr("hrt06", "七色の獣", "{2}{G}", "ビースト", 1, 1, "U", [scale(colors, 1, 1)]),
  sor("hrt07", "虹の大地", "{2}{G}", "U", spell(E.draw(colors))),
  ench("hrt08", "鼓動の炎", "{2}{R}", "U", [manaEnter(E.dmgOpp(1))]),
  cr("hrt09", "地脈の狂戦士", "{2}{R}", "人間・狂戦士", 2, 2, "C", [manaEnter(E.pumpSelf(2, 0))]),
  sor("hrt10", "大地割り", "{R}", "C", spell(E.dmg(colors), T.cre)),
  cr("hrt11", "地脈の竜", "{3}{R}{G}", "ドラゴン", 4, 4, "R", [kw("飛行"), manaEnter(E.dmg(1), T.any)]),
  sor("hrt12", "大地の怒り", "{2}{R}{G}", "U", spell(E.dmg(count("mana")), T.cre)),
  cr("hrt13", "地脈の賢者", "{G}{U}", "マーフォーク・ドルイド", 1, 2, "U", [manaEnter(E.lookTop())]),
  cr("hrt14", "地脈の聖騎士", "{1}{G}{W}", "人間・騎士", 2, 2, "R", [manaEnter(E.token(1, 1, 1, "W", "人間・兵士"))]),
  ench("hrt15", "虹の架け橋", "{1}{G}{U}", "R", [upkeep(E.ramp(1))]),
  cr("hrt16", "豊穣の精霊", "{3}{G}", "エレメンタル", 3, 3, "C", [etb(E.ramp(1, true))]),
  cr("hrt17", "地脈の探索者", "{G}", "エルフ・スカウト", 1, 1, "C", [etb(E.lookTop()), charge(E.ramp(1))]),
  art("hrt18", "七色の水晶", "{3}", "C", [mana("any"), etb(E.draw(1))]),
  cr("hrt19", "大地の化身竜", "{5}{G}{G}", "ドラゴン", 6, 6, "R", [kw("飛行"), etb(E.ramp(2))]),
  cr("hrt20", "火口の小鬼", "{R}", "ゴブリン", 1, 1, "C", [charge(E.dmg(2), T.cre)]),
  cr("hrt21", "鼓動の守護者", "{2}{G}{G}", "ツリーフォーク", 2, 6, "U", [kw("到達"), manaEnter(E.gain(1))]),
  ench("hrt22", "腐植の鼓動", "{B}{G}", "U", [manaEnter(E.lose(1))]),
]);
void ins;
