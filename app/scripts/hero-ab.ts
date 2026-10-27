/** 第11弾の英雄の効き目:英雄ありと英雄なしのデッキを、同じ相手・同じ乱数で比べる */
import cardsJson from "../../cards/cards.json";
import decksJson from "../../cards/decks.json";
import noHeroJson from "../../cards/decks-nohero.json";
import type { Card } from "../src/types";
import { Game, type PlayerId } from "../src/game/engine";
import { CpuAgent } from "../src/game/ai";
type D = { id: string; name: string; cards: Record<string, number>; legacy?: boolean };
const cards = cardsJson as Card[];
const byId = new Map(cards.map((c) => [c.id, c]));
const decks = (decksJson as D[]).filter((d) => !d.legacy);
const noHero = new Map((noHeroJson as D[]).map((d) => [d.id, d]));
const expand = (l: Record<string, number>) => Object.entries(l).flatMap(([id, n]) => Array.from({ length: n }, () => byId.get(id)!));
const SEEDS = Number(process.env.SEEDS ?? 2);
const only = process.env.A?.split(",");
async function rate(list: Record<string, number>, self: string) {
  let w = 0, n = 0;
  for (const o of decks) {
    if (o.id === self) continue;
    for (let i = 0; i < SEEDS; i++) {
      const g = new Game({ decks: [expand(list), expand(o.cards)], names: ["A", "B"], agents: [new CpuAgent(), new CpuAgent()], seed: i * 7919 + o.id.length * 31 + 3, first: (i % 2) as PlayerId, maxTurns: 80 });
      if ((await g.run()) === 0) w++;
      n++;
    }
  }
  return (w / n) * 100;
}
const rows: string[] = [];
for (const d of decks) {
  if (only && !only.includes(d.id)) continue;
  const nh = noHero.get(d.id);
  if (!nh || JSON.stringify(nh.cards) === JSON.stringify(d.cards)) continue;
  const a = await rate(d.cards, d.id);
  const b = await rate(nh.cards, d.id);
  rows.push(`${(a - b >= 0 ? "+" : "") + (a - b).toFixed(1)}\t英雄あり ${a.toFixed(1)}% / なし ${b.toFixed(1)}%\t${d.name}`);
  console.error(rows[rows.length - 1]);
}
console.log(rows.sort((x, y) => parseFloat(y) - parseFloat(x)).join("\n"));
