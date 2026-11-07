/**
 * 対戦の操作設定(画面上部のバナーで切り替える)。この端末だけの設定で、オンライン対戦の相手には関係しない。
 * - payMode:マナの支払い。auto=完全オート、ask=毎回おまかせかを選べる(おまかせの払い方を選んだ状態で出す)、self=完全セルフ(毎回自分で選ぶ)
 * - oppInstants:相手のターンにインスタントを使うか確認する(オフなら相手のターンは止まらずにパスする)
 */
export type PayMode = "auto" | "ask" | "self";
export type BattleSettings = { payMode: PayMode; oppInstants: boolean };

const KEY = "battle.settings.v1";
const DEFAULT: BattleSettings = { payMode: "auto", oppInstants: true };

function load(): BattleSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULT, ...(JSON.parse(raw) as Partial<BattleSettings>) };
  } catch {
    /* 読めなければ初期値 */
  }
  return DEFAULT;
}

let current = load();
const listeners = new Set<() => void>();

export const getBattleSettings = () => current;

export function setBattleSettings(next: Partial<BattleSettings>) {
  current = { ...current, ...next };
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    /* 保存できなくても、このページの間は使える */
  }
  for (const fn of listeners) fn();
}

export function subscribeBattleSettings(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

// ---------------------------------------------------------------- 対戦中かどうか(画面の切り替えの確認に使う)
let playing = false;
export const isBattlePlaying = () => playing;
export const setBattlePlaying = (v: boolean) => {
  playing = v;
};
