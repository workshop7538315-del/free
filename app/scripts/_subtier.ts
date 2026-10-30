/** 指定したデッキだけを、ほかの全デッキと各40戦させる(tier の一部だけを速く測る) */
import cardsJson from "../../cards/cards.json";
import decksJson from "../../cards/decks.json";
import { Game, type PlayerId } from "../src/game/engine";
import { CpuAgent } from "../src/game/ai";
const byId = new Map((cardsJson as any[]).map((c) => [c.id, c]));
const decks = (decksJson as any[]).filter((d) => !d.legacy);
const expand = (l: Record<string, number>) => Object.entries(l).flatMap(([id, n]) => Array.from({ length: n }, () => byId.get(id)!));
const per = Number(process.env.PER ?? 40);
for (const a of process.env.A!.split(",")) {
  const me = decks.find((d) => d.id === a)!;
  let w = 0, n = 0, seed = 1;
  for (const o of decks) {
    if (o.id === a) continue;
    for (let k = 0; k < per; k++) {
      const g = new Game({ decks: [expand(me.cards), expand(o.cards)], names: ["A", "B"], agents: [new CpuAgent(), new CpuAgent()], seed: seed++ * 7919 + 17, first: (k % 2) as PlayerId, maxTurns: 80 });
      if ((await g.run()) === 0) w++;
      n++;
    }
  }
  console.log(`${a} ${((w / n) * 100).toFixed(1)}% (${n}戦)`);
}
