// あるログが最初に出たターンを数える(A のデッキ、ほかの全デッキと REP 戦ずつ)
import cardsJson from "../../cards/cards.json";
import decksJson from "../../cards/decks.json";
import { Game, type PlayerId } from "../src/game/engine";
import { CpuAgent } from "../src/game/ai";
const byId = new Map((cardsJson as any[]).map((c) => [c.id, c]));
const decks = (decksJson as any[]).filter((d) => !d.legacy);
const expand = (l: Record<string, number>) => Object.entries(l).flatMap(([id, n]) => Array.from({ length: n }, () => byId.get(id)!));
const A = process.env.A!;
const re = new RegExp(process.env.PAT!);
const turns: number[] = [];
let games = 0, wins = 0, hitWins = 0, hits = 0;
for (const [oi, o] of decks.entries()) {
  if (o.id === A) continue;
  for (let i = 0; i < Number(process.env.REP ?? 1); i++) {
    const g: any = new Game({ decks: [expand(decks.find((d) => d.id === A).cards), expand(o.cards)], names: ["A", "B"], agents: [new CpuAgent(), new CpuAgent()], seed: (oi * 1000 + i) * 31 + 7, first: (i % 2) as PlayerId, maxTurns: 80 });
    const w = (await g.run()) === 0;
    games++;
    if (w) wins++;
    const l = g.log.find((l: any) => l.player === 0 && re.test(l.text));
    if (l) { turns.push(Math.ceil(l.turn / 2)); hits++; if (w) hitWins++; }
  }
}
turns.sort((a, b) => a - b);
console.log(`${games}戦 勝率${((wins / games) * 100).toFixed(0)}% 出た${hits}戦(その勝率${((hitWins / Math.max(1, hits)) * 100).toFixed(0)}%) 中央値 自分の${turns[turns.length >> 1]}ターン目`);
