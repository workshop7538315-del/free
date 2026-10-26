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
  minPower?: number;
  color?: Color;
};

/** 喝采のカテゴリー(第9.5弾) */
export type Applause = "狂気" | "悲劇" | "喜劇";

export type CondName =
  /** 燃焼した */
  | "burned"
  /** 追加払いを支払った */
  | "kicked"
  /** 開花:自分のマナゾーンが7枚以上 */
  | "bloom"
  /** 自分のマナゾーンが相手より少ない */
  | "fewerMana"
  /** 自分のマナゾーンが相手以下 */
  | "notMoreMana"
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
  | "oppTurn"
  /** 虚空:自分のマナゾーンのカードの半分以上が欠色(裏向きを含む) */
  | "void"
  /** 真空:自分のマナゾーンのカードがすべて欠色(1枚以上) */
  | "vacuum"
  /** 陰謀:このターン、対戦相手がカードを捨てたか、対戦相手のクリーチャーが戦場を離れた */
  | "intrigue"
  /** 強襲:このターン、自分がクリーチャー2体以上で攻撃した */
  | "raid"
  /** 連唱:このターン、自分がインスタントかソーサリーを2つ以上唱えた */
  | "chain";

export type Cond =
  | CondName
  /** マナ武装 N:自分のマナゾーンにその色のカードがN枚以上 */
  | { armed: Color; n: number }
  /** 指定したパーマネントをN個以上コントロールしている */
  | { control: Filter; n: number }
  /** 喝采【cat】が N 以上 */
  | { applause: Applause; n: number };

export type CountKind = "mana" | "creatures" | "graveyard" | "colorsInMana" | "hand" | "oppCreatures" | "burned" | "crests" | "colorlessMana";

/** 数。"X"=唱えたときのX、count=数を数える、perm=条件に合う自分のパーマネントの数 */
export type Amount = number | "X" | { count: CountKind } | { count: "perm"; filter: Filter } | { count: "applause"; cat: Applause };

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
    /** spawn:落とし子(「このクリーチャーを生け贄に捧げる:{C}を加える」を持つ) */
    | { do: "token"; n: Amount; p: Amount; t: Amount; color: Color | "C"; sub: string; kw?: string[]; artifact?: boolean; spawn?: boolean }
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
    /** 略奪:対戦相手のマナゾーンのカードをN枚、裏向き(欠色)にしてタップ状態で自分のマナゾーンに移す */
    | { do: "plunder"; n: number }
    /** 嚥下 N:対戦相手のライブラリーの一番上からN枚を、裏向き(欠色)でタップ状態のまま自分のマナゾーンに置く */
    | { do: "ingest"; n: number }
    /** 対戦相手のマナゾーンの表向きのカードを裏向きにする。all ならすべて、crest なら紋章を持つものだけ */
    | { do: "veilOpp"; n: number; all?: boolean; crest?: boolean }
    /** 自分の墓地のカードをすべてライブラリーに加えて切り直す */
    | { do: "shuffleGraveyard" }
    /** 生成:このカードをN枚、手札に加える(チャージできず、手札・スタック・戦場以外に移ると消える) */
    | { do: "create"; card: GeneratedCard; n: number }
    /** 喝采【cat】を N 増やす */
    | { do: "applause"; cat: Applause; n: number }
    /** 加護を得る(加護の枠を使う。すでに持っていれば何もしない) */
    | { do: "blessing"; id: string }
    /** 虚化:自分と対戦相手のマナゾーンの表向きのカードをそれぞれN枚、裏向き(欠色)にする(相手の分も自分が選ぶ) */
    | { do: "veil"; n: number }
    /** 顕現 N:自分のマナゾーンからマナ総量N以下のクリーチャー・カードを1枚戦場に出す */
    | { do: "manifest"; maxMV: number; haste?: boolean }
    /**
     * 決闘:自分のクリーチャーと相手のクリーチャーが互いにパワー分のダメージを与え合う。
     * self なら自分のクリーチャーはこのパーマネント(tg[0] が相手)、そうでなければ tg[0] が自分・tg[1] が相手。
     * 相手のクリーチャーだけが致死ダメージを負ったら「勝った」とし、win を行う
     */
    | { do: "duel"; tg: number[]; self?: boolean; win?: Effect[] }
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
  | "lifeGain"
  /** あなたが決闘に勝つたび */
  | "duelWin"
  /** この呪文を唱えたとき(打ち消されても誘発する) */
  | "castSelf"
  /** このカードがどこからでも墓地に置かれたとき */
  | "toGraveyard"
  /** あなたが(filter に合う)パーマネントを生け贄に捧げるたび */
  | "sacrifice"
  /** ウシータ:この秘蔵庫のカードが戦場を離れて秘蔵庫に戻るとき */
  | "uscita";

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
  /** 喝采を消費する */
  applause?: { cat: Applause; n: number };
};

