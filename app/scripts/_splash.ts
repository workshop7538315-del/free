import cardsJson from "../../cards/cards.json";
import decksJson from "../../cards/decks.json";
import type { Card } from "../src/types";
import { Game, type PlayerId } from "../src/game/engine";
import { CpuAgent } from "../src/game/ai";
import { manaValue } from "../src/lib/mana";
const cards = cardsJson as Card[];
const byId = new Map(cards.map((c) => [c.id, c]));
const decks = decksJson as { id: string; name: string; cards: Record<string, number> }[];
const expand = (l: Record<string, number>) => Object.entries(l).flatMap(([id, n]) => Array.from({ length: n }, () => byId.get(id)!));
const HOSTS = (process.env.HOSTS ?? "rw,t-human,t-goblin,t-zombie,wb,t-equip,t-void-swarm,br").split(",");
const OPP = ["wu", "ub", "t-hoshiyomi", "gw", "rg", "t-graveyard", "t-life", "t-void", "t-intrigue", "t-crest", "t-armed-r", "bg"];
const cands = (process.env.CANDS ? process.env.CANDS.split(",") : cards.filter((x) => x.abilities.some((a) => (a.a === "trigger" && a.on === "charge") || (a as any).from === "mana")).map((x) => x.id));
const SEEDS = Number(process.env.SEEDS ?? 4);
async function rate(mod?: string) {
  let w = 0, n = 0;
  for (const h of HOSTS) {
    let list = expand(decks.find((d) => d.id === h)!.cards);
    if (mod) {
      list = [...list].sort((a, b) => manaValue(a.cost) - manaValue(b.cost)).slice(0, 36);
      list.push(...Array(4).fill(byId.get(mod)!));
    }
    for (const o of OPP)
      for (let i = 0; i < SEEDS; i++) {
        const g = new Game({ decks: [list, expand(decks.find((d) => d.id === o)!.cards)], names: ["A", "B"], agents: [new CpuAgent(), new CpuAgent()], seed: i * 41 + 11, first: (i % 2) as PlayerId, maxTurns: 80 });
        if ((await g.run()) === 0) w++;
        n++;
      }
  }
  return (w / n) * 100;
}
const base = await rate();
console.log(`基準(そのまま) ${base.toFixed(1)}%`);
const rows: [string, number][] = [];
for (const id of cands) rows.push([`${id} ${byId.get(id)!.name}`, (await rate(id)) - base]);
rows.sort((a, b) => b[1] - a[1]);
for (const [n, d] of rows) console.log(`${d >= 0 ? "+" : ""}${d.toFixed(1)}  ${n}`);
