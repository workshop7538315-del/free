import type { DeckStats } from "../lib/deck";
import { COLORS, COLOR_NAMES } from "../lib/mana";

/**
 * このゲームの肝:各色について「コストで要求される色マナ記号」と
 * 「マナゾーンに置けばその色を出せるカード」の量を並べる。
 */
export function ManaBalance({ stats }: { stats: DeckStats }) {
  const used = COLORS.filter((c) => stats.pips[c] > 0 || stats.sources[c] > 0);
  if (used.length === 0 && stats.colorlessSources === 0) return null;
  const max = Math.max(1, ...COLORS.map((c) => Math.max(stats.pips[c], stats.sources[c])), stats.colorlessSources);

  return (
    <section className="balance" aria-labelledby="balance-title">
      <h3 id="balance-title" className="panel-sub">
        色のバランス
      </h3>
      <p className="hint">上の棒がコストに出てくる色マナ記号の数、下の棒がマナにするとその色を出せるカードの枚数です。</p>
      <ul className="balance-rows">
        {used.map((c) => (
          <li key={c} className="balance-row">
            <span className={`pip pip-${c}`} aria-hidden="true" />
            <span className="balance-name">{COLOR_NAMES[c]}</span>
            <span className="balance-bars">
              <span className="bar bar-need" style={{ width: `${(stats.pips[c] / max) * 100}%`, background: `var(--mana-${c})` }} />
              <span className="bar bar-have" style={{ width: `${(stats.sources[c] / max) * 100}%`, background: `var(--mana-${c})` }} />
            </span>
            <span className="balance-nums">
              記号 {stats.pips[c]}
              <br />
              マナ源 {stats.sources[c]}
            </span>
          </li>
        ))}
        {stats.colorlessSources > 0 && (
          <li className="balance-row">
            <span className="pip pip-C" aria-hidden="true">
              ◇
            </span>
            <span className="balance-name">欠色</span>
            <span className="balance-bars">
              <span className="bar bar-have" style={{ width: `${(stats.colorlessSources / max) * 100}%`, background: "var(--mana-C)" }} />
            </span>
            <span className="balance-nums">マナ源 {stats.colorlessSources}</span>
          </li>
        )}
      </ul>
    </section>
  );
}

export function ManaCurve({ curve }: { curve: number[] }) {
  const max = Math.max(1, ...curve);
  return (
    <section aria-labelledby="curve-title">
      <h3 id="curve-title" className="panel-sub">
        マナカーブ
      </h3>
      <div className="curve" role="list">
        {curve.map((n, mv) => (
          <div key={mv} className="curve-col" role="listitem" aria-label={`マナ総量${mv}${mv === curve.length - 1 ? "以上" : ""}:${n}枚`}>
            <span className="curve-n">{n || ""}</span>
            <span className="curve-bar" style={{ height: `${(n / max) * 100}%` }} />
            <span className="curve-mv">
              {mv}
              {mv === curve.length - 1 ? "+" : ""}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
