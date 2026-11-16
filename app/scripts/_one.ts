// 任意のデッキ(A の cards に EXTRA を足す)で1戦して、PAT に合うログを出す
import cardsJson from "../../cards/cards.json";
import decksJson from "../../cards/decks.json";
import { Game, type PlayerId } from "../src/game/engine";
import { CpuAgent } from "../src/game/ai";
const byId = new Map((cardsJson as any[]).map((c) => [c.id, c]));
const decks = decksJson as any[];
const expand = (l: Record<string, number>) => Object.entries(l).flatMap(([id, n]) => Array.from({ length: n }, () => byId.get(id)!));
const extra = Object.fromEntries((process.env.EXTRA ?? "").split(",").filter(Boolean).map((s) => s.split(":")).map(([k, v]) => [k, Number(v)]));
const re = new RegExp(process.env.PAT ?? ".");
let w = 0;
const N = Number(process.env.N ?? 1);
for (let i = 0; i < N; i++) {
  const g: any = new Game({ decks: [expand({ ...decks.find((d) => d.id === process.env.A).cards, ...extra }), expand(decks.find((d) => d.id === process.env.B).cards)], names: ["A", "B"], agents: [new CpuAgent(), new CpuAgent()], seed: i * 77 + 3, first: (i % 2) as PlayerId, maxTurns: 80 });
  const lines: string[] = [];
  const orig = g.addLog.bind(g);
  g.addLog = (t: string, p: any) => { lines.push(`${g.turn} ${p} ${t}`); return orig(t, p); };
  if ((await g.run()) === 0) w++;
  if (i === 0) console.log(lines.filter((l) => re.test(l)).slice(0, 60).join("\n"));
}
console.log(`${w}/${N}`);
