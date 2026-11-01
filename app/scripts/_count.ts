// ログの中の出来事を数える(新しいメカニズムが実際に起きているかの確認)
import cardsJson from "../../cards/cards.json";
import decksJson from "../../cards/decks.json";
import { Game, type PlayerId } from "../src/game/engine";
import { CpuAgent } from "../src/game/ai";
const byId = new Map((cardsJson as any[]).map((c) => [c.id, c]));
const decks = (decksJson as any[]).filter((d) => !d.legacy);
const expand = (l: Record<string, number>) => Object.entries(l).flatMap(([id, n]) => Array.from({ length: n }, () => byId.get(id)!));
const A = process.env.A!;
const pats: [string, RegExp][] = (process.env.PATS ?? "").split(";").map((s) => [s, new RegExp(s)]);
const cnt = new Map<string, number>();
let games = 0;
for (const [oi, o] of decks.entries()) {
  if (o.id === A) continue;
  for (let i = 0; i < Number(process.env.REP ?? 2); i++) {
    const g: any = new Game({ decks: [expand(decks.find((d) => d.id === A).cards), expand(o.cards)], names: ["A", "B"], agents: [new CpuAgent(), new CpuAgent()], seed: (oi * 1000 + i) * 31 + 7, first: (i % 2) as PlayerId, maxTurns: 80 });
    await g.run();
    games++;
    for (const [k, re] of pats) if (g.log.some((l: any) => l.player === 0 && re.test(l.text))) cnt.set(k, (cnt.get(k) ?? 0) + 1);
    if (process.env.DUMP && g.log.some((l: any) => new RegExp(process.env.DUMP!).test(l.text))) {
      const k = g.log.findIndex((l: any) => new RegExp(process.env.DUMP!).test(l.text));
      for (const l of g.log.slice(Math.max(0, k - 8), k + 12)) console.log(l.turn, l.player, l.text);
    }
  }
}
console.log(`${games}戦`);
for (const [k] of pats) console.log(`  ${k}: ${cnt.get(k) ?? 0}戦`);
