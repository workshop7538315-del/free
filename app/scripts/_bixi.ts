// 龍生九子:贔屓が初めて場に出た自分のターンと勝率
import cardsJson from "../../cards/cards.json";
import decksJson from "../../cards/decks.json";
import { Game, type PlayerId } from "../src/game/engine";
import { CpuAgent } from "../src/game/ai";
const byId = new Map((cardsJson as any[]).map((c) => [c.id, c]));
const decks = (decksJson as any[]).filter((d) => !d.legacy);
const expand = (l: Record<string, number>) => Object.entries(l).flatMap(([id, n]) => Array.from({ length: n }, () => byId.get(id)!));
const A = process.env.A ?? "ry-kyushi";
const buckets = new Map<string, { w: number; n: number }>();
for (const [oi, o] of decks.entries()) {
  if (o.id === A) continue;
  for (let i = 0; i < Number(process.env.REP ?? 4); i++) {
    const g: any = new Game({ decks: [expand(decks.find((d) => d.id === A).cards), expand(o.cards)], names: ["A", "B"], agents: [new CpuAgent(), new CpuAgent()], seed: (oi * 1000 + i) * 53 + 11, first: (i % 2) as PlayerId, maxTurns: 80 });
    const win = (await g.run()) === 0;
    let myTurn = 0, first = 0;
    for (const l of g.log) {
      if (l.player === 0 && /^― Aのターン/.test(l.text)) myTurn++;
      if (!first && l.player === 0 && l.text === "贔屓が戦場に出た") first = myTurn;
    }
    const k = first === 0 ? "出ない" : first <= 3 ? "1〜3" : first <= 5 ? "4〜5" : "6以降";
    const b = buckets.get(k) ?? { w: 0, n: 0 };
    b.n++; if (win) b.w++;
    buckets.set(k, b);
  }
}
const total = [...buckets.values()].reduce((s, b) => s + b.n, 0);
for (const k of ["1〜3", "4〜5", "6以降", "出ない"]) {
  const b = buckets.get(k) ?? { w: 0, n: 0 };
  console.log(`${k}ターン目: ${b.n}戦(${((b.n / total) * 100).toFixed(0)}%) 勝率${b.n ? ((b.w / b.n) * 100).toFixed(0) : "-"}%`);
}
