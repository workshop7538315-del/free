import type { Card, DeckCards } from "../types";
import { COLORS, cardColors, colorPips, manaValue, type Color } from "./mana";

export const DECK_SIZE = 40;
export const MAX_COPIES = 4;

export function deckCount(cards: DeckCards): number {
  return Object.values(cards).reduce((a, b) => a + b, 0);
}

export function addCard(cards: DeckCards, id: string, delta: number): DeckCards {
  const next = { ...cards };
  const n = Math.max(0, Math.min(MAX_COPIES, (next[id] ?? 0) + delta));
  if (n === 0) delete next[id];
  else next[id] = n;
  return next;
}

/** デッキのルール違反を文章で返す。空配列なら使えるデッキ */
export function validateDeck(cards: DeckCards, byId: Map<string, Card>): string[] {
  const issues: string[] = [];
  const total = deckCount(cards);
  if (total < DECK_SIZE) issues.push(`あと${DECK_SIZE - total}枚入れてください(デッキはちょうど${DECK_SIZE}枚)。`);
  if (total > DECK_SIZE) issues.push(`${total - DECK_SIZE}枚多いです(デッキはちょうど${DECK_SIZE}枚)。`);
  for (const [id, n] of Object.entries(cards)) {
    const card = byId.get(id);
    if (!card) issues.push(`カードID「${id}」はカードリストにありません。`);
    else if (n > MAX_COPIES) issues.push(`「${card.name}」が${n}枚あります(同名カードは${MAX_COPIES}枚まで)。`);
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
    if (!card) continue;
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
