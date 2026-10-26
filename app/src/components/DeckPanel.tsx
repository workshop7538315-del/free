import { useMemo, useState } from "react";
import { CardTip } from "./CardTip";
import type { Card, DeckDraft, SavedDeck } from "../types";
import { DECK_SIZE, EXTRA_SIZE, addCard, deckCount, deckStats, deckToText, extraCount, isExtra, validateDeck } from "../lib/deck";
import { manaValue } from "../lib/mana";
import { ManaCost } from "./ManaCost";
import { ManaBalance, ManaCurve } from "./ManaBalance";

type Props = {
  draft: DeckDraft;
  onDraftChange: (d: DeckDraft) => void;
  byId: Map<string, Card>;
  dirty: boolean;
  canSave: boolean;
  saveHint: string | null;
  storeLabel: string;
  saving: boolean;
  onSave: () => void;
  onNew: () => void;
  saved: SavedDeck[];
  onLoad: (d: SavedDeck) => void;
  onDelete: (d: SavedDeck) => void;
  status: string | null;
};

const GROUPS: { label: string; test: (c: Card) => boolean }[] = [
  { label: "秘蔵庫", test: (c) => isExtra(c) },
  { label: "クリーチャー", test: (c) => c.type.includes("クリーチャー") },
  { label: "呪文", test: (c) => c.type === "インスタント" || c.type === "ソーサリー" },
  { label: "その他", test: () => true },
];

export function DeckPanel(p: Props) {
  const { draft, byId } = p;
  const total = deckCount(draft.cards, byId);
  const extraTotal = extraCount(draft.cards, byId);
  const issues = useMemo(() => validateDeck(draft.cards, byId), [draft.cards, byId]);
  const stats = useMemo(() => deckStats(draft.cards, byId), [draft.cards, byId]);
  const [copied, setCopied] = useState(false);

  const grouped = useMemo(() => {
    const entries = Object.entries(draft.cards)
      .map(([id, n]) => ({ card: byId.get(id), n }))
      .filter((x): x is { card: Card; n: number } => !!x.card)
      .sort((a, b) => manaValue(a.card.cost) - manaValue(b.card.cost) || a.card.id.localeCompare(b.card.id));
    const used = new Set<string>();
    return GROUPS.map((g) => {
      const items = entries.filter((e) => !used.has(e.card.id) && g.test(e.card));
      items.forEach((e) => used.add(e.card.id));
      return { label: g.label, items, count: items.reduce((a, e) => a + e.n, 0) };
    }).filter((g) => g.items.length > 0);
  }, [draft.cards, byId]);

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(deckToText(draft.name, draft.cards, byId));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* クリップボードが使えない環境では何もしない */
    }
  };

  return (
    <aside className="deck" id="deck" aria-label="デッキ">
      <div className="deck-head">
        <label className="deck-name">
          <span className="visually-hidden">デッキ名</span>
          <input
            value={draft.name}
            maxLength={60}
            placeholder="デッキ名"
            onChange={(e) => p.onDraftChange({ ...draft, name: e.target.value })}
          />
        </label>
        <p className={`deck-total ${total === DECK_SIZE ? "is-ok" : ""}`}>
          <strong>{total}</strong> / {DECK_SIZE}枚
          {extraTotal > 0 && <span className="deck-extra">秘蔵庫 {extraTotal}/{EXTRA_SIZE}</span>}
        </p>
      </div>

      <div className="deck-actions">
        <button type="button" className="btn btn-primary" onClick={p.onSave} disabled={!p.canSave || p.saving}>
          {p.saving ? "保存中…" : draft.id ? "上書き保存" : "保存"}
        </button>
        <button type="button" className="btn" onClick={p.onNew}>
          新しいデッキ
        </button>
        <button type="button" className="btn btn-quiet" onClick={copyText} disabled={total === 0}>
          {copied ? "コピーしました" : "リストをコピー"}
        </button>
      </div>
      <p className="hint">
        保存先:{p.storeLabel}
        {p.dirty && "・未保存の変更があります"}
      </p>
      {p.saveHint && <p className="hint">{p.saveHint}</p>}
      {p.status && (
        <p className="form-message" role="status">
          {p.status}
        </p>
      )}

      {issues.length > 0 && total > 0 && (
        <ul className="issues">
          {issues.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
      )}

      {total === 0 ? (
        <p className="empty">左のカードの「＋」でデッキに入れます。ちょうど40枚、同名カードは4枚までです。</p>
      ) : (
        <>
          <div className="deck-list">
            {grouped.map((g) => (
              <section key={g.label}>
                <h3 className="panel-sub">
                  {g.label}
                  <span className="panel-sub-count">{g.count}</span>
                </h3>
                <ul>
                  {g.items.map(({ card, n }) => (
                    <li key={card.id} className="deck-row">
                      <span className="deck-row-n">{n}</span>
                      <CardTip card={card} />
                      <ManaCost cost={card.cost} size="sm" />
                      <span className="deck-row-steps">
                        <button
                          type="button"
                          className="step step-sm"
                          aria-label={`${card.name}を1枚抜く`}
                          onClick={() => p.onDraftChange({ ...draft, cards: addCard(draft.cards, card.id, -1, card) })}
                        >
                          −
                        </button>
                        <button
                          type="button"
                          className="step step-sm"
                          aria-label={`${card.name}を1枚入れる`}
                          disabled={n >= 4}
                          onClick={() => p.onDraftChange({ ...draft, cards: addCard(draft.cards, card.id, 1, card) })}
                        >
                          ＋
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
          <ManaCurve curve={stats.curve} />
          <ManaBalance stats={stats} />
        </>
      )}

      <label className="deck-note">
        <span className="panel-sub">メモ</span>
        <textarea
          rows={3}
          maxLength={2000}
          value={draft.note}
          placeholder="狙い、入れ替え候補など"
          onChange={(e) => p.onDraftChange({ ...draft, note: e.target.value })}
        />
      </label>

      <section aria-labelledby="saved-title" className="saved">
        <h3 id="saved-title" className="panel-sub">
          保存したデッキ
        </h3>
        {p.saved.length === 0 ? (
          <p className="hint">まだありません。</p>
        ) : (
          <ul>
            {p.saved.map((d) => (
              <li key={d.id} className={`saved-row ${d.id === draft.id ? "is-current" : ""}`}>
                <button type="button" className="saved-open" onClick={() => p.onLoad(d)}>
                  <span className="saved-name">{d.name}</span>
                  <span className="saved-meta">
                    {deckCount(d.cards, byId)}枚、{new Date(d.updatedAt).toLocaleDateString("ja-JP")}更新
                  </span>
                </button>
                <button type="button" className="btn btn-quiet btn-danger" onClick={() => p.onDelete(d)}>
                  削除
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  );
}
