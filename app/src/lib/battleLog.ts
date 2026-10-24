import type { Game, LogEntry } from "../game/engine";
import type { DeckCards } from "../types";
import { cardName } from "./packs";
import rawCards from "../../../cards/cards.json";
import type { Card } from "../types";
import { manaValue } from "./mana";

const BY_ID = new Map((rawCards as Card[]).map((c) => [c.id, c]));

export type DeckInfo = { name: string; cards: DeckCards };

/** ログを番号つきの文章にする */
export function logText(log: LogEntry[]): string {
  return log.map((l, i) => `${i + 1}. ${l.text}`).join("\n");
}

/** デッキを「枚数 カード名」の一覧にする(マナ総量の順) */
export function deckText(title: string, deck: DeckInfo): string {
  const rows = Object.entries(deck.cards)
    .filter(([, n]) => n > 0)
    .sort(([a], [b]) => manaValue(BY_ID.get(a)?.cost ?? "") - manaValue(BY_ID.get(b)?.cost ?? "") || a.localeCompare(b))
    .map(([id, n]) => `${n} ${cardName(id)}`);
  const total = Object.values(deck.cards).reduce((s, n) => s + n, 0);
  return `# ${title}:${deck.name}(${total}枚)\n${rows.join("\n")}`;
}

/** 結果の見出し */
export function resultLine(g: Game, me: 0 | 1): string {
  if (g.winner === undefined) return `対戦中(ターン${Math.ceil(g.turn / 2)})`;
  const r = g.winner === me ? "勝利" : g.winner === null ? "引き分け" : "敗北";
  return `結果:${r}(${Math.ceil(g.turn / 2)}ターン目、あなたのライフ ${g.players[me].life}、相手のライフ ${g.players[1 - me].life})`;
}

/** クリップボードにコピーする(使えない環境では選択してコピーする方法に切り替える) */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* 下の方法を試す */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
