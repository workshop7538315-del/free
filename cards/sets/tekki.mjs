// 「鉄機」:アーティファクトを並べ、機巧(アーティファクト3つ以上)と共鳴で押す(欠色+赤)。
import { cr, acr, ins, sor, art, kw, spell, etb, dies, allyEnter, act, mana, lord, selfIf, discount, affinity, F, T, E, iff, unless, countPerm, tagAll } from "../lib.mjs";

const MC = "metalcraft";
const construct = (n) => E.token(n, 1, 1, "C", "構築物", undefined, true);

export const TEKKI = tagAll("鉄機", [
  acr("tek01", "鉄機の歩兵", "{1}", "構築物", 1, 1, "C", [selfIf(MC, 1, 1)]),
  acr("tek02", "鉄機の偵察機", "{2}", "構築物", 1, 1, "C", [kw("飛行"), etb(E.lookTop())]),
  art("tek03", "鉄機の工房", "{2}", "U", [act({ mana: "{2}", tap: true }, construct(1))]),
  art("tek04", "鉄機の司令塔", "{3}", "R", [lord(F.artifact, 1, 1, undefined, false)]),
  acr("tek05", "鉄機の巨兵", "{7}", "構築物", 6, 6, "U", [kw("トランプル"), affinity(F.artifact)]),
  acr("tek06", "鉄機の砲台", "{3}", "構築物", 0, 3, "U", [kw("防衛"), act({ tap: true }, E.dmg(1), T.any)]),
  acr("tek07", "鉄機竜", "{5}", "ドラゴン", 4, 4, "R", [kw("飛行"), affinity(F.artifact)]),
  cr("tek08", "鉄機の修理工", "{1}{R}", "人間・職人", 2, 2, "C", [etb(E.ret("hand"), T.gyF(F.artifact))]),
  art("tek09", "鉄機の溶鉱炉", "{1}{R}", "U", [act({ sac: F.artifact }, E.dmg(2), T.any)]),
  acr("tek10", "鉄機の突撃兵", "{2}{R}", "構築物", 3, 1, "C", [kw("速攻")]),
  sor("tek11", "鉄機の暴走", "{2}{R}", "U", spell(E.dmg(countPerm(F.artifact)), T.cre)),
  acr("tek12", "鉄機の盾持ち", "{3}", "構築物", 1, 4, "C", [selfIf(MC, 2, 0)]),
  art("tek13", "鉄機の心臓", "{1}", "C", [mana("{C}")]),
  acr("tek14", "鉄機の指揮官", "{4}", "構築物", 3, 3, "U", [allyEnter(F.artifact)(E.countersSelf(1))]),
  acr("tek15", "鉄機の大要塞", "{5}{C}{C}", "構築物", 6, 8, "R", [kw("破壊不能")]),
  sor("tek16", "鉄機の量産", "{3}{R}", "U", spell(construct(3))),
  ins("tek17", "鉄機の閃光", "{R}", "C", spell([unless(MC, E.dmg(1)), iff(MC, E.dmg(3))], T.any)),
  sor("tek18", "鉄機の再起動", "{1}{R}", "U", spell(E.ret("battlefield"), T.gyF(F.artifact))),
  acr("tek19", "鉄機の自爆兵", "{2}", "構築物", 2, 1, "C", [dies(E.dmgOpp(1))]),
  art("tek20", "鉄機の動力炉", "{4}", "R", [mana("{C}{C}"), discount(F.artifact, 1)]),
  acr("tek21", "鉄機の狙撃手", "{2}{R}", "構築物", 2, 2, "U", [act({ mana: "{1}", tap: true }, E.dmg(1), T.any)]),
  acr("tek22", "鉄機王", "{4}{R}{R}", "構築物", 5, 5, "M", [kw("速攻", "トランプル"), etb(construct(2))]),
]);
