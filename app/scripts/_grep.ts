import cardsJson from "../../cards/cards.json";
import decksJson from "../../cards/decks.json";
import { Game, type PlayerId } from "../src/game/engine";
import { CpuAgent } from "../src/game/ai";
const byId = new Map((cardsJson as any[]).map((c) => [c.id, c]));
const decks = decksJson as any[];
const expand = (l: Record<string, number>) => Object.entries(l).flatMap(([id, n]) => Array.from({ length: n }, () => byId.get(id)!));
const [A, B, N, SHOW, CTX] = [process.env.A!, process.env.B!, Number(process.env.N ?? 10), new RegExp(process.env.SHOW!), Number(process.env.CTX ?? 3)];
for (let i = 0; i < N; i++) {
  const g: any = new Game({ decks: [expand(decks.find((d) => d.id === A).cards), expand(decks.find((d) => d.id === B).cards)], names: ["A", "B"], agents: [new CpuAgent(), new CpuAgent()], seed: i * 7 + 3, first: (i % 2) as PlayerId, maxTurns: 80 });
  const w = await g.run();
  g.log.forEach((l: any, k: number) => { if (SHOW.test(l.text)) { console.log(`--- game ${i} winner ${w}`); for (const m of g.log.slice(k, k + CTX)) console.log(m.turn, m.player, m.text); } });
}
