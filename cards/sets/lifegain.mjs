// ライフ:ライフを得るたびに得をする(白黒、少し緑)。
import { cr, ins, ench, art, aura, kw, spell, etb, upkeep, lifeGain, manaEnter, act, stat, T, E, tagAll } from "../lib.mjs";

export const LIFEGAIN = tagAll("ライフ", [
  cr("lif01", "癒しの侍祭", "{W}", "人間・クレリック", 1, 2, "U", [lifeGain(E.countersSelf(1))]),
  ench("lif02", "生命の泉", "{1}{W}", "C", [upkeep(E.gain(1))]),
  cr("lif03", "泉の守り手", "{2}{W}", "スピリット", 2, 2, "C", [kw("飛行"), lifeGain(E.pumpSelf(1, 1))]),
  ins("lif04", "癒しの光", "{1}{W}", "C", spell([E.gain(3), E.draw(1)])),
  cr("lif05", "生命の天使", "{4}{W}{W}", "天使", 4, 5, "R", [kw("飛行", "絆魂"), lifeGain(E.countersSelf(1))]),
  ench("lif06", "血の契約", "{1}{B}", "U", [lifeGain(E.lose(1))]),
  cr("lif07", "生き血をすする者", "{1}{B}", "吸血鬼", 2, 2, "C", [kw("絆魂"), etb([E.lose(1), E.gain(1)])]),
  cr("lif08", "夜の貴族", "{3}{B}", "吸血鬼", 3, 3, "U", [kw("飛行"), lifeGain(E.countersSelf(1))]),
  cr("lif09", "光と闇の司祭", "{W}{B}", "人間・クレリック", 2, 2, "U", [lifeGain(E.lose(1))]),
  art("lif10", "血の聖杯", "{2}", "U", [act({ mana: "{2}", tap: true }, [E.lose(1), E.gain(1)])]),
  cr("lif11", "白き牧師", "{1}{W}", "人間・クレリック", 1, 3, "C", [etb(E.gain(2))]),
  ins("lif12", "命の簒奪", "{3}{B}{B}", "U", spell([E.lose(4), E.gain(4)])),
  cr("lif13", "天上の歌姫", "{2}{W}{W}", "天使", 3, 3, "R", [kw("飛行"), lifeGain(E.token(1, 1, 1, "W", "スピリット", ["飛行"]))]),
  ench("lif14", "生命の樹", "{2}{G}", "U", [manaEnter(E.gain(1))]),
  aura("lif15", "癒し手の加護", "{W}", "C", [stat({ s: "auraBuff", p: 0, t: 2, kw: ["絆魂"] })]),
  ins("lif16", "血の渇き", "{B}", "C", spell(E.pump(2, 0, ["絆魂"]), T.you)),
]);
