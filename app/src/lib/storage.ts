import type { SupabaseClient } from "@supabase/supabase-js";
import type { DeckCards, DeckDraft, SavedDeck } from "../types";

export interface DeckStore {
  /** 画面に出す保存先の名前 */
  label: string;
  list(): Promise<SavedDeck[]>;
  save(deck: DeckDraft): Promise<SavedDeck>;
  remove(id: string): Promise<void>;
}

type DeckRow = {
  id: string;
  name: string;
  note: string;
  cards: DeckCards;
  updated_at: string;
};

const fromRow = (r: DeckRow): SavedDeck => ({
  id: r.id,
  name: r.name,
  note: r.note,
  cards: r.cards ?? {},
  updatedAt: r.updated_at,
});

/** Supabase の decks テーブルに保存する。行レベルセキュリティで本人の分だけ見える */
export function supabaseStore(client: SupabaseClient): DeckStore {
  const cols = "id, name, note, cards, updated_at";
  return {
    label: "クラウド",
    async list() {
      const { data, error } = await client.from("decks").select(cols).order("updated_at", { ascending: false });
      if (error) throw error;
      return (data as DeckRow[]).map(fromRow);
    },
    async save(deck) {
      const values = { name: deck.name, note: deck.note, cards: deck.cards };
      const query = deck.id
        ? client.from("decks").update(values).eq("id", deck.id)
        : client.from("decks").insert(values);
      const { data, error } = await query.select(cols).single();
      if (error) throw error;
      return fromRow(data as DeckRow);
    },
    async remove(id) {
      const { error } = await client.from("decks").delete().eq("id", id);
      if (error) throw error;
    },
  };
}

const LOCAL_KEY = "deck-builder.decks.v1";

function readLocal(): SavedDeck[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    const parsed = raw ? (JSON.parse(raw) as SavedDeck[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocal(decks: SavedDeck[]) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(decks));
  } catch {
    throw new Error("このブラウザでは保存できませんでした。プライベートブラウズを解除するか、ログインしてクラウドに保存してください。");
  }
}

/** Supabase を使わないときの保存先。このブラウザだけに残る */
export function localStore(): DeckStore {
  return {
    label: "このブラウザ",
    async list() {
      return readLocal().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },
    async save(deck) {
      const decks = readLocal();
      const saved: SavedDeck = {
        id: deck.id ?? crypto.randomUUID(),
        name: deck.name,
        note: deck.note,
        cards: deck.cards,
        updatedAt: new Date().toISOString(),
      };
      writeLocal([saved, ...decks.filter((d) => d.id !== saved.id)]);
      return saved;
    },
    async remove(id) {
      writeLocal(readLocal().filter((d) => d.id !== id));
    },
  };
}
