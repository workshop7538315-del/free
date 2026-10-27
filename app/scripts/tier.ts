/**
 * スターターデッキの総当たり戦(CPU同士)。勝率・相性表・ティアを出す。
 *   npm run tier -- [1組あたりの対戦数(偶数、既定40)]
 * 結果は docs/tier.md と docs/tier-data.json に書き出す。
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import cardsJson from "../../cards/cards.json";
import decksJson from "../../cards/decks.json";
import type { Card } from "../src/types";
import { Game, type PlayerId } from "../src/game/engine";
import { CpuAgent } from "../src/game/ai";

const here = dirname(fileURLToPath(import.meta.url));
const cards = cardsJson as Card[];
const byId = new Map(cards.map((c) => [c.id, c]));
type Deck = { id: string; name: string; colors: string[]; archetype?: string; cards: Record<string, number> };
// 旧スターターは総当たりに入れない
const decks = (decksJson as (Deck & { legacy?: boolean })[]).filter((d) => !d.legacy);
const expand = (d: Deck) => Object.entries(d.cards).flatMap(([id, n]) => Array.from({ length: n }, () => byId.get(id)!));

const perPair = Math.max(2, Math.floor(Number(process.argv[2] ?? 40) / 2) * 2);
const n = decks.length;
/** wins[i][j] = i が j に勝った回数 */
const wins = Array.from({ length: n }, () => Array(n).fill(0) as number[]);
const games = Array.from({ length: n }, () => Array(n).fill(0) as number[]);
const firstWins = { first: 0, total: 0 };
let turns = 0;
let total = 0;
let seed = 1;

const started = Date.now();
for (let i = 0; i < n; i++) {
  for (let j = i + 1; j < n; j++) {
    for (let k = 0; k < perPair; k++) {
      // 先攻・後攻を半分ずつ入れ替える
      const first = (k % 2) as PlayerId;
      const g = new Game({
        decks: [expand(decks[i]), expand(decks[j])],
        names: [decks[i].name, decks[j].name],
        agents: [new CpuAgent(), new CpuAgent()],
        seed: seed++,
        first,
        maxTurns: 80,
      });
      const w = await g.run();
      games[i][j]++;
      games[j][i]++;
      total++;
      turns += g.turn;
      if (w === 0) wins[i][j]++;
      if (w === 1) wins[j][i]++;
      if (w !== null) {
        firstWins.total++;
        if (w === first) firstWins.first++;
      }
    }
  }
  process.stderr.write(`\r${i + 1}/${n} デッキ終了`);
}
process.stderr.write("\n");

// ---------------------------------------------------------------- 集計
/** ウィルソンの95%信頼区間 */
function wilson(w: number, m: number): [number, number] {
  if (m === 0) return [0, 1];
  const z = 1.96;
  const p = w / m;
  const d = 1 + (z * z) / m;
  const c = (p + (z * z) / (2 * m)) / d;
  const h = (z * Math.sqrt((p * (1 - p)) / m + (z * z) / (4 * m * m))) / d;
  return [c - h, c + h];
}

const TIERS = [
  { tier: "S", min: 0.6, label: "環境トップ" },
  { tier: "A", min: 0.54, label: "強い" },
  { tier: "B", min: 0.46, label: "標準" },
  { tier: "C", min: 0.4, label: "やや弱い" },
  { tier: "D", min: 0, label: "弱い" },
];

const rows = decks.map((d, i) => {
  const w = wins[i].reduce((a, b) => a + b, 0);
  const m = games[i].reduce((a, b) => a + b, 0);
  const rate = w / m;
  const [lo, hi] = wilson(w, m);
  const matchups = decks.map((_, j) => (i === j ? null : wins[i][j] / games[i][j]));
  const favorable = matchups.filter((x) => x !== null && x >= 0.6).length;
  const unfavorable = matchups.filter((x) => x !== null && x <= 0.4).length;
  const tier = TIERS.find((t) => rate >= t.min)!.tier;
  return { id: d.id, name: d.name, colors: d.colors, archetype: d.archetype ?? "汎用", wins: w, games: m, rate, lo, hi, tier, favorable, unfavorable, matchups };
});
rows.sort((a, b) => b.rate - a.rate);

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
const elapsed = ((Date.now() - started) / 1000).toFixed(0);

const data = {
  generatedAt: new Date().toISOString(),
  perPair,
  totalGames: total,
  averageTurns: turns / total,
  firstPlayerWinRate: firstWins.first / firstWins.total,
  tiers: TIERS,
  decks: decks.map((d) => ({ id: d.id, name: d.name })),
  rows,
};
writeFileSync(join(here, "../../docs/tier-data.json"), JSON.stringify(data, null, 1) + "\n");

// ---------------------------------------------------------------- Markdown
const lines: string[] = [];
lines.push("# スターターデッキのティア表", "");
lines.push(
  `スターターデッキ${n}種類の総当たり戦(CPU同士、1組${perPair}戦、先攻・後攻は半分ずつ)。合計${total}戦、平均${(turns / total / 2).toFixed(1)}ターン(各プレイヤー)。先攻の勝率は${pct(firstWins.first / firstWins.total)}。`,
  "",
);
lines.push("ティアの基準:" + TIERS.map((t, i) => `**${t.tier}**(${t.label}):${i === TIERS.length - 1 ? `${Math.round(TIERS[i - 1].min * 100)}%未満` : `${Math.round(t.min * 100)}%以上`}`).join("、"), "");
lines.push("> CPU同士の対戦結果です。CPUが上手く扱えない仕組み(装備の付け替え、生け贄のタイミングなど)を持つデッキは、人間が使うと評価より強い可能性があります。", "");
for (const t of TIERS) {
  const inTier = rows.filter((r) => r.tier === t.tier);
  if (!inTier.length) continue;
  lines.push(`## ${t.tier}ティア(${t.label})`, "");
  lines.push("| デッキ | 勝率 | 95%区間 | 有利(60%以上) | 不利(40%以下) |", "|---|---|---|---|---|");
  for (const r of inTier) lines.push(`| ${r.name} | **${pct(r.rate)}** | ${pct(r.lo)}〜${pct(r.hi)} | ${r.favorable} | ${r.unfavorable} |`);
  lines.push("");
}
lines.push("## 相性表", "", "行のデッキから見た、列のデッキへの勝率です(ティア順)。", "");
const short = (name: string) => name.split(":")[0];
const order = rows.map((r) => decks.findIndex((d) => d.id === r.id));
lines.push(`| | ${order.map((j) => short(decks[j].name)).join(" | ")} |`);
lines.push(`|---|${order.map(() => "---").join("|")}|`);
for (const r of rows) {
  const i = decks.findIndex((d) => d.id === r.id);
  lines.push(`| **${r.name}** | ${order.map((j) => (i === j ? "―" : `${Math.round((wins[i][j] / games[i][j]) * 100)}`)).join(" | ")} |`);
}
lines.push("", `再集計:\`cd app && npm run tier -- ${perPair}\`(約${elapsed}秒)`, "");
writeFileSync(join(here, "../../docs/tier.md"), lines.join("\n"));

for (const r of rows) console.log(`${r.tier}  ${pct(r.rate).padStart(6)}  (${pct(r.lo)}〜${pct(r.hi)})  ${r.name}`);
console.log(`合計${total}戦 / 先攻勝率 ${pct(firstWins.first / firstWins.total)} / ${elapsed}秒`);
