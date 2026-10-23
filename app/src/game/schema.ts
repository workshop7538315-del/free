/**
 * カード効果のデータ形式。cards/cards.json の "abilities" はこの形で書く。
 * cards/lib.mjs がここから日本語のカード文章を作り、ゲームエンジンが同じデータを実行する。
 */
import type { Color } from "../lib/mana";

/** カードの絞り込み。すべての項目を満たすものが当てはまる */
export type Filter = {
  /** カードタイプに含む(クリーチャー / エンチャント / アーティファクト / インスタント / ソーサリー) */
  type?: string;
  /** インスタントかソーサリー */
  spell?: boolean;
  /** 種族に含む(人間、ゴブリンなど) */
  sub?: string;
  /** 名前に含む(「星詠み」など) */
  name?: string;
  /** マナ総量がちょうどこの値 */
  mv?: number;
  minMV?: number;
  maxMV?: number;
  maxPower?: number;
  color?: Color;
};

export type CondName =
  /** 燃焼した */
  | "burned"
  /** 追加払いを支払った */
  | "kicked"
  /** 開花:自分のマナゾーンが7枚以上 */
  | "bloom"
  /** 自分のマナゾーンが相手より少ない */
  | "fewerMana"
  /** 深淵:自分の墓地が7枚以上 */
  | "threshold"
  /** 背水:自分の手札が0枚 */
  | "hellbent"
  /** 孤高:自分のデッキに同名カードが2枚以上入っていない */
  | "highlander"
  /** 機巧:自分のアーティファクトが3つ以上 */
  | "metalcraft"
  /** 獰猛:パワー4以上のクリーチャーをコントロールしている */
  | "ferocious"
  /** 満開(開花の強化):自分のマナゾーンが10枚以上 */
  | "fullBloom"
  /** 奈落(深淵の強化):自分の墓地が12枚以上 */
  | "abyss"
  /** 伏兵:対戦相手のターンである */
  | "oppTurn";

export type Cond =
  | CondName
  /** マナ武装 N:自分のマナゾーンにその色のカードがN枚以上 */
  | { armed: Color; n: number }
  /** 指定したパーマネントをN個以上コントロールしている */
  | { control: Filter; n: number };

export type CountKind = "mana" | "creatures" | "graveyard" | "colorsInMana" | "hand" | "oppCreatures" | "burned" | "crests";

/** 数。"X"=唱えたときのX、count=数を数える、perm=条件に合う自分のパーマネントの数 */
export type Amount = number | "X" | { count: CountKind } | { count: "perm"; filter: Filter };

export type TargetSpec =
  | {
      t: "creature";
      who?: "you" | "opp";
      nonColor?: Color;
      tapped?: boolean;
      minPower?: number;
      maxPower?: number;
      flying?: boolean;
      filter?: Filter;
    }
  /** クリーチャーかプレイヤー */
  | { t: "any" }
  /** 対戦相手 */
  | { t: "player" }
  | { t: "spell"; noncreature?: boolean; maxMV?: number }
  | { t: "permanent"; types: string[]; who?: "you" | "opp" }
  /** 自分の墓地のカード */
  | { t: "graveyard"; cardType?: string; filter?: Filter };

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
    | { do: "damageAll"; n: Amount; players?: boolean; who?: "opp" }
    | { do: "destroy"; tg: number }
    | { do: "destroyAll"; maxPower?: number; filter?: Filter }
    | { do: "exile"; tg: number }
    | { do: "bounce"; tg: number }
    | { do: "bounceAll" }
    | { do: "tuck"; tg: number }
    | { do: "tap"; tg: number; freeze?: boolean }
    | { do: "untap"; tg?: number; all?: boolean }
    | { do: "tapAll"; who: "opp" }
    | { do: "pump"; tg?: number; self?: boolean; p: Amount; t: Amount; kw?: string[] }
    | { do: "pumpAll"; who: "you" | "all"; p: number; t: number; kw?: string[]; filter?: Filter }
    | { do: "buffSelf"; p: number; t: number; kw?: string[] }
    | { do: "counters"; tg?: number; self?: boolean; n: Amount }
    | { do: "countersAll"; n: number; filter?: Filter }
    | { do: "draw"; n: Amount }
    | { do: "discard"; n: number; who: "you" | "opp" }
    | { do: "gainLife"; n: Amount }
    | { do: "loseLife"; n: Amount; who: "you" | "opp" }
    | { do: "token"; n: Amount; p: Amount; t: Amount; color: Color | "C"; sub: string; kw?: string[]; artifact?: boolean }
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
    /** ライブラリーから条件に合うカードを探す */
    | { do: "tutor"; filter: Filter; to: "hand" | "battlefield" | "mana" }
    /** ライブラリーの上からN枚を墓地に置く */
    | { do: "mill"; n: Amount; who: "you" | "opp" }
    /** 略奪:対戦相手のマナゾーンのカードをN枚、自分のマナゾーンに移す */
    | { do: "plunder"; n: number }
    /** 顕現 N:自分のマナゾーンからマナ総量N以下のクリーチャー・カードを1枚戦場に出す */
    | { do: "manifest"; maxMV: number; haste?: boolean }
  );

