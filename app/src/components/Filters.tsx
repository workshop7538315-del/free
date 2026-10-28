import { PACKS, packById } from "../lib/packs";
import { COLORS, COLOR_NAMES, type Color } from "../lib/mana";
import { KEYWORDS } from "../lib/keywords";
import { activeRangeCount, emptyRange, filterSummary, initialFilters, isFiltering, type FilterState, type Range } from "../lib/filters";
import { Accordion } from "./Accordion";
import { packShort } from "../lib/packs";

const TYPE_FILTERS = ["クリーチャー", "インスタント", "ソーサリー", "エンチャント", "アーティファクト"];

type Props = {
  /** 選べるアーキタイプ(カードの多い順) */
  archetypes: { name: string; count: number }[];
  value: FilterState;
  onChange: (f: FilterState) => void;
  shown: number;
  total: number;
};

export function Filters({ archetypes, value: f, onChange, shown, total }: Props) {
  const set = (patch: Partial<FilterState>) => onChange({ ...f, ...patch });

  const toggleColor = (c: Color) =>
    set({ colors: f.colors.includes(c) ? f.colors.filter((x) => x !== c) : COLORS.filter((x) => x === c || f.colors.includes(x)) });

  const rangeCount = activeRangeCount(f);
  const summary = filterSummary(f, packShort);

  return (
    <Accordion
      id="filters"
      className="filters-acc"
      title={
        <>
          絞り込み{" "}
          {/* 条件が変わるたびに、文字が1つずつ現れる */}
          <span key={summary} className="ui-filter-summary" style={{ "--n": [...summary].length } as React.CSSProperties}>
            {summary}
          </span>
        </>
      }
      meta={`${shown} / ${total}種類`}
    >
    <div className="filters ui-acc-row" style={{ "--i": 0 } as React.CSSProperties}>
      <fieldset className="color-filter">
        <legend className="visually-hidden">色で絞り込む</legend>
        {COLORS.map((c) => (
          <button key={c} type="button" className="chip" aria-pressed={f.colors.includes(c)} onClick={() => toggleColor(c)}>
            <span className={`pip pip-${c}`} aria-hidden="true" />
            {COLOR_NAMES[c]}
          </button>
        ))}
        <button
          type="button"
          className="chip"
          aria-pressed={f.colorless}
          disabled={f.multi}
          onClick={() => set({ colorless: !f.colorless })}
        >
          <span className="pip pip-C" aria-hidden="true">
            ◇
          </span>
          欠色
        </button>
        <button
          type="button"
          className="chip chip-multi"
          aria-pressed={f.multi}
          onClick={() => set({ multi: !f.multi, colorless: false })}
        >
          <span className="pip pip-M" aria-hidden="true" />
          多色
        </button>
      </fieldset>

      {f.multi && (
        <div className="multi-mode">
          <div className="segmented" role="radiogroup" aria-label="多色の色の合わせ方">
            <button
              type="button"
              role="radio"
              aria-checked={f.multiMatch === "include"}
              onClick={() => set({ multiMatch: "include" })}
            >
              選んだ色を含む
            </button>
            <button type="button" role="radio" aria-checked={f.multiMatch === "exact"} onClick={() => set({ multiMatch: "exact" })}>
              ちょうど選んだ色
            </button>
          </div>
          <p className="hint">
            {f.colors.length === 0
              ? "多色カードだけを表示中です。色を選ぶと、その色の多色カードに絞り込みます。"
              : f.multiMatch === "include"
                ? `${f.colors.map((c) => COLOR_NAMES[c]).join("と")}を含む多色カード(3色以上も含む)`
                : `ちょうど${f.colors.map((c) => COLOR_NAMES[c]).join("")}の多色カード`}
          </p>
        </div>
      )}

      <fieldset className="type-filter">
        <legend className="visually-hidden">カードタイプで絞り込む(複数選べます)</legend>
        {TYPE_FILTERS.map((t) => (
          <label key={t} className="type-check">
            <input
              type="checkbox"
              checked={f.types.includes(t)}
              onChange={(e) => set({ types: e.target.checked ? TYPE_FILTERS.filter((x) => x === t || f.types.includes(x)) : f.types.filter((x) => x !== t) })}
            />
            {t}
          </label>
        ))}
      </fieldset>

      <div className="filter-row">
        <label>
          <span className="visually-hidden">キーワード</span>
          <select value={f.keyword} onChange={(e) => set({ keyword: e.target.value })}>
            <option value="">キーワード:すべて</option>
            <optgroup label="このゲーム独自">
              {KEYWORDS.filter((k) => k.kind === "独自").map((k) => (
                <option key={k.name} value={k.name}>
                  {k.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="基本キーワード">
              {KEYWORDS.filter((k) => k.kind === "基本").map((k) => (
                <option key={k.name} value={k.name}>
                  {k.name}
                </option>
              ))}
            </optgroup>
          </select>
        </label>
        <label>
          <span className="visually-hidden">アーキタイプ</span>
          <select value={f.archetype} onChange={(e) => set({ archetype: e.target.value })}>
            <option value="">アーキタイプ:すべて</option>
            {archetypes.map((a) => (
              <option key={a.name} value={a.name}>
                {a.name}({a.count})
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="visually-hidden">収録パック</span>
          <select value={f.pack} onChange={(e) => set({ pack: e.target.value })}>
            <option value="">パック:すべて</option>
            {PACKS.map((p) => (
              <option key={p.id} value={p.id}>
                第{p.number}弾「{p.name}」({p.total})
              </option>
            ))}
          </select>
        </label>
        <label className="search">
          <span className="visually-hidden">カード名・テキストで検索</span>
          <input type="search" placeholder="名前やテキストで検索" value={f.query} onChange={(e) => set({ query: e.target.value })} />
        </label>
      </div>

      <details className="ranges" open={rangeCount > 0 || undefined}>
        <summary>
          数値で絞り込む
          {rangeCount > 0 && <span className="ranges-count">{rangeCount}件指定中</span>}
        </summary>
        <div className="range-grid">
          <RangeInput label="コスト(マナ総量)" value={f.cost} onChange={(cost) => set({ cost })} />
          <RangeInput label="パワー" value={f.power} onChange={(power) => set({ power })} />
          <RangeInput label="タフネス" value={f.toughness} onChange={(toughness) => set({ toughness })} />
        </div>
        <p className="hint">パワーかタフネスを指定すると、クリーチャーだけが表示されます。</p>
      </details>

      {f.pack && packById(f.pack) && (() => {
        const p = packById(f.pack)!;
        return (
          <p className="pack-info">
            <strong>
              第{p.number}弾「{p.name}」
            </strong>
            ({p.kind}・{p.words.join("/")})新規{p.newCards}枚{p.reprints.length > 0 && `+再録${p.reprints.length}枚`}。{p.theme}
          </p>
        );
      })()}

      <div className="filter-foot">
        <label className="check">
          <input type="checkbox" checked={f.onlyInDeck} onChange={(e) => set({ onlyInDeck: e.target.checked })} />
          デッキに入っているカードだけ
        </label>
        {isFiltering(f) && (
          <button type="button" className="btn btn-quiet" onClick={() => onChange(initialFilters())}>
            条件をクリア
          </button>
        )}
      </div>
    </div>
    </Accordion>
  );
}

function RangeInput({ label, value, onChange }: { label: string; value: Range; onChange: (r: Range) => void }) {
  const parse = (s: string) => (s === "" ? null : Math.max(0, Math.floor(Number(s))));
  const invalid = value.min !== null && value.max !== null && value.min > value.max;
  return (
    <fieldset className={`range ${invalid ? "is-invalid" : ""}`}>
      <legend>{label}</legend>
      <label>
        <span className="visually-hidden">{label}の最小</span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          placeholder="最小"
          value={value.min ?? ""}
          onChange={(e) => onChange({ ...value, min: parse(e.target.value) })}
        />
      </label>
      <span aria-hidden="true">〜</span>
      <label>
        <span className="visually-hidden">{label}の最大</span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          placeholder="最大"
          value={value.max ?? ""}
          onChange={(e) => onChange({ ...value, max: parse(e.target.value) })}
        />
      </label>
      {(value.min !== null || value.max !== null) && (
        <button type="button" className="range-clear" aria-label={`${label}の指定を消す`} onClick={() => onChange(emptyRange())}>
          ×
        </button>
      )}
      {invalid && <span className="range-error">最小が最大より大きくなっています。</span>}
    </fieldset>
  );
}
