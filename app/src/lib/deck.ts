import type { Card, DeckCards } from "../types";
import { COLORS, cardColors, colorPips, manaValue, type Color } from "./mana";

export const DECK_SIZE = 40;
export const MAX_COPIES = 4;
/** 秘蔵庫(外部デッキ)の枚数の上限と、同名の上限 */
export const EXTRA_SIZE = 8;
export const EXTRA_COPIES = 2;

/** 秘蔵庫のカード(リリース召喚を持つ) */
export const isExtra = (c: Card | undefined) =>
  !!c?.abilities?.some((a) => a.a === "releaseSummon" || a.a === "entrata" || a.a === "pioneer" || a.a === "assemble" || a.a === "evolveOnly" || a.a === "gem");
export const maxCopies = (c: Card | undefined) => (isExtra(c) ? EXTRA_COPIES : MAX_COPIES);

/** メインデッキの枚数(byId があれば秘蔵庫のカードを除く) */
export function deckCount(cards: DeckCards, byId?: Map<string, Card>): number {
  return Object.entries(cards).reduce((a, [id, n]) => a + (byId && isExtra(byId.get(id)) ? 0 : n), 0);
}

/** 秘蔵庫の枚数 */
export function extraCount(cards: DeckCards, byId: Map<string, Card>): number {
  return Object.entries(cards).reduce((a, [id, n]) => a + (isExtra(byId.get(id)) ? n : 0), 0);
}

export function addCard(cards: DeckCards, id: string, delta: number, card?: Card): DeckCards {
  const next = { ...cards };
  const n = Math.max(0, Math.min(maxCopies(card), (next[id] ?? 0) + delta));
  if (n === 0) delete next[id];
  else next[id] = n;
  return next;
}

/** デッキのルール違反を文章で返す。空配列なら使えるデッキ */
export function validateDeck(cards: DeckCards, byId: Map<string, Card>): string[] {
  const issues: string[] = [];
  const total = deckCount(cards, byId);
  if (total < DECK_SIZE) issues.push(`あと${DECK_SIZE - total}枚入れてください(デッキはちょうど${DECK_SIZE}枚)。`);
  if (total > DECK_SIZE) issues.push(`${total - DECK_SIZE}枚多いです(デッキはちょうど${DECK_SIZE}枚)。`);
  const extra = extraCount(cards, byId);
  if (extra > EXTRA_SIZE) issues.push(`秘蔵庫が${extra}枚あります(秘蔵庫は${EXTRA_SIZE}枚まで)。`);
  for (const [id, n] of Object.entries(cards)) {
    const card = byId.get(id);
    if (!card) issues.push(`カードID「${id}」はカードリストにありません。`);
    else if (n > maxCopies(card)) issues.push(`「${card.name}」が${n}枚あります(${isExtra(card) ? "秘蔵庫の" : ""}同名カードは${maxCopies(card)}枚まで)。`);
  }
  return issues;
}

export type DeckStats = {
  /** マナ総量ごとの枚数。最後の要素は「この値以上」 */
  curve: number[];
  /** 各色について、コストに含まれる色マナ記号の総数 */
  pips: Record<Color, number>;
  /** 各色について、マナゾーンに置くとその色を出せるカードの枚数 */
  sources: Record<Color, number>;
  /** 欠色カードの枚数(無色マナの源) */
  colorlessSources: number;
};

export const CURVE_MAX = 7;

export function deckStats(cards: DeckCards, byId: Map<string, Card>): DeckStats {
  const curve = Array(CURVE_MAX + 1).fill(0) as number[];
  const pips: Record<Color, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  const sources: Record<Color, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  let colorlessSources = 0;
  for (const [id, n] of Object.entries(cards)) {
    const card = byId.get(id);
    if (!card || isExtra(card)) continue;
    curve[Math.min(CURVE_MAX, manaValue(card.cost))] += n;
    const p = colorPips(card.cost);
    const colors = cardColors(card.cost);
    for (const c of COLORS) pips[c] += p[c] * n;
    for (const c of colors) sources[c] += n;
    if (colors.length === 0) colorlessSources += n;
  }
  return { curve, pips, sources, colorlessSources };
}

/** デッキリストをテキストにする(共有・メモ用) */
export function deckToText(name: string, cards: DeckCards, byId: Map<string, Card>): string {
  const lines = Object.entries(cards)
    .map(([id, n]) => ({ card: byId.get(id), n }))
    .filter((x): x is { card: Card; n: number } => !!x.card)
    .sort((a, b) => manaValue(a.card.cost) - manaValue(b.card.cost) || a.card.id.localeCompare(b.card.id))
    .map(({ card, n }) => `${n} ${card.name}`);
  return [`# ${name}`, ...lines].join("\n");
}
