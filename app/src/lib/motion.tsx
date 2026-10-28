import { createContext, useContext, useEffect, useState } from "react";

/** 演出の設定(画面右上の「演出」ボタン)。オフならアニメーションをすべて止める */
export const MotionContext = createContext(true);

/** 端末の「視差効果を減らす」設定 */
export const prefersReducedMotion = () =>
  typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** 演出を出してよいか(設定がオンで、端末の設定でも止められていない) */
export function useMotion(): boolean {
  const on = useContext(MotionContext);
  return on && !prefersReducedMotion();
}

/** メディアクエリが当てはまるか(画面幅の変化に追従する) */
export function useMediaQuery(query: string): boolean {
  const get = () => typeof window !== "undefined" && !!window.matchMedia?.(query).matches;
  const [match, setMatch] = useState(get);
  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return;
    const on = () => setMatch(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [query]);
  return match;
}

/** スマホの基準(幅 600px 以下) */
export const MOBILE_QUERY = "(max-width: 600px)";
export const useIsMobile = () => useMediaQuery(MOBILE_QUERY);

/** localStorage に残す state。読めない・書けない環境では普通の state として動く */
export function usePersistent<T>(key: string, initial: T): [T, (v: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) {
        const parsed = JSON.parse(raw) as T;
        // 設定のオブジェクトは、あとから増えた項目に初期値を入れる
        if (typeof initial === "object" && initial !== null && !Array.isArray(initial)) return { ...initial, ...parsed };
        if (typeof parsed === typeof initial) return parsed;
      }
    } catch {
      /* 読めなければ初期値 */
    }
    return initial;
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* 残せなくても動作に支障はない */
    }
  }, [key, value]);
  return [value, setValue];
}
