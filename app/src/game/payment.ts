/**
 * マナの支払い。どのマナ源をどのコスト記号に充てるかを自動で決める。
 */
import { parseCost } from "../lib/mana";

/** マナ1つ分の出どころ */
export type ManaUnit = {
  /** 同じ tapGroup のユニットは、どれか1つを使えばまとめてタップされる */
  tapGroup: string;
  /** 出せるマナの候補(W/U/B/R/G/C) */
  options: string[];
  /** 小さいほど先に使う(浮いているマナ < マナゾーン < パーマネント) */
  priority: number;
};

export type Payment = {
  usedGroups: Set<string>;
  usedUnits: Set<number>;
};

type Exact = string[];

/** {2/W} を「白1つ」か「汎用2つ」のどちらで払うか、全通りを作る */
function variants(cost: string, x: number): { exact: Exact[]; generic: number }[] {
  let generic = 0;
  const exact: Exact[] = [];
  const twobrids: string[] = [];
  for (const s of parseCost(cost)) {
    if (s.kind === "generic") generic += s.n;
    else if (s.kind === "x") generic += x;
    else if (s.kind === "colorless") exact.push(["C"]);
    else if (s.kind === "color") exact.push([s.c]);
    else if (s.kind === "hybrid") exact.push([s.a, s.b]);
    else twobrids.push(s.c);
  }
  const out: { exact: Exact[]; generic: number }[] = [];
  const n = twobrids.length;
  for (let mask = 0; mask < 1 << n; mask++) {
    const ex = [...exact];
    let g = generic;
    twobrids.forEach((c, i) => {
      if (mask & (1 << i)) g += 2;
      else ex.push([c]);
    });
    out.push({ exact: ex.sort((a, b) => a.length - b.length), generic: g });
  }
  // 汎用が少ない(=色で払う)順に試す
  return out.sort((a, b) => a.generic - b.generic);
}

function solveExact(exact: Exact[], units: ManaUnit[], used: Set<number>, k: number): boolean {
  if (k >= exact.length) return true;
  const opts = exact[k];
  const cands = units
    .map((_, i) => i)
    .filter((i) => !used.has(i) && units[i].options.some((o) => opts.includes(o)))
    .sort((a, b) => units[a].options.length - units[b].options.length || units[a].priority - units[b].priority);
  // 同じ種類の候補は1つ試せば十分
  const seen = new Set<string>();
  for (const i of cands) {
    const key = `${units[i].options.join("")}:${units[i].priority}`;
    if (seen.has(key)) continue;
    seen.add(key);
    used.add(i);
    if (solveExact(exact, units, used, k + 1)) return true;
    used.delete(i);
  }
  return false;
}

export function findPayment(cost: string, x: number, units: ManaUnit[]): Payment | null {
  for (const v of variants(cost, x)) {
    const used = new Set<number>();
    if (!solveExact(v.exact, units, used, 0)) continue;
    const free = units
      .map((_, i) => i)
      .filter((i) => !used.has(i))
      // 汎用には、出せる色が少なく優先度の低いものから使う
      .sort((a, b) => units[a].priority - units[b].priority || units[a].options.length - units[b].options.length);
    if (free.length < v.generic) continue;
    for (const i of free.slice(0, v.generic)) used.add(i);
    const usedGroups = new Set<string>();
    for (const i of used) usedGroups.add(units[i].tapGroup);
    return { usedGroups, usedUnits: used };
  }
  return null;
}
