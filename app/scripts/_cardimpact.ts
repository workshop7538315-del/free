import cardsJson from "../../cards/cards.json";
import decksJson from "../../cards/decks.json";
import { Game, type PlayerId } from "../src/game/engine";
import { CpuAgent } from "../src/game/ai";
const byId = new Map((cardsJson as any[]).map((c) => [c.id, c]));
const decks = decksJson as any[];
const expand = (l: Record<string, number>) => Object.entries(l).flatMap(([id, n]) => Array.from({ length: n }, () => byId.get(id)!));
const A = process.env.A!;
const OPP = decks.filter((d) => !d.legacy && d.id !== A).map((d) => d.id);
const me = decks.find((d) => d.id === A)!;
const names = Object.keys(me.cards).map((id) => byId.get(id)!.name);
const stat: Record<string, { w: number; n: number }> = {};
let W = 0, N = 0, turns = 0, lifeEnd = 0;
for (const o of OPP) for (let i = 0; i < 6; i++) {
  const g: any = new Game({ decks: [expand(me.cards), expand(decks.find((d) => d.id === o)!.cards)], names: ["A", "B"], agents: [new CpuAgent(), new CpuAgent()], seed: i * 97 + 13, first: (i % 2) as PlayerId, maxTurns: 80 });
  const win = (await g.run()) === 0;
  N++; if (win) W++; turns += g.turn; lifeEnd += g.players[0].life;
  const cast = new Set<string>();
  for (const l of g.log) if (l.player === 0) for (const nm of names) if (l.text.startsWith(nm + "を") && /唱えた/.test(l.text)) cast.add(nm);
  for (const nm of names) { stat[nm] ??= { w: 0, n: 0 }; if (cast.has(nm)) { stat[nm].n++; if (win) stat[nm].w++; } }
}
console.log(A, `勝率${((W / N) * 100).toFixed(1)}% 試合${N} 平均ターン${(turns / N).toFixed(1)} 終了時ライフ${(lifeEnd / N).toFixed(1)}`);
for (const [nm, s] of Object.entries(stat).sort((a, b) => b[1].w / Math.max(1, b[1].n) - a[1].w / Math.max(1, a[1].n))) console.log(`  ${nm}: 唱えた${s.n}試合 勝率${s.n ? ((s.w / s.n) * 100).toFixed(0) : "-"}%`);
