import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import rawCards from "../../cards/cards.json";
import rawDecks from "../../cards/decks.json";
import type { Card, DeckDraft, SavedDeck } from "./types";
import { DECK_SIZE, addCard, deckCount } from "./lib/deck";
import { COLORS } from "./lib/mana";
import { applyFilters, initialFilters, type FilterState } from "./lib/filters";
import { supabase } from "./lib/supabase";
import { localStore, supabaseStore, type DeckStore } from "./lib/storage";
import { CardTile } from "./components/CardTile";
import { DeckPanel } from "./components/DeckPanel";
import { Account } from "./components/Account";
import { Filters } from "./components/Filters";
import { Battle, type StarterDeck } from "./components/battle/Battle";

const CARDS = rawCards as Card[];
const BY_ID = new Map(CARDS.map((c) => [c.id, c]));
const STARTERS = rawDecks as unknown as StarterDeck[];
const ARCHETYPES = (() => {
  const counts = new Map<string, number>();
  for (const c of CARDS) for (const t of c.tags ?? []) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
})();

const emptyDraft = (): DeckDraft => ({ name: "新しいデッキ", note: "", cards: {} });

const DRAFT_KEY = "deck-builder.draft.v1";
function loadDraft(): DeckDraft {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) return JSON.parse(raw) as DeckDraft;
  } catch {
    /* 読めなければ空のデッキから */
  }
  return emptyDraft();
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [draft, setDraft] = useState<DeckDraft>(loadDraft);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState<SavedDeck[]>([]);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [mode, setMode] = useState<"build" | "battle">("build");

  // ログイン状態
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const store: DeckStore | null = useMemo(() => {
    if (!supabase) return localStore();
    return session ? supabaseStore(supabase) : null;
  }, [session]);

  const refresh = useCallback(async () => {
    if (!store) {
      setSaved([]);
      return;
    }
    try {
      setSaved(await store.list());
    } catch (e) {
      setStatus(`保存したデッキを読み込めませんでした:${errorText(e)}`);
    }
  }, [store]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // 作業中のデッキはこのブラウザに自動で残す(保存とは別)
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      /* 残せなくても動作に支障はない */
    }
  }, [draft]);

  const changeDraft = (d: DeckDraft) => {
    setDraft(d);
    setDirty(true);
    setStatus(null);
  };

  const save = async () => {
    if (!store) return;
    const name = draft.name.trim();
    if (!name) {
      setStatus("デッキ名を入れてください。");
      return;
    }
    setSaving(true);
    try {
      const result = await store.save({ ...draft, name });
      setDraft({ id: result.id, name: result.name, note: result.note, cards: result.cards });
      setDirty(false);
      setStatus(`「${result.name}」を保存しました。`);
      await refresh();
    } catch (e) {
      setStatus(`保存できませんでした:${errorText(e)}`);
    } finally {
      setSaving(false);
    }
  };

  const confirmDiscard = () => !dirty || window.confirm("未保存の変更があります。破棄してよいですか?");

  const load = (d: SavedDeck) => {
    if (!confirmDiscard()) return;
    setDraft({ id: d.id, name: d.name, note: d.note, cards: d.cards });
    setDirty(false);
    setStatus(`「${d.name}」を開きました。`);
  };

  const newDeck = () => {
    if (!confirmDiscard()) return;
    setDraft(emptyDraft());
    setDirty(false);
    setStatus(null);
  };

  const remove = async (d: SavedDeck) => {
    if (!store || !window.confirm(`「${d.name}」を削除します。元に戻せません。`)) return;
    try {
      await store.remove(d.id);
      if (draft.id === d.id) setDraft({ ...draft, id: undefined });
      setStatus(`「${d.name}」を削除しました。`);
      await refresh();
    } catch (e) {
      setStatus(`削除できませんでした:${errorText(e)}`);
    }
  };

  const visible = useMemo(() => applyFilters(CARDS, filters, draft.cards), [filters, draft.cards]);

  return (
    <div className="app">
      <header className="topbar">
        <h1 className="title">
          <span className="title-pips" aria-hidden="true">
            {COLORS.map((c) => (
              <span key={c} className={`pip pip-${c}`} />
            ))}
          </span>
          デッキビルダー
        </h1>
        <nav className="tabs" aria-label="画面の切り替え">
          <button type="button" className="tab" aria-current={mode === "build" ? "page" : undefined} onClick={() => setMode("build")}>
            デッキを組む
          </button>
          <button type="button" className="tab" aria-current={mode === "battle" ? "page" : undefined} onClick={() => setMode("battle")}>
            対戦する
          </button>
        </nav>
        <Account session={session} />
      </header>

      {mode === "battle" ? (
        <main className="battle-wrap">
          <Battle byId={BY_ID} starters={STARTERS} saved={saved} draft={draft} />
        </main>
      ) : (
      <main className="layout">
        <section className="pool" aria-label="カード一覧">
          <Filters archetypes={ARCHETYPES} value={filters} onChange={setFilters} shown={visible.length} total={CARDS.length} />

          {visible.length === 0 ? (
            <p className="empty">条件に合うカードがありません。絞り込みを外してみてください。</p>
          ) : (
            <div className="card-grid">
              {visible.map((card) => (
                <CardTile
                  key={card.id}
                  card={card}
                  count={draft.cards[card.id] ?? 0}
                  onChange={(delta) => changeDraft({ ...draft, cards: addCard(draft.cards, card.id, delta, card) })}
                />
              ))}
            </div>
          )}
        </section>

        <DeckPanel
          draft={draft}
          onDraftChange={changeDraft}
          byId={BY_ID}
          dirty={dirty}
          canSave={!!store}
          saveHint={store ? null : "保存するにはログインしてください。"}
          storeLabel={store?.label ?? "未ログイン"}
          saving={saving}
          onSave={save}
          onNew={newDeck}
          saved={saved}
          onLoad={load}
          onDelete={remove}
          status={status}
        />
      </main>
      )}

      {mode === "build" && (
      <a className="mobile-bar" href="#deck">
        <span>
          <strong>{deckCount(draft.cards, BY_ID)}</strong> / {DECK_SIZE}枚
        </span>
        デッキを見る
      </a>
      )}
    </div>
  );
}

function errorText(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === "object" && "message" in e) return String((e as { message: unknown }).message);
  return String(e);
}
