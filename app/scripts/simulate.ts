/**
 * CPU同士の自動対戦。エンジンのエラー検出と、カードの使用率・デッキの勝率の確認に使う。
 *   npm run simulate -- [対戦数]
 */
import cardsJson from "../../cards/cards.json";
import decksJson from "../../cards/decks.json";
import type { Card } from "../src/types";
import { Game, type PlayerId } from "../src/game/engine";
import { CpuAgent } from "../src/game/ai";

const cards = cardsJson as Card[];
const byId = new Map(cards.map((c) => [c.id, c]));
const decks = decksJson as { id: string; name: string; cards: Record<string, number> }[];

const expand = (list: Record<string, number>) => Object.entries(list).flatMap(([id, n]) => Array.from({ length: n }, () => byId.get(id)!));

let seed = 12345;
const rand = () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
};

/** 全カードを試すための、ランダムな40枚 */
function randomDeck(): Card[] {
  const out: Card[] = [];
  while (out.length < 40) out.push(cards[Math.floor(rand() * cards.length)]);
  return out;
}

const games = Number(process.argv[2] ?? 200);
const used = new Set<string>();
const wins: Record<string, { w: number; n: number }> = {};
let draws = 0;
let errors = 0;
let totalTurns = 0;

for (let i = 0; i < games; i++) {
  const random = i % 3 === 2;
  const da = random ? null : decks[Math.floor(rand() * decks.length)];
  const db = random ? null : decks[Math.floor(rand() * decks.length)];
  const deckA = da ? expand(da.cards) : randomDeck();
  const deckB = db ? expand(db.cards) : randomDeck();
  const g = new Game({
    decks: [deckA, deckB],
    names: [da?.name ?? "ランダムA", db?.name ?? "ランダムB"],
    agents: [new CpuAgent(), new CpuAgent()],
    seed: i + 1,
    maxTurns: 80,
  });
  try {
    const w = (await g.run()) as PlayerId | null;
    totalTurns += g.turn;
    g.usedCards.forEach((id) => used.add(id));
    if (w === null) draws++;
    if (da && db) {
      for (const [d, me] of [
        [da, 0],
        [db, 1],
      ] as const) {
        wins[d.name] ??= { w: 0, n: 0 };
        wins[d.name].n++;
        if (w === me) wins[d.name].w++;
      }
    }
  } catch (e) {
    errors++;
    console.error(`対戦${i + 1}でエラー:`, e);
    console.error(g.log.slice(-15).map((l) => l.text).join("\n"));
    if (errors > 5) break;
  }
}

console.log(`対戦 ${games}回 / エラー ${errors} / 引き分け ${draws} / 平均ターン ${(totalTurns / games).toFixed(1)}`);
console.log("デッキ別勝率:");
for (const [name, r] of Object.entries(wins).sort((a, b) => b[1].w / b[1].n - a[1].w / a[1].n)) {
  console.log(`  ${name}: ${((r.w / r.n) * 100).toFixed(0)}% (${r.n}戦)`);
}
const unused = cards.filter((c) => !used.has(c.id) && !c.type.includes("クリーチャー") && c.type !== "エンチャント" && c.type !== "アーティファクト");
const unusedPerm = cards.filter((c) => !used.has(c.id) && !unused.includes(c));
console.log(`使われた種類 ${used.size}/${cards.length}`);
if (unused.length) console.log("一度も唱えられなかった呪文:", unused.map((c) => c.name).join("、"));
if (unusedPerm.length) console.log("一度も唱えられなかったパーマネント:", unusedPerm.map((c) => c.name).join("、"));
if (errors) process.exit(1);
