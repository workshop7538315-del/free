import rawKeywords from "../../../cards/keywords.json";
import type { Card } from "../types";

export type Keyword = {
  name: string;
  kind: "独自" | "基本";
  /** カード文中で見つけるための正規表現(燃焼 2 のような数字つきも含む) */
  pattern: string;
  /** ツールチップに出す説明 */
  reminder: string;
};

export const KEYWORDS = rawKeywords as Keyword[];

const BY_NAME = new Map(KEYWORDS.map((k) => [k.name, k]));

// 長い名前を先に試す(「先制攻撃」などが部分一致で欠けないように)
const ALL = new RegExp(
  `(${[...KEYWORDS].sort((a, b) => b.name.length - a.name.length).map((k) => k.pattern).join("|")})`,
  "g",
);

/** 文中の一致からキーワード定義を引く(「燃焼 2」→ 燃焼) */
export function keywordFor(match: string): Keyword | undefined {
  return (
    KEYWORDS.find((k) => match === k.name || match.startsWith(k.name)) ??
    BY_NAME.get(match) ??
    // 名前で始まらないもの(《生成されるカード》など)は、パターン全体で照合する
    KEYWORDS.find((k) => new RegExp(`^(?:${k.pattern})$`).test(match))
  );
}

/** 文章をキーワードとそれ以外に分ける */
export function splitKeywords(text: string): { text: string; keyword?: Keyword }[] {
  const out: { text: string; keyword?: Keyword }[] = [];
  let last = 0;
  for (const m of text.matchAll(ALL)) {
    const i = m.index ?? 0;
    if (i > last) out.push({ text: text.slice(last, i) });
    out.push({ text: m[0], keyword: keywordFor(m[0]) });
    last = i + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}

/** カードが持つ(文中に出てくる)キーワード名 */
export function cardKeywords(card: Card): Set<string> {
  const found = new Set<string>();
  for (const t of card.text) {
    for (const m of t.matchAll(ALL)) {
      const k = keywordFor(m[0]);
      if (k) found.add(k.name);
    }
  }
  return found;
}
