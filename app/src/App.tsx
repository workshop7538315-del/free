import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import rawCards from "../../cards/cards.json";
import type { Card, DeckDraft, SavedDeck } from "./types";
import { DECK_SIZE, addCard, deckCount } from "./lib/deck";
import { COLORS, COLOR_NAMES, colorCategory, manaValue, type ColorCategory } from "./lib/mana";
import { supabase } from "./lib/supabase";
import { localStore, supabaseStore, type DeckStore } from "./lib/storage";
import { CardTile } from "./components/CardTile";
import { DeckPanel } from "./components/DeckPanel";
import { Account } from "./components/Account";

const CARDS = rawCards as Card[];
const BY_ID = new Map(CARDS.map((c) => [c.id, c]));
const CATEGORIES: ColorCategory[] = [...COLORS, "C", "M"];
const TYPE_FILTERS = ["すべて", "クリーチャー", "インスタント", "ソーサリー", "エンチャント", "アーティファクト"];

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

  const [colorFilter, setColorFilter] = useState<Set<ColorCategory>>(new Set());
  const [typeFilter, setTypeFilter] = useState("すべて");
  const [query, setQuery] = useState("");
  const [onlyInDeck, setOnlyInDeck] = useState(false);

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

  const toggleColor = (c: ColorCategory) => {
    const next = new Set(colorFilter);
    if (next.has(c)) next.delete(c);
    else next.add(c);
    setColorFilter(next);
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CARDS.filter((c) => colorFilter.size === 0 || colorFilter.has(colorCategory(c.cost)))
      .filter((c) => typeFilter === "すべて" || c.type.includes(typeFilter))
      .filter((c) => !onlyInDeck || (draft.cards[c.id] ?? 0) > 0)
      .filter((c) => !q || [c.name, c.type, c.subtype ?? "", ...c.text].join(" ").toLowerCase().includes(q))
      .sort((a, b) => manaValue(a.cost) - manaValue(b.cost) || a.id.localeCompare(b.id));
  }, [colorFilter, typeFilter, query, onlyInDeck, draft.cards]);

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
        <Account session={session} />
      </header>

      <main className="layout">
        <section className="pool" aria-label="カード一覧">
          <div className="filters">
            <fieldset className="color-filter">
              <legend className="visually-hidden">色で絞り込む</legend>
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`chip chip-${c}`}
                  aria-pressed={colorFilter.has(c)}
                  onClick={() => toggleColor(c)}
                >
                  {c === "C" ? (
                    <span className="pip pip-C" aria-hidden="true">
                      ◇
                    </span>
                  ) : c === "M" ? (
                    <span className="pip pip-M" aria-hidden="true" />
                  ) : (
                    <span className={`pip pip-${c}`} aria-hidden="true" />
                  )}
                  {COLOR_NAMES[c]}
                </button>
              ))}
            </fieldset>
            <div className="filter-row">
              <label>
                <span className="visually-hidden">カードタイプ</span>
                <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                  {TYPE_FILTERS.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
              <label className="search">
                <span className="visually-hidden">カード名・テキストで検索</span>
                <input type="search" placeholder="名前やテキストで検索" value={query} onChange={(e) => setQuery(e.target.value)} />
              </label>
              <label className="check">
                <input type="checkbox" checked={onlyInDeck} onChange={(e) => setOnlyInDeck(e.target.checked)} />
                デッキに入っているカードだけ
              </label>
            </div>
            <p className="hint">
              {visible.length} / {CARDS.length}種類
            </p>
          </div>

          {visible.length === 0 ? (
            <p className="empty">条件に合うカードがありません。絞り込みを外してみてください。</p>
          ) : (
            <div className="card-grid">
              {visible.map((card) => (
                <CardTile
                  key={card.id}
                  card={card}
                  count={draft.cards[card.id] ?? 0}
                  onChange={(delta) => changeDraft({ ...draft, cards: addCard(draft.cards, card.id, delta) })}
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

      <a className="mobile-bar" href="#deck">
        <span>
          <strong>{deckCount(draft.cards)}</strong> / {DECK_SIZE}枚
        </span>
        デッキを見る
      </a>
    </div>
  );
}

function errorText(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === "object" && "message" in e) return String((e as { message: unknown }).message);
  return String(e);
}