export type Ability = { text?: string } & (
  | { a: "kw"; kw: string }
  /** 燃焼 N。upTo なら烈燃 N(0〜N枚の好きな枚数を燃焼できる) */
  | { a: "burn"; n: number; upTo?: boolean }
  /** 疾駆:このコストで唱えると速攻を得て、終了ステップに手札に戻る */
  | { a: "dash"; cost: string }
  | { a: "release"; cost: string }
  /** modes があればモード呪文(唱えるときに1つ選ぶ) */
  | { a: "spell"; targets?: TargetSpec[]; effects: Effect[]; modes?: SpellMode[] }
  /** リリース召喚 N:秘蔵庫のクリーチャー。エンチャントと奉納を持つクリーチャーをマナ総量の合計がN以上になるようにリリースし、マナを払わずに出す */
  | { a: "releaseSummon"; n: number; from?: Filter[] }
  /** エントラータ N【cat】:喝采【cat】をN消費して、秘蔵庫からこのクリーチャーを戦場に出す(同じカードは1ターンに1回) */
  | { a: "entrata"; n: number; cat: Applause }
  /** 奉納 N(sub):リリース召喚に使うとき、マナ総量を+Nとして数える(sub があれば、その種族のリリース召喚のときだけ) */
  | { a: "offering"; n: number; sub?: string }
  /** from: "mana" は紋章(このカードがマナゾーンにあるあいだだけ働く) */
  | { a: "trigger"; on: TriggerEvent; targets?: TargetSpec[]; effects: Effect[]; if?: Cond; filter?: Filter; from?: "mana"; oncePerTurn?: boolean }
  | { a: "static"; st: StaticSpec; if?: Cond; from?: "mana" }
  | { a: "activated"; cost: ActivatedCost; targets?: TargetSpec[]; effects: Effect[] }
  /** {T}:マナを加える。produce は選べる候補("any"=好きな色1色) */
  /** sacSelf:このパーマネントを生け贄に捧げてマナを出す(《黄金》) */
  | { a: "mana"; produce: string[]; sacSelf?: boolean }
  /** 開拓進化【color】N:color のクリーチャー1体と、戦場かマナゾーンのカード(マナ総量の合計N以上)を墓地に置いて出す。grand は大開拓進化(開拓者の上に重ね、最低3枚) */
  | { a: "pioneer"; n: number; color: Color; grand?: boolean }
  /** 組み立て【color】:秘蔵庫の発明品(装備品)。マナコストを払い、color のクリーチャーをタップして、そのクリーチャーにつけて出す。partner と cond が武装進化 */
  | { a: "assemble"; color: Color; partner: string; partnerName?: string; cond: "attacked" | "twoEquip" }
  /** 武装進化でのみ戦場に出る(秘蔵庫の合体先) */
  | { a: "evolveOnly" }
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
  /** 虚食:自分のマナゾーンの裏向きのカード1枚につき、唱えるコストが{1}少なくなる */
  | { a: "voidAffinity" }
  /** 共鳴:filter に合う自分のパーマネント1つにつき、唱えるコストが{1}少なくなる */
  | { a: "affinity"; filter: Filter }
  /** 零式:条件を満たしていれば、マナを払わずに唱えてもよい */
  | { a: "free"; if: Cond }
);

/** モード呪文の選択肢 */
export type SpellMode = { label: string; targets?: TargetSpec[]; effects: Effect[] };

/** 生成されるカード(カードリストには入らない) */
export type GeneratedCard = {
  id: string;
  name: string;
  cost: string;
  type: string;
  subtype?: string;
  power?: number;
  toughness?: number;
  rarity: string;
  text: string[];
  abilities: Ability[];
};
