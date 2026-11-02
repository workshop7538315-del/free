// 名前で書いたデッキを、ほかの全デッキと戦わせて勝率と勝ったターンを見る
import cardsJson from "../../cards/cards.json";
import decksJson from "../../cards/decks.json";
import { Game, type PlayerId } from "../src/game/engine";
import { CpuAgent } from "../src/game/ai";
const cards = cardsJson as any[];
const byName = new Map(cards.map((c) => [c.name, c]));
const byId = new Map(cards.map((c) => [c.id, c]));
const list = process.env.LIST!.split(";").map((l) => l.trim()).filter(Boolean).flatMap((l) => {
  const m = l.match(/^(\d+)\s+(.+)$/)!;
  const c = byName.get(m[2]);
  if (!c) throw new Error("ない: " + m[2]);
  return Array.from({ length: Number(m[1]) }, () => c);
});
const decks = (decksJson as any[]).filter((d) => !d.legacy);
const expand = (l: Record<string, number>) => Object.entries(l).flatMap(([id, n]) => Array.from({ length: n }, () => byId.get(id)!));
let w = 0, n = 0;
const winTurns: number[] = [];
for (const [oi, o] of decks.entries()) {
  for (let i = 0; i < Number(process.env.PER ?? 6); i++) {
    const g: any = new Game({ decks: [list, expand(o.cards)], names: ["A", "B"], agents: [new CpuAgent(), new CpuAgent()], seed: (oi * 1000 + i) * 71 + 3, first: (i % 2) as PlayerId, maxTurns: 80 });
    const r = await g.run();
    n++;
    if (r === 0) { w++; winTurns.push(g.players[0].turnCount); }
  }
}
winTurns.sort((a, b) => a - b);
const by = (t: number) => winTurns.filter((x) => x <= t).length;
console.log(`勝率 ${((w / n) * 100).toFixed(1)}%(${n}戦) 勝った試合の自分のターン数:中央値${winTurns[Math.floor(winTurns.length / 2)]} 3ターン以内${by(3)}戦 4ターン以内${by(4)}戦`);
