import { useLayoutEffect, useRef } from "react";
import { useMotion } from "../lib/motion";

/** 表示するページ番号。null は「…」 */
export function pageItems(page: number, pages: number): (number | null)[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  let mid: number[];
  if (page <= 3) mid = [1, 2, 3, 4, 5];
  else if (page >= pages - 2) mid = [pages - 4, pages - 3, pages - 2, pages - 1, pages];
  else mid = [page - 1, page, page + 1];
  const nums = [...new Set([1, ...mid, pages])].sort((a, b) => a - b);
  const out: (number | null)[] = [];
  nums.forEach((n, i) => {
    if (i > 0 && n - nums[i - 1] > 1) out.push(null);
    out.push(n);
  });
  return out;
}

type Props = { page: number; pages: number; onChange: (p: number) => void; range: string; label: string };

/** ページ番号のタブ。選択中の印は1つの要素を動かし、行きすぎて傾いてから止まる(急ブレーキ) */
export function Pager({ page, pages, onChange, range, label }: Props) {
  const motion = useMotion();
  const listRef = useRef<HTMLDivElement>(null);
  const indRef = useRef<HTMLSpanElement>(null);
  const prev = useRef<{ page: number; left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const list = listRef.current;
    const ind = indRef.current;
    const btn = list?.querySelector<HTMLElement>(`[data-page="${page}"]`);
    if (!ind || !btn) return;
    const b = { left: btn.offsetLeft, width: btn.offsetWidth };
    ind.style.left = `${b.left}px`;
    ind.style.width = `${b.width}px`;
    const a = prev.current;
    if (motion && a && a.page !== page && typeof ind.animate === "function") {
      const dir = page > a.page ? 1 : -1;
      ind.animate(
        [
          { transform: `translateX(${a.left - b.left}px)` },
          { transform: `translateX(${dir * 7}px) skewX(${-dir * 18}deg) scale(1.05, 0.95)`, offset: 0.65 },
          { transform: `translateX(${-dir * 2}px) skewX(${dir * 5}deg)`, offset: 0.85 },
          { transform: "none" },
        ],
        { duration: 450, easing: "ease-out" },
      );
    }
    prev.current = { page, ...b };
  });

  if (pages <= 1) return <p className="pager-range">{range}</p>;
  return (
    <nav className="pager" aria-label={label}>
      <div className="pager-tabs" ref={listRef}>
        <span className="ui-tab-indicator" ref={indRef} aria-hidden="true" />
        <button type="button" className="pager-btn" onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label="前のページ">
          ‹
        </button>
        {pageItems(page, pages).map((n, i) =>
          n === null ? (
            <span key={`gap-${i}`} className="pager-gap" aria-hidden="true">
              …
            </span>
          ) : (
            <button
              key={n}
              type="button"
              data-page={n}
              className={`pager-btn pager-num ${n === page ? "is-current" : ""}`}
              aria-current={n === page ? "page" : undefined}
              aria-label={`${n}ページ目`}
              onClick={() => n !== page && onChange(n)}
            >
              {n}
            </button>
          ),
        )}
        <button type="button" className="pager-btn" onClick={() => onChange(page + 1)} disabled={page >= pages} aria-label="次のページ">
          ›
        </button>
      </div>
      <span className="pager-range">{range}</span>
    </nav>
  );
}
