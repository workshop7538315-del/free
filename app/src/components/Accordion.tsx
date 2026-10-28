import { useId, type ReactNode } from "react";
import { usePersistent } from "../lib/motion";

/**
 * 開閉できる見出しつきの欄。開閉の状態はこのブラウザに残す(初期状態は閉じる)。
 * 中の行に ui-acc-row と --i(並び順)を付けると、開いたときに上から順に積み上がる。
 */
export function Accordion({ id, title, meta, children, className = "" }: { id: string; title: ReactNode; meta?: ReactNode; children: ReactNode; className?: string }) {
  const [open, setOpen] = usePersistent(`ui.acc.${id}.v1`, false);
  const bodyId = useId();
  return (
    <section className={`ui-acc ${open ? "is-open" : ""} ${className}`}>
      <button type="button" className="ui-acc-head" aria-expanded={open} aria-controls={bodyId} onClick={() => setOpen(!open)}>
        <span className="ui-acc-title">{title}</span>
        {meta && <span className="ui-acc-meta">{meta}</span>}
        <svg className="ui-acc-chevron" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M3.5 6l4.5 4.5L12.5 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div id={bodyId} className="ui-acc-body">
          {children}
        </div>
      )}
    </section>
  );
}
