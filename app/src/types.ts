import type { Ability } from "./game/schema";

export type Card = {
  /** 効果のデータ(ゲームエンジンが実行する) */
  abilities?: Ability[];
  id: string;
  name: string;
  cost: string;
  type: string;
  subtype?: string;
  power?: number;
  toughness?: number;
  rarity: string;
  text: string[];
  flavor?: string;
  /** アーキタイプ(人間、エンチャント、星詠み など) */
  tags?: string[];
};

/** カードID → 枚数 */
export type DeckCards = Record<string, number>;

export type DeckDraft = {
  /** 保存済みデッキのID。未保存なら undefined */
  id?: string;
  name: string;
  note: string;
  cards: DeckCards;
};

export type SavedDeck = {
  id: string;
  name: string;
  note: string;
  cards: DeckCards;
  updatedAt: string;
};
