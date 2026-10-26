import { useEffect, useId, useRef, useState } from "react";
import type { Card } from "../types";
import { ManaCost } from "./ManaCost";

const TIP_WIDTH = 300;
const MARGIN = 8;

/** {2}{G} や {T} を記号にして表示する(ツールチップ用。キーワードの説明はつけない) */
function PlainRules({ text }: { text: string }) {
  return (
    <>
      {text.split(/((?:\{[^}]+\})+)/).map((part, i) =>
        part.startsWith("{") ? (
          part === "{T}" ? (
            <span key={i} className="pip pip-generic" role="img" aria-label="タップ">
              ↷
            </span>
          ) : (
            <ManaCost key={i} cost={part} size="sm" />
          )
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

/**
 * デッキの一覧のカード名。ホバー・フォーカス・タップでカードの内容を出す。
 * 一覧は画面の右側にあるので、できればカード名の左に出す。
 */
export function CardTip({ card }: { card: Card }) {
  const id = useId();
  const ref = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  const show = () => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const width = Math.min(TIP_WIDTH, window.innerWidth - MARGIN * 2);
    const roomLeft = r.left - width - MARGIN >= MARGIN;
    const left = roomLeft ? r.left - width - MARGIN : Math.min(Math.max(MARGIN, r.left), window.innerWidth - width - MARGIN);
    const top = roomLeft ? Math.max(MARGIN, Math.min(r.top - 8, window.innerHeight - 260)) : r.bottom + 6;
    setPos({ left, top });
  };
  const hide = () => setPos(null);

  useEffect(() => {
    if (!pos) return;
    const close = () => setPos(null);
    window.addEventListener("scroll", close, { passive: true, capture: true });
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, { capture: true });
      window.removeEventListener("resize", close);
    };
  }, [pos]);

  const isCreature = card.power !== undefined && card.toughness !== undefined;
  return (
    <>
      <button
        ref={ref}
        type="button"
        className="deck-row-name card-tip-trigger"
        aria-describedby={pos ? id : undefined}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onClick={() => (pos ? hide() : show())}
        onKeyDown={(e) => e.key === "Escape" && hide()}
      >
        {card.name}
      </button>
      {pos && (
        <span id={id} role="tooltip" className="card-tip" style={{ left: pos.left, top: pos.top, width: Math.min(TIP_WIDTH, window.innerWidth - MARGIN * 2) }}>
          <span className="card-tip-head">
            <strong>{card.name}</strong>
            <ManaCost cost={card.cost} size="sm" />
          </span>
          <span className="card-tip-type">
            {card.type}
            {card.subtype && ` ― ${card.subtype}`}
          </span>
          {card.text.length === 0 ? (
            <span className="card-tip-line">(能力なし)</span>
          ) : (
            card.text.map((t, i) => (
              <span key={i} className="card-tip-line">
                <PlainRules text={t} />
              </span>
            ))
          )}
          {isCreature && (
            <span className="card-tip-pt">
              {card.power}/{card.toughness}
            </span>
          )}
        </span>
      )}
    </>
  );
}
