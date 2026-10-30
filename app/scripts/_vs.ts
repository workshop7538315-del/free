import cardsJson from "../../cards/cards.json";
import decksJson from "../../cards/decks.json";
import { Game, type PlayerId } from "../src/game/engine";
import { CpuAgent } from "../src/game/ai";
const byId = new Map((cardsJson as any[]).map((c) => [c.id, c]));
const decks = decksJson as any[];
const expand = (l: Record<string, number>) => Object.entries(l).flatMap(([id, n]) => Array.from({ length: n }, () => byId.get(id)!));
const [A, B, N, SHOW] = [process.env.A!, process.env.B!, Number(process.env.N ?? 40), process.env.SHOW];
let w = 0;
for (let i = 0; i < N; i++) {
  const g: any = new Game({ decks: [expand(decks.find((d) => d.id === A).cards), expand(decks.find((d) => d.id === B).cards)], names: ["A", "B"], agents: [new CpuAgent(), new CpuAgent()], seed: i * 7 + 3, first: (i % 2) as PlayerId, maxTurns: 80 });
  if ((await g.run()) === 0) w++;
  if (SHOW && i === 0) for (const l of g.log) if (new RegExp(SHOW).test(l.text)) console.log(l.turn, l.player, l.text);
}
console.log(A, "vs", B, `${w}/${N}`);
