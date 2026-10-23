import rawPacks from "../../../cards/packs.json";
import rawCards from "../../../cards/cards.json";
import type { Card, Pack } from "../types";

export const PACKS = rawPacks as unknown as Pack[];
const BY_ID = new Map(PACKS.map((p) => [p.id, p]));
const CARD_NAME = new Map((rawCards as Card[]).map((c) => [c.id, c.name]));

export const packById = (id: string) => BY_ID.get(id);
/** 「第4弾」 */
export const packShort = (id: string) => {
  const p = BY_ID.get(id);
  return p ? `第${p.number}弾` : id;
};
/** 「第4弾「紋章の目覚め」」 */
export const packLabel = (id: string) => {
  const p = BY_ID.get(id);
  return p ? `第${p.number}弾「${p.name}」` : id;
};
export const cardName = (id: string) => CARD_NAME.get(id) ?? id;
