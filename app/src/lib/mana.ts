export type Color = "W" | "U" | "B" | "R" | "G";
export const COLORS: Color[] = ["W", "U", "B", "R", "G"];

/** カードの色区分。C = 欠色、M = 多色 */
export type ColorCategory = Color | "C" | "M";

export const COLOR_NAMES: Record<ColorCategory, string> = {
  W: "白",
  U: "青",
  B: "黒",
  R: "赤",
  G: "緑",
  C: "欠色",
  M: "多色",
};

export type ManaSymbol =
  | { kind: "generic"; n: number }
  | { kind: "color"; c: Color }
  | { kind: "colorless" }
  | { kind: "x" }
  | { kind: "hybrid"; a: Color; b: Color }
  | { kind: "twobrid"; c: Color };

const isColor = (s: string): s is Color => (COLORS as string[]).includes(s);

/** "{2}{R}{W/U}" のようなMTG表記のコストを記号の配列にする */
export function parseCost(cost: string): ManaSymbol[] {
  const out: ManaSymbol[] = [];
  const re = /\{([^}]+)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(cost))) {
    const t = m[1].toUpperCase();
    if (/^\d+$/.test(t)) out.push({ kind: "generic", n: Number(t) });
    else if (t === "X") out.push({ kind: "x" });
    else if (t === "C") out.push({ kind: "colorless" });
    else if (isColor(t)) out.push({ kind: "color", c: t });
    else {
      const [a, b] = t.split("/");
      if (a && b && isColor(a) && isColor(b)) out.push({ kind: "hybrid", a, b });
      else if (a === "2" && b && isColor(b)) out.push({ kind: "twobrid", c: b });
      else throw new Error(`不明なマナ記号です: {${t}}`);
    }
  }
  return out;
}

/** マナ総量。{X} は0、{2/W} は2 */
export function manaValue(cost: string): number {
  return parseCost(cost).reduce((sum, s) => {
    switch (s.kind) {
      case "generic":
        return sum + s.n;
      case "x":
        return sum;
      case "twobrid":
        return sum + 2;
      default:
        return sum + 1;
    }
  }, 0);
}

/** マナコストに含まれる色(WUBRG順) */
export function cardColors(cost: string): Color[] {
  const set = new Set<Color>();
  for (const s of parseCost(cost)) {
    if (s.kind === "color" || s.kind === "twobrid") set.add(s.c);
    if (s.kind === "hybrid") {
      set.add(s.a);
      set.add(s.b);
    }
  }
  return COLORS.filter((c) => set.has(c));
}

export function colorCategory(cost: string): ColorCategory {
  const colors = cardColors(cost);
  if (colors.length === 0) return "C";
  if (colors.length === 1) return colors[0];
  return "M";
}

/** コスト中の各色の色マナ記号の数。混成は両方の色に数える */
export function colorPips(cost: string): Record<Color, number> {
  const pips: Record<Color, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  for (const s of parseCost(cost)) {
    if (s.kind === "color" || s.kind === "twobrid") pips[s.c] += 1;
    if (s.kind === "hybrid") {
      pips[s.a] += 1;
      pips[s.b] += 1;
    }
  }
  return pips;
}
