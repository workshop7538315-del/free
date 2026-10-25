/** A=デッキID,… B=デッキID,… SEEDS=N … AとBの総当たりの勝率 */
import cardsJson from "../../cards/cards.json";
import decksJson from "../../cards/decks.json";
import type { Card } from "../src/types";
import { Game, type PlayerId } from "../src/game/engine";
import { CpuAgent } from "../src/game/ai";
const cards = cardsJson as Card[];
const byId = new Map(cards.map((c) => [c.id, c]));
const decks = decksJson as { id: string; name: string; cards: Record<string, number> }[];
const expand = (l: Record<string, number>) => Object.entries(l).flatMap(([id, n]) => Array.from({ length: n }, () => byId.get(id)!));
const A = process.env.A!.split(",");
const B = (process.env.B ?? decks.map((d) => d.id).join(",")).split(",");
const SEEDS = Number(process.env.SEEDS ?? 6);
// ADD=カードID:枚数,… … Aのデッキに足す(秘蔵庫を試すとき)
const ADD = (process.env.ADD ?? "").split(",").filter(Boolean).flatMap((x) => { const [id, n] = x.split(":"); return Array.from({ length: Number(n ?? 1) }, () => byId.get(id)!); });
for (const a of A) {
  let w = 0, n = 0;
  const per: string[] = [];
  for (const b of B) {
    if (a === b) continue;
    let ww = 0;
    for (let i = 0; i < SEEDS; i++) {
      const g = new Game({ decks: [expand(decks.find((d) => d.id === a)!.cards).filter((c) => !process.env.NOEXTRA || !c.abilities.some((x) => x.a === "releaseSummon")).concat(ADD), expand(decks.find((d) => d.id === b)!.cards)], names: ["A", "B"], agents: [new CpuAgent(), new CpuAgent()], seed: i * 97 + 5, first: (i % 2) as PlayerId, maxTurns: 80 });
      if ((await g.run()) === 0) ww++;
    }
    w += ww; n += SEEDS;
    per.push(`${b}:${ww}`);
  }
  console.log(`${a} ${((w / n) * 100).toFixed(1)}%  ${per.join(" ")}`);
}