export type TriggerEvent =
  | "etb"
  | "dies"
  | "attacks"
  | "charge"
  | "upkeep"
  | "endStep"
  /** あなたがインスタントかソーサリーを唱えるたび */
  | "castSpell"
  /** あなたが filter に合う呪文を唱えるたび */
  | "cast"
  | "allyDies"
  /** filter に合う他のパーマネントがあなたのコントロールで戦場に出るたび */
  | "allyEnter"
  /** あなたのマナゾーンにカードが置かれるたび(鼓動) */
  | "manaEnter"
  /** あなたがライフを得るたび */
  | "lifeGain";

export type StaticSpec =
  /** 自分の(他の)クリーチャー全体の強化。filter で種族などを絞れる */
  | { s: "anthem"; p: number; t: number; kw?: string[]; others?: boolean; filter?: Filter }
  /** このパーマネント自身の強化(条件つきで使う) */
  | { s: "self"; p: number; t: number; kw?: string[] }
  /** 数えたものの数だけ自身を強化する */
  | { s: "scale"; per: Amount; p: number; t: number }
  /** 毎ターン追加でチャージできる */
  | { s: "extraCharge"; n: number }
  /** オーラ:エンチャントしているクリーチャーは攻撃もブロックもできない */
  | { s: "pacify" }
  /** オーラ・装備品:つけているクリーチャーの強化 */
  | { s: "auraBuff"; p: number; t: number; kw?: string[] }
  /** filter に合うあなたの呪文のコストが{n}少なくなる */
  | { s: "discount"; filter: Filter; n: number };

export type ActivatedCost = {
  mana?: string;
  tap?: boolean;
  /** 自分のクリーチャー1体を生け贄に捧げる(filter で絞れる) */
  sac?: Filter;
  /** このパーマネント自身を生け贄に捧げる */
  sacSelf?: boolean;
  /** ライフを支払う */
  life?: number;
};

export type Ability = { text?: string } & (
  | { a: "kw"; kw: string }
  /** 燃焼 N。upTo なら烈燃 N(0〜N枚の好きな枚数を燃焼できる) */
  | { a: "burn"; n: number; upTo?: boolean }
  /** 疾駆:このコストで唱えると速攻を得て、終了ステップに手札に戻る */
  | { a: "dash"; cost: string }
  | { a: "release"; cost: string }
  | { a: "spell"; targets?: TargetSpec[]; effects: Effect[] }
  /** from: "mana" は紋章(このカードがマナゾーンにあるあいだだけ働く) */
  | { a: "trigger"; on: TriggerEvent; targets?: TargetSpec[]; effects: Effect[]; if?: Cond; filter?: Filter; from?: "mana" }
  | { a: "static"; st: StaticSpec; if?: Cond; from?: "mana" }
  | { a: "activated"; cost: ActivatedCost; targets?: TargetSpec[]; effects: Effect[] }
  /** {T}:マナを加える。produce は選べる候補("any"=好きな色1色) */
  | { a: "mana"; produce: string[] }
  /** オーラ:クリーチャーにつける */
  | { a: "enchant" }
  /** 追加払い:唱えるときに追加でこのコストを払ってもよい(払ったら条件 kicked) */
  | { a: "kicker"; cost: string }
  /** 再演:墓地からこのコストで唱えてもよい。その後追放される */
  | { a: "flashback"; cost: string }
  /** 循環:このコストを払い、手札から捨てる:カードを1枚引く */
  | { a: "cycling"; cost: string }
  /** 装備:このコストを払って自分のクリーチャーにつける(ソーサリーのタイミング) */
  | { a: "equip"; cost: string }
  /** 共鳴:filter に合う自分のパーマネント1つにつき、唱えるコストが{1}少なくなる */
  | { a: "affinity"; filter: Filter }
  /** 零式:条件を満たしていれば、マナを払わずに唱えてもよい */
  | { a: "free"; if: Cond }
);
