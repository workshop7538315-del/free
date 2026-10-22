import type { Card } from "../types";
import { MAX_COPIES } from "../lib/deck";
import { cardColors, colorCategory } from "../lib/mana";
import { ManaCost } from "./ManaCost";

/** ルール文中の {5}{G}{G} や {T} を記号で表示する */
function RulesText({ text }: { text: string }) {
  const parts = text.split(/((?:\{[^}]+\})+)/);
  return (
    <>
      {parts.map((part, i) => {
        if (!part.startsWith("{")) return part;
        if (part === "{T}") return <span key={i} className="pip pip-generic" role="img" aria-label="タップ">↷</span>;
        return <ManaCost key={i} cost={part} size="sm" />;
      })}
    </>
  );
}

type Props = {
  card: Card;
  count: number;
  onChange: (delta: number) => void;
};

export function CardTile({ card, count, onChange }: Props) {
  const category = colorCategory(card.cost);
  const colors = cardColors(card.cost);
  const frame =
    colors.length > 1
      ? `linear-gradient(135deg, ${colors.map((c) => `var(--mana-${c})`).join(", ")})`
      : `linear-gradient(var(--mana-${category}), var(--mana-${category}))`;
  const isCreature = card.power !== undefined && card.toughness !== undefined;

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
      </div>
      <footer className="card-foot">
        <span className="card-rarity">{card.rarity}</span>
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
          disabled={count >= MAX_COPIES}
          aria-label={`${card.name}を1枚入れる`}
        >
          ＋
        </button>
      </div>
    </article>
  );
}
