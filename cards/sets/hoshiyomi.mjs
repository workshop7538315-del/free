// 「星詠み」:名前に「星詠み」を含むカード同士で助け合うテーマ(白青)。
// 名前を参照するテーマは「星詠み」と「鉄機」の2つだけ。
import { cr, ins, sor, ench, aura, equipment, kw, spell, etb, dies, upkeep, allyEnter, onCast, stat, lord, discount, F, T, E, iff, control, countPerm, tagAll } from "../lib.mjs";

const HS = F.hoshi;
const HS2 = control(HS, 2);
const HS3 = control(HS, 3);

export const HOSHIYOMI = tagAll("星詠み", [
  cr("hsy01", "星詠みの見習い", "{W}", "人間・ウィザード", 1, 1, "C", [etb(E.lookTop())]),
  cr("hsy02", "星詠みの巫女", "{1}{W}", "人間・クレリック", 1, 3, "U", [etb(E.tutor({ name: "星詠み", maxMV: 3 }))]),
  cr("hsy03", "星詠みの導師", "{2}{U}", "人間・ウィザード", 2, 2, "U", [kw("飛行"), onCast(HS)(E.lookTop())]),
  ench("hsy04", "星詠みの天文台", "{1}{U}", "R", [allyEnter(HS)(E.draw(1))]),
  ins("hsy06", "星詠みの祈り", "{W}", "C", spell(E.pump(1, 1, ["飛行"]), T.cre)),
  ins("hsy07", "星詠みの予言", "{1}{U}", "C", spell([E.draw(2), E.discard(1)])),
  cr("hsy08", "星詠みの守り手", "{2}{W}", "人間・兵士", 2, 3, "U", [kw("警戒"), lord(HS, 1, 1)]),
  cr("hsy09", "星詠みの司書", "{1}{U}", "人間・ウィザード", 1, 2, "C", [kw("飛行"), etb(iff(HS3, E.draw(1)))]),
  cr("hsy10", "星詠みの大司教", "{3}{W}{U}", "人間・クレリック", 3, 4, "R", [kw("飛行", "絆魂"), etb(E.tutor(HS))]),
  cr("hsy11", "星詠みの天使", "{3}{W}{W}", "天使", 4, 4, "M", [kw("飛行", "警戒"), allyEnter(HS)(E.countersSelf(1)), etb(E.token(1, 1, 1, "W", "人間・ウィザード", ["飛行"]))]),
  ins("hsy12", "星詠みの流星", "{1}{U}{U}", "U", spell([E.counter(), iff(HS2, E.draw(1))], T.spell)),
  ench("hsy13", "星詠みの帳", "{W}{U}", "U", [discount(HS, 1)]),
  cr("hsy14", "星詠みの使い魔", "{U}", "鳥", 1, 1, "C", [kw("飛行"), etb(E.lookTop())]),
  aura("hsy15", "星詠みの加護", "{1}{W}", "C", [stat({ s: "auraBuff", p: 1, t: 1, kw: ["飛行"] })]),
  equipment("hsy16", "星詠みの杖", "{1}", "U", "{1}", { p: 1, t: 1 }, [etb(E.lookTop())]),
  cr("hsy17", "星詠みの占星術師", "{2}{U}", "人間・ウィザード", 2, 3, "U", [upkeep(E.lookTop()), upkeep(E.draw(1), undefined, { if: HS3 })]),
  sor("hsy18", "星詠みの夜明け", "{3}{W}{W}", "U", spell(E.token(3, 1, 1, "W", "人間・ウィザード", ["飛行"]))),
  ins("hsy19", "星詠みの瞑想", "{U}", "C", spell([E.lookTop(), iff(HS2, E.draw(1))])),
  cr("hsy20", "星詠みの白鳩", "{1}{W}", "鳥", 1, 2, "C", [kw("飛行"), dies(E.gain(2))]),
  sor("hsy21", "星詠みの銀河", "{4}{U}{U}", "R", spell(E.draw(countPerm(HS)))),
  sor("hsy22", "星詠みの再臨", "{2}{W}", "U", spell(E.ret("battlefield"), T.gyF({ name: "星詠み", type: "クリーチャー" }))),
  cr("hsy23", "星詠みの騎士", "{1}{W}{U}", "人間・騎士", 2, 2, "U", [kw("飛行", "先制攻撃")]),
]);
// hsy05 は欠番
