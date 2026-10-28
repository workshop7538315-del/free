import type { Card } from "../types";
import { maxCopies } from "../lib/deck";
import { cardColors, colorCategory } from "../lib/mana";
import { ManaCost } from "./ManaCost";
import { KeywordTip } from "./KeywordTip";
import { splitKeywords } from "../lib/keywords";
import { cardName, packLabel, packShort } from "../lib/packs";
import { CardTip } from "./CardTip";

/** ルール文中の {5}{G}{G} や {T} を記号に、キーワードを説明つきにして表示する */
export function RulesText({ text }: { text: string }) {
  const parts = text.split(/((?:\{[^}]+\})+)/);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("{")) {
          if (part === "{T}")
            return (
              <span key={i} className="pip pip-generic" role="img" aria-label="タップ">
                ↷
              </span>
            );
          return <ManaCost key={i} cost={part} size="sm" />;
        }
        return splitKeywords(part).map((seg, j) =>
          seg.keyword ? <KeywordTip key={`${i}-${j}`} text={seg.text} keyword={seg.keyword} /> : <span key={`${i}-${j}`}>{seg.text}</span>,
        );
      })}
    </>
  );
}

type Props = {
  card: Card;
  count: number;
  onChange: (delta: number) => void;
  /** 小さい表示:名前・コスト・P/T(なければタイプ)・＋/−だけ。名前を押すと全文 */
  compact?: boolean;
};

export function CardTile({ card, count, onChange, compact = false }: Props) {
  const category = colorCategory(card.cost);
  const colors = cardColors(card.cost);
  const frame =
    colors.length > 1
      ? `linear-gradient(135deg, ${colors.map((c) => `var(--mana-${c})`).join(", ")})`
      : `linear-gradient(var(--mana-${category}), var(--mana-${category}))`;
  const isCreature = card.power !== undefined && card.toughness !== undefined;

  if (compact)
    return (
      <article className={`card card-compact card-${category}`} style={{ "--frame": frame } as React.CSSProperties}>
        <header className="card-head">
          <CardTip card={card} className="card-name card-compact-name" />
          <ManaCost cost={card.cost} size="sm" />
        </header>
        <div className="card-compact-foot">
          <span className={isCreature ? "card-pt" : "card-compact-type"}>{isCreature ? `${card.power}/${card.toughness}` : card.type}</span>
          <span className="card-actions">
            <button type="button" className="step step-sm" onClick={() => onChange(-1)} disabled={count === 0} aria-label={`${card.name}を1枚抜く`}>
              −
            </button>
            <span className="card-count" aria-live="polite">
              {count}
            </span>
            <button type="button" className="step step-sm" onClick={() => onChange(1)} disabled={count >= maxCopies(card)} aria-label={`${card.name}を1枚入れる`}>
              ＋
            </button>
          </span>
        </div>
      </article>
    );

  return (
    <article className={`card card-${category}`} style={{ "--frame": frame } as React.CSSProperties}>
      <header className="card-head">
        <h3 className="card-name">{card.name}</h3>
        <ManaCost cost={card.cost} />
      </header>
      <p className="card-type">
        {card.type}
        {card.subtype && ` ― ${card.subtype}`}
      </p>
      <div className="card-text">
        {card.text.length === 0 ? <p className="card-vanilla">(能力なし)</p> : card.text.map((t, i) => <p key={i}><RulesText text={t} /></p>)}
        {card.flavor && <p className="card-flavor">{card.flavor}</p>}
        {card.basedOn && (
          <p className="card-based">
            {card.basedOn.kind}:元「{cardName(card.basedOn.id)}」
          </p>
        )}
      </div>
      <footer className="card-foot">
        <span className="card-rarity">{card.rarity}</span>
        {card.pack && (
          <span className="card-pack" title={(card.packs ?? [card.pack]).map(packLabel).join(" / ")}>
            {packShort(card.pack)}
            {(card.packs?.length ?? 1) > 1 && ` ・再録 ${card.packs!.filter((p) => p !== card.pack).map(packShort).join("・")}`}
          </span>
        )}
        {isCreature && (
          <span className="card-pt">
            {card.power}/{card.toughness}
          </span>
        )}
      </footer>
      <div className="card-actions">
        <button type="button" className="step" onClick={() => onChange(-1)} disabled={count === 0} aria-label={`${card.name}を1枚抜く`}>
          −
        </button>
        <span className="card-count" aria-live="polite">
          {count > 0 ? `${count}枚` : "未投入"}
        </span>
        <button
          type="button"
          className="step"
          onClick={() => onChange(1)}
          disabled={count >= maxCopies(card)}
          aria-label={`${card.name}を1枚入れる`}
        >
          ＋
        </button>
      </div>
    </article>
  );
}
