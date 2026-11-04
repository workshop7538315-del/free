/** 総当たりを分割して走らせる(SHARD=0/2 など)。結果は JSON で出す */
import { writeFileSync } from "node:fs";
import cardsJson from "../../cards/cards.json";
import decksJson from "../../cards/decks.json";
import { Game, type PlayerId } from "../src/game/engine";
import { CpuAgent } from "../src/game/ai";
const byId = new Map((cardsJson as any[]).map((c) => [c.id, c]));
const decks = (decksJson as any[]).filter((d) => !d.legacy);
const expand = (l: Record<string, number>) => Object.entries(l).flatMap(([id, n]) => Array.from({ length: n }, () => byId.get(id)!));
const [k, m] = (process.env.SHARD ?? "0/1").split("/").map(Number);
const per = Number(process.env.PER ?? 10);
const res: Record<string, [number, number]> = {};
let idx = 0;
for (let i = 0; i < decks.length; i++)
  for (let j = i + 1; j < decks.length; j++) {
    if (idx++ % m !== k) continue;
    let w = 0;
    for (let g = 0; g < per; g++) {
      const game = new Game({ decks: [expand(decks[i].cards), expand(decks[j].cards)], names: ["A", "B"], agents: [new CpuAgent(), new CpuAgent()], seed: (i * 100 + j) * 1000 + g, first: (g % 2) as PlayerId, maxTurns: 80 });
      if ((await game.run()) === 0) w++;
    }
    res[`${decks[i].id}|${decks[j].id}`] = [w, per];
  }
writeFileSync(process.env.OUT!, JSON.stringify(res));
