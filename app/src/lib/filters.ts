import type { Card, DeckCards } from "../types";
import { cardColors, colorCategory, manaValue, type Color } from "./mana";
import { cardKeywords } from "./keywords";

export type Range = { min: number | null; max: number | null };

export type FilterState = {
  /** 選んだ色(白青黒赤緑) */
  colors: Color[];
  /** 欠色を選んでいるか */
  colorless: boolean;
  /** 多色を選んでいるか */
  multi: boolean;
  /** 多色を選んで色も指定したとき:その色をすべて含む / ちょうどその色 */
  multiMatch: "include" | "exact";
  /** カードタイプ(複数選べる。空ならすべて) */
  types: string[];
  keyword: string;
  /** アーキタイプ(カードの tags) */
  archetype: string;
  /** 収録パック(パックID。空ならすべて) */
  pack: string;
  query: string;
  onlyInDeck: boolean;
  cost: Range;
  power: Range;
  toughness: Range;
};

export const emptyRange = (): Range => ({ min: null, max: null });

export const initialFilters = (): FilterState => ({
  colors: [],
  colorless: false,
  multi: false,
  multiMatch: "include",
  types: [],
  keyword: "",
  archetype: "",
  pack: "",
  query: "",
  onlyInDeck: false,
  cost: emptyRange(),
  power: emptyRange(),
  toughness: emptyRange(),
});

const rangeActive = (r: Range) => r.min !== null || r.max !== null;
const inRange = (v: number, r: Range) => (r.min === null || v >= r.min) && (r.max === null || v <= r.max);

/** 数値の絞り込みがいくつ有効か(画面の表示用) */
export function activeRangeCount(f: FilterState): number {
  return [f.cost, f.power, f.toughness].filter(rangeActive).length;
}

export function isFiltering(f: FilterState): boolean {
  return (
    f.colors.length > 0 ||
    f.colorless ||
    f.multi ||
    f.types.length > 0 ||
    !!f.keyword ||
    !!f.archetype ||
    !!f.pack ||
    !!f.query.trim() ||
    f.onlyInDeck ||
    activeRangeCount(f) > 0
  );
}

/**
 * 色の判定。
 * - 何も選んでいない:すべて
 * - 多色を選んでいない:選んだ単色・欠色のカードだけ
 * - 多色だけ選んだ:多色カードだけ
 * - 多色+色:その色を含む(またはちょうどその色の)多色カード
 */
function matchColor(card: Card, f: FilterState): boolean {
  const colors = cardColors(card.cost);
  if (f.multi) {
    if (colors.length < 2) return false;
    if (f.colors.length === 0) return true;
    const hasAll = f.colors.every((c) => colors.includes(c));
    return f.multiMatch === "include" ? hasAll : hasAll && colors.length === f.colors.length;
  }
  if (f.colors.length === 0 && !f.colorless) return true;
  const cat = colorCategory(card.cost);
  if (cat === "C") return f.colorless;
  if (cat === "M") return false;
  return f.colors.includes(cat);
}

export function applyFilters(cards: Card[], f: FilterState, deck: DeckCards): Card[] {
  const q = f.query.trim().toLowerCase();
  return cards
    .filter((c) => matchColor(c, f))
    .filter((c) => f.types.length === 0 || f.types.some((t) => c.type.includes(t)))
    .filter((c) => !f.keyword || cardKeywords(c).has(f.keyword))
    .filter((c) => !f.archetype || (c.tags ?? []).includes(f.archetype))
    .filter((c) => !f.pack || (c.packs ?? [c.pack]).includes(f.pack))
    .filter((c) => !f.onlyInDeck || (deck[c.id] ?? 0) > 0)
    .filter((c) => inRange(manaValue(c.cost), f.cost))
    .filter((c) => !rangeActive(f.power) || (c.power !== undefined && inRange(c.power, f.power)))
    .filter((c) => !rangeActive(f.toughness) || (c.toughness !== undefined && inRange(c.toughness, f.toughness)))
    .filter((c) => !q || [c.name, c.type, c.subtype ?? "", ...c.text].join(" ").toLowerCase().includes(q))
    .sort((a, b) => manaValue(a.cost) - manaValue(b.cost) || a.id.localeCompare(b.id));
}

const COLOR_JA: Record<Color, string> = { W: "白", U: "青", B: "黒", R: "赤", G: "緑" };
const rangeText = (label: string, r: Range) =>
  !rangeActive(r) ? "" : r.min !== null && r.max !== null ? (r.min === r.max ? `${label}${r.min}` : `${label}${r.min}〜${r.max}`) : r.min !== null ? `${label}${r.min}以上` : `${label}${r.max}以下`;

/** 今かけている条件の短い説明(絞り込みの見出し用)。条件がなければ「なし」 */
export function filterSummary(f: FilterState, packName: (id: string) => string): string {
  const parts = [
    ...f.colors.map((c) => COLOR_JA[c]),
    f.colorless ? "欠色" : "",
    f.multi ? (f.multiMatch === "exact" && f.colors.length ? "ちょうど多色" : "多色") : "",
    ...f.types,
    f.keyword,
    f.archetype,
    f.pack ? packName(f.pack) : "",
    f.query.trim() ? `「${f.query.trim()}」` : "",
    rangeText("コスト", f.cost),
    rangeText("パワー", f.power),
    rangeText("タフネス", f.toughness),
    f.onlyInDeck ? "デッキ内" : "",
  ].filter(Boolean);
  return parts.length ? parts.join("・") : "なし";
}

export type SortKey = "cost" | "name" | "color" | "pack";
const COLOR_ORDER = ["W", "U", "B", "R", "G", "M", "C"];

/** 一覧の並び順。同じならコスト→ID */
export function sortCards(cards: Card[], key: SortKey, packOrder: (id: string) => number): Card[] {
  if (key === "cost") return cards;
  const byCost = (a: Card, b: Card) => manaValue(a.cost) - manaValue(b.cost) || a.id.localeCompare(b.id);
  const cmp =
    key === "name"
      ? (a: Card, b: Card) => a.name.localeCompare(b.name, "ja") || byCost(a, b)
      : key === "color"
        ? (a: Card, b: Card) => COLOR_ORDER.indexOf(colorCategory(a.cost)) - COLOR_ORDER.indexOf(colorCategory(b.cost)) || byCost(a, b)
        : (a: Card, b: Card) => packOrder(a.pack ?? "") - packOrder(b.pack ?? "") || byCost(a, b);
  return [...cards].sort(cmp);
}
