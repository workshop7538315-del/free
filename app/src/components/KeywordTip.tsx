import { useEffect, useId, useRef, useState } from "react";
import type { Keyword } from "../lib/keywords";

const TIP_WIDTH = 256;
const MARGIN = 8;

/**
 * カード文中のキーワード。ホバー・フォーカス・タップで説明を出す。
 * 説明は画面端からはみ出さないよう、画面座標で位置を決める。
 */
export function KeywordTip({ text, keyword }: { text: string; keyword: Keyword }) {
  const id = useId();
  const ref = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number; below: boolean } | null>(null);

  const show = () => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const width = Math.min(TIP_WIDTH, window.innerWidth - MARGIN * 2);
    const left = Math.min(Math.max(MARGIN, r.left + r.width / 2 - width / 2), window.innerWidth - width - MARGIN);
    const below = r.top < 140;
    setPos({ left, top: below ? r.bottom + 6 : r.top - 6, below });
  };
  const hide = () => setPos(null);

  // 開いている間にスクロールしたら閉じる(位置がずれるため)
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

  return (
    <>
      <button
        ref={ref}
        type="button"
        className="kw"
        aria-describedby={pos ? id : undefined}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onClick={() => (pos ? hide() : show())}
        onKeyDown={(e) => e.key === "Escape" && hide()}
      >
        {text}
      </button>
      {pos && (
        <span
          id={id}
          role="tooltip"
          className={`kw-tip ${pos.below ? "is-below" : ""}`}
          style={{ left: pos.left, top: pos.top, width: Math.min(TIP_WIDTH, window.innerWidth - MARGIN * 2) }}
        >
          <strong className="kw-tip-name">
            {keyword.name}
            <span className="kw-tip-kind">{keyword.kind === "独自" ? "このゲーム独自" : "基本キーワード"}</span>
          </strong>
          {keyword.reminder}
        </span>
      )}
    </>
  );
}
