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
    // 名前がそのまま一致するもの(「加護《王の継承》」など)を先に
    BY_NAME.get(match) ??
    KEYWORDS.find((k) => match.startsWith(k.name)) ??
    // 名前で始まらないもの(《生成されるカード》など)は、パターン全体で照合する
    // 先読み((?=…))は一致した文字列の外を見るので、照合のときは外す
    KEYWORDS.find((k) => new RegExp(`^(?:${k.pattern.replace(/\(\?[=!][^)]*\)/g, "")})$`).test(match))
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

/**
 * キーワードの直後のかっこ書き(説明)を取り除く。キーワードの説明はツールチップで読める。
 * 生成するカードの中身(《X》({R} …))のように、キーワードでないものの後ろのかっこは残す。
 */
export function stripReminders(text: string): string {
  const segs = splitKeywords(text);
  let out = "";
  let skip = false;
  for (let i = 0; i < segs.length; i++) {
    let t = segs[i].text;
    if (skip && t.startsWith("(")) {
      // 対応する閉じかっこまで(入れ子にも対応)を飛ばす。かっこが次の部分にまたがるときは続けて飛ばす
      let depth = 0;
      let j = 0;
      let rest = t;
      let k = i;
      for (;;) {
        for (j = 0; j < rest.length; j++) {
          if (rest[j] === "(") depth++;
          else if (rest[j] === ")") {
            depth--;
            if (depth === 0) break;
          }
        }
        if (depth === 0 && j < rest.length) {
          t = rest.slice(j + 1);
          i = k;
          break;
        }
        if (k + 1 >= segs.length) {
          t = "";
          i = k;
          break;
        }
        k++;
        rest = segs[k].text;
      }
    }
    out += t;
    skip = !!segs[i].keyword;
  }
  return out;
}
