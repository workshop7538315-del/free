// +1/+1カウンター:カウンターを置いて育てる。不屈(カウンターがなければ一度だけ戻ってくる)も(緑白黒)。
import { cr, ins, sor, art, kw, spell, etb, upkeep, attacks, allyDies, act, T, E, tagAll } from "../lib.mjs";

export const COUNTERS = tagAll("カウンター", [
  cr("ctr01", "芽吹きの獣", "{1}{G}", "ビースト", 1, 1, "C", [etb(E.countersSelf(2))]),
  ins("ctr02", "成長の閃光", "{1}{G}", "U", spell(E.counters(3), T.cre)),
  cr("ctr03", "不屈の熊", "{2}{G}", "熊", 2, 2, "C", [kw("不屈")]),
  sor("ctr04", "群れの成長", "{2}{G}{G}", "U", spell(E.countersAll(2))),
  cr("ctr05", "森の巨人", "{4}{G}", "巨人", 4, 4, "U", [kw("不屈")]),
  cr("ctr06", "苔の古老", "{3}{G}", "ツリーフォーク", 2, 5, "U", [etb(E.countersAll(1))]),
  cr("ctr07", "不屈の聖騎士", "{1}{W}{W}", "人間・騎士", 2, 2, "U", [kw("不屈", "先制攻撃")]),
  sor("ctr08", "昇格の儀", "{1}{W}", "C", spell(E.counters(2), T.cre)),
  cr("ctr09", "訓練教官", "{2}{W}", "人間・兵士", 2, 2, "C", [attacks(E.counters(1), T.you)]),
  cr("ctr10", "不死の騎士", "{2}{B}", "ゾンビ・騎士", 2, 2, "C", [kw("不屈")]),
  cr("ctr11", "不屈の屍竜", "{4}{B}{B}", "ゾンビ・ドラゴン", 4, 4, "R", [kw("飛行", "不屈")]),
  cr("ctr12", "血の契約者", "{B}", "人間・ウォーロック", 1, 1, "C", [allyDies(E.countersSelf(1))]),
  cr("ctr13", "成長の守護者", "{G}{W}", "人間・ドルイド", 2, 2, "U", [etb(E.counters(1), T.you)]),
  cr("ctr14", "不屈の守り手", "{1}{G}{W}", "スピリット", 3, 3, "R", [kw("不屈", "警戒")]),
  cr("ctr15", "不死の大樹", "{2}{B}{G}", "ツリーフォーク", 3, 4, "U", [kw("不屈", "到達")]),
  sor("ctr16", "巨大な成長", "{X}{G}", "U", spell(E.counters("X"), T.cre)),
  art("ctr17", "増強の器", "{2}", "U", [act({ mana: "{2}", tap: true }, E.counters(1), T.you)]),
  ins("ctr18", "野生の進化", "{1}{G}", "C", spell([E.counters(1), E.draw(1)], T.cre)),
  cr("ctr19", "不屈の天使", "{3}{W}{W}", "天使", 3, 3, "R", [kw("飛行", "不屈")]),
  cr("ctr20", "成長し続ける芽", "{G}{G}", "植物", 0, 3, "U", [kw("防衛"), upkeep(E.countersSelf(1))]),
]);
