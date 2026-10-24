/** npm run one -- A B seed … 1試合のログを出す */
import cardsJson from "../../cards/cards.json";
import decksJson from "../../cards/decks.json";
import type { Card } from "../src/types";
import { Game, type PlayerId } from "../src/game/engine";
import { CpuAgent } from "../src/game/ai";
const cards = cardsJson as Card[];
const byId = new Map(cards.map((c) => [c.id, c]));
const decks = decksJson as { id: string; name: string; cards: Record<string, number> }[];
const expand = (l: Record<string, number>) => Object.entries(l).flatMap(([id, n]) => Array.from({ length: n }, () => byId.get(id)!));
const [a, b, s] = process.argv.slice(2);
const g = new Game({ decks: [expand(decks.find((d) => d.id === a)!.cards), expand(decks.find((d) => d.id === b)!.cards)], names: [a, b], agents: [new CpuAgent(), new CpuAgent()], seed: Number(s ?? 1), first: 0 as PlayerId, maxTurns: 80 });
const w = await g.run();
for (const l of (g as any).log) console.log(typeof l === "string" ? l : `${l.turn ?? ""} ${l.player ?? ""} ${l.text ?? JSON.stringify(l)}`);
console.log("winner", w);
