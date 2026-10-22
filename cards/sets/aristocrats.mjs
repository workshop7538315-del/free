// 生け贄:自分のクリーチャーを生け贄に捧げて得をする。死亡したときの能力と組み合わせる(黒赤白)。
import { cr, ins, sor, ench, art, kw, spell, etb, dies, allyDies, act, T, E, tagAll } from "../lib.mjs";

const SAC = { sac: {} };

export const ARISTOCRATS = tagAll("生け贄", [
  ench("ari01", "血の祭壇", "{1}{B}", "U", [act(SAC, [E.lose(1), E.gain(1)])]),
  cr("ari02", "生け贄の司祭", "{1}{B}", "人間・クレリック", 2, 2, "C", [act({ mana: "{1}", sac: {} }, E.draw(1))]),
  cr("ari03", "屍肉喰らいの悪鬼", "{2}{B}", "グール", 3, 2, "U", [allyDies(E.countersSelf(1))]),
  ench("ari04", "墓所の血盟", "{3}{B}", "R", [allyDies([E.draw(1), E.lose(1, "you")])]),
  cr("ari05", "爆薬工", "{1}{R}", "ゴブリン", 1, 1, "C", [act({ sacSelf: true }, E.dmg(2), T.any)]),
  cr("ari06", "燃え尽きる戦士", "{R}", "人間・戦士", 2, 1, "C", [kw("速攻"), dies(E.dmgOpp(1))]),
  ench("ari07", "炎の献身", "{2}{R}", "U", [allyDies(E.dmgOpp(1))]),
  sor("ari08", "ゴブリンの群れ", "{1}{R}", "C", spell(E.token(2, 1, 1, "R", "ゴブリン", ["速攻"]))),
  cr("ari09", "殉教者", "{W}", "人間・クレリック", 1, 1, "C", [dies(E.gain(3))]),
  cr("ari10", "献身の騎士", "{2}{W}", "人間・騎士", 2, 2, "U", [act({ sacSelf: true }, E.pump(0, 0, ["破壊不能"]), T.you)]),
  cr("ari11", "悪魔崇拝者", "{B}{R}", "人間・ウォーロック", 2, 2, "U", [act(SAC, E.dmg(1), T.any)]),
  ench("ari12", "魂の焼却炉", "{1}{B}{R}", "R", [allyDies([E.dmgOpp(1), E.gain(1)])]),
  sor("ari13", "葬送の儀", "{1}{W}{B}", "U", spell([E.token(2, 1, 1, "W", "スピリット", ["飛行"]), E.gain(2)])),
  cr("ari14", "魂の導き手", "{1}{W}{B}", "スピリット", 2, 2, "U", [kw("飛行"), allyDies([E.lose(1), E.gain(1)])]),
  sor("ari15", "骨の山", "{2}{B}", "C", spell(E.token(2, 2, 2, "B", "ゾンビ"))),
  ench("ari16", "死の舞踏", "{2}{B}{B}", "R", [allyDies(E.token(1, 1, 1, "B", "ゾンビ"))]),
  cr("ari17", "墓所の番犬", "{1}{B}", "ハウンド", 2, 2, "C", [dies(E.token(1, 1, 1, "B", "ゾンビ"))]),
  art("ari18", "生け贄の祭器", "{3}", "U", [act({ mana: "{1}", sac: {} }, [E.lookTop(), E.draw(1)])]),
]);
void ins;
void etb;
