/**
 * カード効果のデータ形式。cards/cards.json の "abilities" はこの形で書く。
 * cards/build.mjs がここから日本語のカード文章を作り、ゲームエンジンが同じデータを実行する。
 */
import type { Color } from "../lib/mana";

/** 条件。burned=燃焼した / bloom=自分のマナゾーンが7枚以上 / fewerMana=自分のマナゾーンが相手より少ない */
export type Cond = "burned" | "bloom" | "fewerMana";

/** 数。"X"=唱えたときのX / mana=自分のマナゾーンの枚数 / creatures=自分のクリーチャーの数 */
export type Amount = number | "X" | { count: "mana" | "creatures" };

export type TargetSpec =
  | {
      t: "creature";
      who?: "you" | "opp";
      nonColor?: Color;
      tapped?: boolean;
      minPower?: number;
      maxPower?: number;
      flying?: boolean;
    }
  /** クリーチャーかプレイヤー */
  | { t: "any" }
  | { t: "spell"; noncreature?: boolean; maxMV?: number }
  | { t: "permanent"; types: string[] }
  /** 自分の墓地のカード */
  | { t: "graveyard"; cardType?: string };

type Common = {
  /** この条件のときだけ行う */
  if?: Cond;
  /** この条件のときは行わない */
  unless?: Cond;
  /** 「〜してもよい」 */
  may?: boolean;
};

/** tg は能力の targets の何番目の対象か */
export type Effect = Common &
  (
    | { do: "damage"; n: Amount; tg?: number; to?: "opp" }
    | { do: "damageAll"; n: Amount; players?: boolean }
    | { do: "destroy"; tg: number }
    | { do: "destroyAll"; maxPower?: number }
    | { do: "exile"; tg: number }
    | { do: "bounce"; tg: number }
    | { do: "bounceAll" }
    | { do: "tuck"; tg: number }
    | { do: "tap"; tg: number; freeze?: boolean }
    | { do: "tapAll"; who: "opp" }
    | { do: "pump"; tg?: number; self?: boolean; p: Amount; t: Amount; kw?: string[] }
    | { do: "pumpAll"; who: "you" | "all"; p: number; t: number; kw?: string[] }
    | { do: "buffSelf"; p: number; t: number; kw?: string[] }
    | { do: "counters"; tg?: number; self?: boolean; n: number }
    | { do: "countersAll"; n: number }
    | { do: "draw"; n: Amount }
    | { do: "discard"; n: number; who: "you" | "opp" }
    | { do: "gainLife"; n: Amount }
    | { do: "loseLife"; n: Amount; who: "you" | "opp" }
    | { do: "token"; n: number; p: Amount; t: Amount; color: Color | "C"; sub: string; kw?: string[] }
    | { do: "counter"; tg: number }
    | { do: "returnCard"; tg: number; to: "hand" | "battlefield" | "mana" }
    | { do: "rampTop"; n: number; tapped?: boolean }
    | { do: "extraCharge"; n: number }
    | { do: "reclaim"; then?: Effect[] }
    | { do: "erode"; n: number }
    | { do: "sacrifice" }
    | { do: "fight"; tg: [number, number] }
    | { do: "bite"; tg: [number, number] }
    | { do: "lookTop" }
    | { do: "addMana"; mana: string }
  );

export type TriggerEvent = "etb" | "dies" | "attacks" | "charge" | "upkeep" | "endStep" | "castSpell" | "allyDies";

export type StaticSpec =
  /** 自分の(他の)クリーチャー全体の強化 */
  | { s: "anthem"; p: number; t: number; kw?: string[]; others?: boolean }
  /** このパーマネント自身の強化(条件つきで使う) */
  | { s: "self"; p: number; t: number; kw?: string[] }
  /** 毎ターン追加でチャージできる */
  | { s: "extraCharge"; n: number }
  /** オーラ:エンチャントしているクリーチャーは攻撃もブロックもできない */
  | { s: "pacify" }
  /** オーラ:エンチャントしているクリーチャーの強化 */
  | { s: "auraBuff"; p: number; t: number; kw?: string[] };

export type Ability = { text?: string } & (
  | { a: "kw"; kw: string }
  | { a: "burn"; n: number }
  | { a: "release"; cost: string }
  | { a: "spell"; targets?: TargetSpec[]; effects: Effect[] }
  | { a: "trigger"; on: TriggerEvent; targets?: TargetSpec[]; effects: Effect[]; if?: Cond }
  | { a: "static"; st: StaticSpec; if?: Cond }
  | { a: "activated"; cost: { mana?: string; tap?: boolean }; targets?: TargetSpec[]; effects: Effect[] }
  /** {T}:マナを加える。produce は選べる候補("any"=好きな色1色) */
  | { a: "mana"; produce: string[] }
  /** オーラ:クリーチャーにつける */
  | { a: "enchant" }
);
