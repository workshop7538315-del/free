/** 喝采デッキの、喝采の溜まり方とエントラータの回数を数える */
import cardsJson from "../../cards/cards.json";
import decksJson from "../../cards/decks.json";
import type { Card } from "../src/types";
import { Game, type PlayerId } from "../src/game/engine";
import { CpuAgent } from "../src/game/ai";
const cards = cardsJson as Card[];
const byId = new Map(cards.map((c) => [c.id, c]));
const decks = decksJson as { id: string; name: string; cards: Record<string, number> }[];
const expand = (l: Record<string, number>) => Object.entries(l).flatMap(([id, n]) => Array.from({ length: n }, () => byId.get(id)!));
const OPP = ["wu", "ub", "rg", "t-zombie", "gw", "t-hoshiyomi", "bg", "t-goblin"];
for (const a of process.env.A!.split(",")) {
  let games = 0, wins = 0, entr = 0, turns = 0, firstEnt = 0, firstN = 0;
  const gained: Record<string, number> = {};
  for (const o of OPP)
    for (let i = 0; i < 3; i++) {
      const g = new Game({ decks: [expand(decks.find((d) => d.id === a)!.cards), expand(decks.find((d) => d.id === o)!.cards)], names: ["A", "B"], agents: [new CpuAgent(), new CpuAgent()], seed: i * 31 + 7, first: (i % 2) as PlayerId, maxTurns: 80 });
      if ((await g.run()) === 0) wins++;
      games++;
      const log = (g as any).log as { text: string; player?: number; turn?: number }[];
      turns += g.turn;
      let first = 0;
      for (const l of log) {
        if (l.player !== 0) continue;
        const m = l.text.match(/^喝采【(.+)】\+(\d+)/);
        if (m) gained[m[1]] = (gained[m[1]] ?? 0) + Number(m[2]);
        if (l.text.includes("エントラータ(登場)")) { entr++; if (!first) first = l.turn ?? 0; }
      }
      if (first) { firstEnt += first; firstN++; }
    }
  console.log(a, `勝率${((wins / games) * 100).toFixed(0)}%`, `平均ターン${(turns / games).toFixed(1)}`, "喝采/試合", Object.entries(gained).map(([k, v]) => `${k}${(v / games).toFixed(1)}`).join(" "), `エントラータ/試合 ${(entr / games).toFixed(1)}`, `初登場 ${firstN ? (firstEnt / firstN).toFixed(1) : "-"}(${firstN}/${games}試合)`);
}
