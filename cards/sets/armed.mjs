// マナ武装:マナゾーンに同じ色のカードがN枚以上あると強くなる。単色デッキ向け。
import { cr, ins, sor, kw, spell, etb, selfIf, T, E, iff, unless, armed, tagAll } from "../lib.mjs";

export const ARMED = tagAll("マナ武装", [
  // 白
  cr("arm01", "武装の聖騎士", "{2}{W}", "人間・騎士", 2, 2, "C", [selfIf(armed("W", 5), 2, 2, ["先制攻撃"])]),
  ins("arm02", "白き裁定", "{1}{W}", "U", spell([unless(armed("W", 5), E.tap()), iff(armed("W", 5), E.destroy())], T.opp)),
  cr("arm03", "白光の大天使", "{4}{W}{W}", "天使", 5, 5, "R", [kw("飛行"), etb(iff(armed("W", 7), E.countersAll(1)))]),
  cr("arm04", "白の守り手", "{W}", "人間・兵士", 1, 2, "C", [selfIf(armed("W", 3), 1, 1, ["警戒"])]),
  // 青
  cr("arm05", "青の魔導士", "{1}{U}", "人間・ウィザード", 1, 2, "C", [etb(iff(armed("U", 3), E.draw(1)))]),
  ins("arm06", "青き奔流", "{2}{U}", "U", spell([E.bounce(), iff(armed("U", 5), E.draw(2))], T.cre)),
  cr("arm07", "深海の王", "{4}{U}{U}", "リバイアサン", 6, 6, "R", [kw("呪禁"), etb(iff(armed("U", 7), E.tapAll()))]),
  ins("arm08", "青の否認", "{U}{U}", "C", spell([E.counter(), iff(armed("U", 5), E.draw(1))], T.spell)),
  // 黒
  cr("arm09", "黒の刺客", "{1}{B}", "人間・暗殺者", 2, 1, "C", [selfIf(armed("B", 3), 1, 0, ["接死"])]),
  ins("arm10", "黒き死", "{2}{B}", "U", spell([unless(armed("B", 5), E.pump(-3, -3)), iff(armed("B", 5), E.destroy())], T.cre)),
  cr("arm11", "冥界の王", "{4}{B}{B}", "デーモン", 5, 5, "R", [kw("飛行"), etb([iff(armed("B", 7), E.sac()), iff(armed("B", 7), E.lose(3))])]),
  sor("arm12", "黒の取引", "{B}", "C", spell([unless(armed("B", 5), E.draw(1)), iff(armed("B", 5), E.draw(2)), E.lose(1, "you")])),
  // 赤
  cr("arm13", "赤の戦士", "{R}", "人間・戦士", 1, 1, "C", [kw("速攻"), selfIf(armed("R", 3), 2, 0)]),
  ins("arm14", "赤き怒り", "{1}{R}", "C", spell([unless(armed("R", 5), E.dmg(2)), iff(armed("R", 5), E.dmg(4))], T.any)),
  cr("arm15", "炎の大竜", "{4}{R}{R}", "ドラゴン", 5, 5, "R", [kw("飛行"), etb(iff(armed("R", 7), E.dmgAllOpp(3, true)))]),
  sor("arm16", "赤の爆撃", "{2}{R}{R}", "U", spell([unless(armed("R", 5), E.dmgAllOpp(2)), iff(armed("R", 5), E.dmgAllOpp(4))])),
  // 緑
  cr("arm17", "緑の獣", "{1}{G}", "ビースト", 2, 2, "C", [selfIf(armed("G", 3), 2, 2)]),
  ins("arm18", "緑の成長", "{G}", "C", spell([unless(armed("G", 5), E.pump(2, 2)), iff(armed("G", 5), E.pump(4, 4, ["トランプル"]))], T.cre)),
  cr("arm19", "大地の主", "{4}{G}{G}", "ビースト", 6, 6, "R", [kw("トランプル"), selfIf(armed("G", 7), 0, 0, ["呪禁", "破壊不能"])]),
  sor("arm20", "緑の恵み", "{1}{G}", "U", spell([unless(armed("G", 5), E.ramp(1)), iff(armed("G", 5), E.ramp(3))])),
]);
