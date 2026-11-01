/**
 * デッキの外から出てくるカードの一覧(第12弾の招集)。
 * 108人の好漢すべて(デッキに入るものと、招集でだけ出る「生成」のもの)。両方の端末で同じ内容になる。
 */
import summonsJson from "../../../cards/summons.json";
import type { Card } from "../types";

export const SUMMON_POOL = summonsJson as unknown as Card[];
