import { parseCost, type ManaSymbol } from "../lib/mana";

function Pip({ s }: { s: ManaSymbol }) {
  switch (s.kind) {
    case "generic":
      return <span className="pip pip-generic">{s.n}</span>;
    case "x":
      return <span className="pip pip-generic">X</span>;
    case "colorless":
      return <span className="pip pip-C">◇</span>;
    case "color":
      return <span className={`pip pip-${s.c}`} />;
    case "hybrid":
      return <span className="pip pip-hybrid" style={{ "--a": `var(--mana-${s.a})`, "--b": `var(--mana-${s.b})` } as React.CSSProperties} />;
    case "twobrid":
      return (
        <span className="pip pip-hybrid pip-twobrid" style={{ "--a": "var(--mana-generic)", "--b": `var(--mana-${s.c})` } as React.CSSProperties}>
          2
        </span>
      );
  }
}

const SPOKEN: Record<string, string> = { W: "白", U: "青", B: "黒", R: "赤", G: "緑" };

/** 読み上げ用:{2}{R}{R} → 「2 赤 赤」 */
function spoken(cost: string): string {
  return parseCost(cost)
    .map((s) => {
      switch (s.kind) {
        case "generic":
          return String(s.n);
        case "x":
          return "X";
        case "colorless":
          return "無色";
        case "color":
          return SPOKEN[s.c];
        case "hybrid":
          return `${SPOKEN[s.a]}か${SPOKEN[s.b]}`;
        case "twobrid":
          return `2か${SPOKEN[s.c]}`;
      }
    })
    .join(" ");
}

export function ManaCost({ cost, size = "md" }: { cost: string; size?: "sm" | "md" }) {
  if (!cost) return null;
  return (
    <span className={`mana-cost mana-cost-${size}`} role="img" aria-label={`コスト ${spoken(cost)}`}>
      {parseCost(cost).map((s, i) => (
        <Pip key={i} s={s} />
      ))}
    </span>
  );
}
