/** 秘蔵庫の使われ方を数える:A=デッキID,… */
import cardsJson from "../../cards/cards.json";
import decksJson from "../../cards/decks.json";
import type { Card } from "../src/types";
import { Game, type PlayerId } from "../src/game/engine";
import { CpuAgent } from "../src/game/ai";
const cards = cardsJson as Card[];
const byId = new Map(cards.map((c) => [c.id, c]));
const decks = decksJson as { id: string; name: string; cards: Record<string, number> }[];
const expand = (l: Record<string, number>) => Object.entries(l).flatMap(([id, n]) => Array.from({ length: n }, () => byId.get(id)!));
const OPP = (process.env.B ?? "wu,ub,rg,t-zombie,gw,t-hoshiyomi,bg,t-goblin").split(",");
const PATS: [string, RegExp][] = [
  ["開拓", /が開拓進化した/],
  ["大開拓", /が大開拓進化した/],
  ["組立", /を組み立てた/],
  ["武装進化", /が武装進化し/],
  ["エントラータ", /エントラータ\(登場\)/],
  ["リリース", /をリリース召喚した/],
  ["加護", /加護《.+》を得た/],
  ["カーテンコール", /カーテンコールで現れた/],
];
for (const a of process.env.A!.split(",")) {
  let games = 0, wins = 0;
  const cnt: Record<string, number> = {};
  const first: Record<string, number[]> = {};
  for (const o of OPP)
    for (let i = 0; i < 3; i++) {
      const g = new Game({ decks: [expand(decks.find((d) => d.id === a)!.cards), expand(decks.find((d) => d.id === o)!.cards)], names: ["A", "B"], agents: [new CpuAgent(), new CpuAgent()], seed: i * 31 + 7 + games, first: (i % 2) as PlayerId, maxTurns: 80 });
      if ((await g.run()) === 0) wins++;
      games++;
      const seen = new Set<string>();
      for (const l of (g as any).log as { text: string; player?: number; turn: number }[]) {
        if (l.player !== 0) continue;
        for (const [k, re] of PATS)
          if (re.test(l.text)) {
            cnt[k] = (cnt[k] ?? 0) + 1;
            if (!seen.has(k)) { seen.add(k); (first[k] ??= []).push(Math.ceil(l.turn / 2)); }
          }
      }
    }
  const avg = (xs: number[]) => (xs.reduce((s, x) => s + x, 0) / xs.length).toFixed(1);
  console.log(a, `勝率${((wins / games) * 100).toFixed(0)}%`, Object.entries(cnt).map(([k, v]) => `${k}${(v / games).toFixed(1)}回(初回${avg(first[k])}T, ${first[k].length}/${games}試合)`).join(" "));
}
