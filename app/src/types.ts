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
  /** 制限カード:デッキに入れられる枚数の上限 */
  limit?: number;
  text: string[];
  flavor?: string;
  /** アーキタイプ(人間、エンチャント、星詠み など) */
  tags?: string[];
  /** 初めて収録されたパックのID(p1, p2 …) */
  pack?: string;
  /** 収録されたすべてのパック(再録を含む) */
  packs?: string[];
  /** 既存カード強化パックのカードの元カード */
  basedOn?: { id: string; kind: "強化版" | "リメイク" | "サポート" };
};

export type Pack = {
  id: string;
  number: number;
  name: string;
  kind: "新規展開" | "既存カード強化" | "スターター限定";
  /** 弾の番号の代わりに出す名前(スターター限定など) */
  label?: string;
  words: string[];
  theme: string;
  newCards: number;
  reprints: string[];
  total: number;
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
