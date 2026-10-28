import { useEffect, useId, useRef, useState } from "react";
import type { SortKey } from "../lib/filters";

export type ListPrefs = {
  /** 列数。"auto" は画面幅に合わせる */
  cols: "auto" | 1 | 2 | 3 | 4 | 6;
  perPage: 12 | 24 | 48 | 96;
  view: "text" | "name";
  sort: SortKey;
};
export const DEFAULT_PREFS: ListPrefs = { cols: "auto", perPage: 24, view: "text", sort: "cost" };

const COLS: ListPrefs["cols"][] = ["auto", 1, 2, 3, 4, 6];
const PER_PAGE: ListPrefs["perPage"][] = [12, 24, 48, 96];
const SORTS: { key: SortKey; label: string }[] = [
  { key: "cost", label: "コスト" },
  { key: "name", label: "名前" },
  { key: "color", label: "色" },
  { key: "pack", label: "収録パック" },
];

/** 一覧の右上の設定ボタンと、押すと手前に倒れて開く設定パネル */
export function ListSettings({ prefs, onChange, mobile }: { prefs: ListPrefs; onChange: (p: ListPrefs) => void; mobile: boolean }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const wrap = useRef<HTMLDivElement>(null);
  const set = (patch: Partial<ListPrefs>) => onChange({ ...prefs, ...patch });

  // パネルの外を押すか Esc で閉じる
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !wrap.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const cols = mobile ? COLS.filter((c) => c === "auto" || c <= 3) : COLS;
  return (
    <div className="ui-settings" ref={wrap}>
      <button type="button" className="ui-settings-btn" aria-expanded={open} aria-controls={panelId} aria-label="表示の設定" onClick={() => setOpen(!open)}>
        <svg className="ui-settings-icon" width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
          <g fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
            <path d="M3 5h14M3 10h14M3 15h14" />
          </g>
          <g fill="var(--surface-2)" stroke="currentColor" strokeWidth="1.7">
            <circle cx="7" cy="5" r="2" />
            <circle cx="13" cy="10" r="2" />
            <circle cx="8" cy="15" r="2" />
          </g>
        </svg>
        <span className="ui-settings-label">表示</span>
      </button>
      {open && (
        <div id={panelId} className="ui-settings-panel" role="group" aria-label="表示の設定">
          <Seg label="列数" value={mobile && typeof prefs.cols === "number" && prefs.cols > 3 ? "auto" : prefs.cols} options={cols.map((c) => ({ v: c, label: c === "auto" ? "自動" : String(c) }))} onPick={(cols) => set({ cols })} />
          <Seg label="1ページの枚数" value={prefs.perPage} options={PER_PAGE.map((n) => ({ v: n, label: String(n) }))} onPick={(perPage) => set({ perPage })} />
          <Seg
            label="表示"
            value={prefs.view}
            options={[
              { v: "text" as const, label: "テキストあり" },
              { v: "name" as const, label: "名前だけ" },
            ]}
            onPick={(view) => set({ view })}
          />
          <Seg label="並び順" value={prefs.sort} options={SORTS.map((s) => ({ v: s.key, label: s.label }))} onPick={(sort) => set({ sort })} />
        </div>
      )}
    </div>
  );
}

function Seg<T extends string | number>({ label, value, options, onPick }: { label: string; value: T; options: { v: T; label: string }[]; onPick: (v: T) => void }) {
  return (
    <div className="ui-settings-row">
      <span className="ui-settings-name">{label}</span>
      <div className="segmented" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button key={String(o.v)} type="button" role="radio" aria-checked={value === o.v} onClick={() => onPick(o.v)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
