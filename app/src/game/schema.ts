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
  /** 元々のタフネスがこの値以上 */
  minToughness?: number;
  color?: Color;
  /** 名前がこれらのどれかに当たる */
  names?: string[];
};

/** 喝采のカテゴリー(第9.5弾) */
/** 「呪い」はファラオの呪い(第13弾。罠を発動するたびに溜まる) */
export type Applause = "狂気" | "悲劇" | "喜劇" | "呪い";

export type CondName =
  /** 替天行道:対戦相手のライフかクリーチャーの数があなたより多い(第12弾) */
  | "underdog"
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
  | "chain"
  /** 金庫破り:自分の秘蔵庫にカードがない(第10弾) */
  | "vaultEmpty"
  /** 純色:自分のマナゾーンのカードがすべて同じ1色(1枚以上。第11弾) */
  | "pureColor"
  /** このゲームで、自分が開拓進化をした */
  | "pioneeredGame"
  /** 自分のマナゾーンに埋蔵を持つカードがある */
  | "buriedInMana"
  /** 覇業【魏】:自分の手札が対戦相手より多い */
  | "hegemonyWei"
  /** 覇業【呉】:自分のマナゾーンのカードが対戦相手より多い */
  | "hegemonyWu"
  /** 覇業【蜀】:戦場でパワーが最も高いクリーチャーをコントロールしている(同じなら満たす) */
  | "hegemonyShu"
  /** このゲームで、自分が任務を達成した(第13弾) */
  | "questDone";

export type Cond =
  | CondName
  /** マナ武装 N:自分のマナゾーンにその色のカードがN枚以上 */
  | { armed: Color; n: number }
  /** 指定したパーマネントをN個以上コントロールしている */
  | { control: Filter; n: number }
  /** 喝采【cat】が N 以上 */
  | { applause: Applause; n: number }
  /** 原色 N:自分のマナゾーンにその色の単色カードがN枚以上(多色・欠色・裏向きは数えない。第11.5弾) */
  | { primary: Color; n: number }
  /** 自分のマナゾーンのカードのマナ総量の合計が N 以上 */
  | { manaMV: number }
  /** 水軍 N:自分のマナゾーンに青のカード(多色も数える)が N 枚以上(三国志スターター) */
  | { navy: number }
  /** 縁:名前にこれらのどれかを含むクリーチャーをコントロールしている */
  | { anyName: string[] }
  /** 集結 N:このゲームで自分の戦場に出た、名前の違う好漢の数がN以上(第12弾) */
  | { gather: number }
  /** 重なり N:このカードの下に重なっている枚数がN以上(below があればそれ未満)(第12弾) */
  | { under: number; below?: number }
  /** このカードの残量(水量)がN以上 */
  | { charges: number }
  /** 対戦相手の手札がn枚以上 */
  | { oppHand: number }
  /** 系譜:これらの名前の神が、自分の戦場か墓地にある(第13弾) */
  | { lineage: string[] };

export type CountKind = "mana" | "creatures" | "graveyard" | "graveyardCreatures" | "colorsInMana" | "hand" | "oppCreatures" | "burned" | "crests" | "colorlessMana";

/** 数。"X"=唱えたときのX、count=数を数える、perm=条件に合う自分のパーマネントの数 */
export type Amount = number | "X" | { count: CountKind } | { count: "under" } | { count: "perm"; filter: Filter } | { count: "applause"; cat: Applause } | { count: "primary"; color: Color };

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
      /** 攻撃しているクリーチャー */
      attacking?: boolean;
      /** 攻撃かブロックしているクリーチャー */
      inCombat?: boolean;
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
    | { do: "destroyAll"; maxPower?: number; filter?: Filter; who?: "opp"; untapped?: boolean }
    | { do: "exile"; tg: number }
    | { do: "bounce"; tg: number }
    | { do: "bounceAll"; who?: "opp" }
    | { do: "tuck"; tg: number }
    | { do: "tap"; tg: number; freeze?: boolean }
    | { do: "untap"; tg?: number; all?: boolean }
    | { do: "tapAll"; who: "opp" }
    | { do: "pump"; tg?: number; self?: boolean; p: Amount; t: Amount; kw?: string[] }
    | { do: "pumpAll"; who: "you" | "all" | "opp"; p: number; t: number; kw?: string[]; filter?: Filter }
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
    | { do: "sacrifice"; n?: number }
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
    /** 純色払いで支払った色に応じたキーワードを、このパーマネントが得る */
    | { do: "paidColorKw" }
    /** 強盗 N:自分の秘蔵庫からN枚をタップ状態でマナゾーンに置く(空なら《札束》を生成) */
    | { do: "heist"; n: number; fallback?: GeneratedCard }
    | { do: "handBlast"; per?: { cat: Applause; div: number } }
    /** ライブラリーの上から n 枚をマナゾーンに置き、その中のマナ総量 minMV 以上のクリーチャー1枚を戦場に出してよい */
    | { do: "callForest"; n: number; minMV: number }
    /** あなたのパワー最大のクリーチャーが、対戦相手のクリーチャーそれぞれにそのパワーに等しいダメージを与える */
    | { do: "stomp" }
    /** 献策:秘蔵庫の計略1枚を手札に加えるか、手札を1枚捨てて1枚引く */
    | { do: "learn" }
    | { do: "perApplause"; cat: Applause; div: number; effects: Effect[] }
    /** このカード(効果の発生源)をマナゾーンに置く(陶酔で、捨てられた墓地から) */
    | { do: "selfToMana" }
    /** 依存:手札を1枚捨てる。捨てられないなら N 点のライフを失う */
    | { do: "addiction"; n: number }
    /** card を N 枚生成してマナゾーンに置く(ターン終了時に墓地に置かれる=消える) */
    | { do: "createMana"; card: GeneratedCard; n: Amount; tapped?: boolean; stay?: boolean; max?: number; charges?: Amount }
    /** 残量(水量)を1減らし、0になったらこのカードを墓地に置く(《流れる水》) */
    | { do: "deplete" }
    /** このカードを生け贄に捧げる(マナゾーンにあるものも) */
    | { do: "sacrificeThis" }
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
    /** 天罡招集・地煞招集:まだ自分の戦場に出ていないその宿星の好漢をランダムに3枚見せ、1枚を選んでデッキの外から戦場に出す(第12弾) */
    | { do: "muster"; star: "天罡星" | "地煞星" }
    /** ライブラリーの上から n+plus 枚を見て、min(n, max) 枚を手札に加え、残りを一番下に置く(螭吻) */
    | { do: "dig"; n: Amount; plus: number; max: number }
    /** 「ランダムな相手のクリーチャーに dmg 点、いなければ相手に1点」を n 回(狻猊) */
    | { do: "volley"; n: Amount; dmg: number }
    /** 対象のクリーチャーに -n/-n(ターン終了時まで) */
    | { do: "shrink"; tg: number; n: Amount }
    /** このクリーチャーと対象のクリーチャーが格闘する */
    | { do: "fightSelf"; tg: number }
    /** 相手のパーマネントを n 個まで選んで破壊する(蒲牢) */
    | { do: "shatter"; n: Amount; max?: number; maxMV?: Amount }
    /** 相手の墓地のカードをすべてライブラリーの一番下に置く(覇下) */
    | { do: "washGrave" }
    /** マナ総量が n 以下の相手のクリーチャー1体を選び、持ち主のライブラリーの一番下に置く(覇下) */
    | { do: "tuckUpTo"; n: Amount }
    /** 重なったカード1枚を一番上にして、その「出たとき」を使う(椒図・九子の巡り)。tg がなければこのカードの重なり */
    | { do: "rotate"; tg?: number }
    /** 対象のクリーチャーの下に重なっているカード1枚のコピーを生成して手札に加える。手札にあるあいだ瞬速を持ち、コストが{n}少なくなる(逆鱗) */
    | { do: "underToHand"; tg: number; n: number }
    /** 睚眦:九子9種がすべて重なっていれば、トランプルと破壊不能を得て追加ターン(ゲームに1回) */
    | { do: "yazi" }
    /** 登龍門:インスタントのタイミングで九子1体を重ねる */
    | { do: "dragonNow" }
    /** ライブラリーの上から n 枚を見て、filter に合うカードを1枚まで手札に加え、残りを rest に置く(第13弾) */
    | { do: "seek"; n: number; filter: Filter; rest: "graveyard" | "bottom" }
    /** 自分の墓地から filter に合うカードを n 枚まで手札に戻す */
    | { do: "regrow"; n: number; filter: Filter }
    /** このカードを墓地から手札に戻す(死亡したときなど) */
    | { do: "selfToHand" }
    /** 任務を進める:自分の任務1つに任務カウンターを n 個置く(第13弾) */
    | { do: "advance"; n?: number }
    /** この任務に任務カウンターを1つ置く(任務の条件の誘発) */
    | { do: "questTick" }
    /** 自分の墓地の filter に合うカードをすべて戦場に戻す */
    | { do: "reanimateAll"; filter: Filter }
    /** 自分の墓地の罠を n 枚まで裏向きで仕掛ける */
    | { do: "setFromGrave"; n: number }
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
  /** あなたが各ターンに2枚目のカードを引くたび(第11.5弾) */
  | "secondDraw"
  /** 対戦相手のクリーチャーが攻撃するたび(1体ごと) */
  | "oppAttack"
  /** あなたが(filter に合う)パーマネントを生け贄に捧げるたび */
  | "sacrifice"
  /** ウシータ:この秘蔵庫のカードが戦場を離れて秘蔵庫に戻るとき */
  | "uscita"
  /** 陶酔:このカードが手札から捨てられたとき */
  | "discarded"
  /** あなたが(filter に合う)カードを手札から捨てるたび */
  | "discard"
  /** このパーマネントが生け贄に捧げられたとき(死亡したときではない。第12弾のラストワード形式) */
  | "sacrificed"
  /** このカードがタップされたとき(紋章。マナを出すためにタップされたときなど) */
  | "tapped"
  /** このカードが生成されたとき(マナゾーンに生成されたものは紋章) */
  | "created"
  /** filter に合う自分のクリーチャーが攻撃するたび(1体ごと。第13弾) */
  | "allyAttacks"
  /** filter に合う自分のクリーチャーがブロックするたび(1体ごと) */
  | "allyBlocks"
  /** このクリーチャーがブロックするたび */
  | "blocks"
  /** 対戦相手のクリーチャーが死亡するたび */
  | "oppDies"
  /** あなたがほかの任務を達成するたび */
  | "questDone"
  /** あなたが罠を発動するたび(裏向きから使うたび) */
  | "trapUse";

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
  | { s: "discount"; filter: Filter; n: number }
  /** 龍生の進化コストが{n}少なくなる(第12弾) */
  | { s: "dragonDiscount"; n: number }
  /** 任務を進めるとき、代わりに2回進める(第13弾) */
  | { s: "questDouble" };

/** 龍生の代わりの払い方(第12弾) */
export type DragonAlt = {
  /** ライブラリーの上から N 枚を墓地に置く */
  mill?: number;
  /** 手札を N 枚捨てる */
  discard?: number;
  /** ライフを N 点払う */
  life?: number;
  /** ほかの自分のパーマネント1つを生け贄に捧げる */
  sacOther?: boolean;
  /** タップしていない自分のパーマネントを N 個タップする */
  tapCreatures?: number;
  /** 自分のマナゾーンのカードを N 枚墓地に置く */
  manaToGrave?: number;
  /** 重なり(土台)の下のカードを N 枚秘蔵庫に戻す */
  underToVault?: number;
};

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
  /** 手札を N 枚捨てる */
  discard?: number;
};

export type Ability = { text?: string } & (
  | { a: "kw"; kw: string }
  /** 龍生:秘蔵庫の九子。マナコストを進化コストとして払い、贔屓を含む自分のクリーチャーの上に重ねて出す(第12弾)。
   *  alt は代わりの払い方、ambush は相手が悪事を働いたときインスタントとして重ねられる、selfReduce は睚眦の軽減 */
  | { a: "dragon"; alt?: DragonAlt; ambush?: boolean; selfReduce?: boolean }
  /** 重なったカード1枚につき+1/+1(龍生九子では睚眦・饕餮だけ) */
  | { a: "stackBonus" }
  /** 燃焼 N。upTo なら烈燃 N(0〜N枚の好きな枚数を燃焼できる) */
  | { a: "burn"; n: number; upTo?: boolean }
  /** 疾駆:このコストで唱えると速攻を得て、終了ステップに手札に戻る */
  | { a: "dash"; cost: string }
  | { a: "release"; cost: string }
  /** modes があればモード呪文(唱えるときに1つ選ぶ) */
  | { a: "spell"; targets?: TargetSpec[]; effects: Effect[]; modes?: SpellMode[] }
  /** リリース召喚 N:秘蔵庫のクリーチャー。エンチャントと奉納を持つクリーチャーをマナ総量の合計がN以上になるようにリリースし、マナを払わずに出す */
  | { a: "releaseSummon"; n: number; from?: Filter[] }
  /** カーテンコール N【cat】:戦場にある自分の base(カードID)の上に重ね、喝采【cat】をN消費して秘蔵庫から出す。base は秘蔵庫に戻る */
  | { a: "curtainCall"; n: number; cat: Applause; base: string; baseName?: string; ovation?: number; cut?: number }
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
  /** 純色払い:コストのすべてを同じ1色のマナで支払わなければならない */
  | { a: "pureCost" }
  /** 宝石獣:秘蔵庫に入るカード(強盗でマナゾーンに置かれ、マナ解放で唱える) */
  | { a: "gem" }
  /** 金庫破り ― 秘蔵庫が空なら、マナ解放のコストが{n}少なくなる */
  | { a: "vaultCrack"; n: number }
  /** 紋章 ― 埋蔵 N:マナゾーンにあるこのカードを開拓進化で墓地に置くとき、マナ総量に+Nして数える */
  | { a: "buried"; n: number; from?: "mana" }
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
  /** 秘蔵 ―:秘蔵庫に入れ、そこからマナコストを払って唱えられる(第11.5弾) */
  | { a: "vaultCast" }
  /** パワーが maxPower 以下のクリーチャーしかブロックできない */
  | { a: "blockOnly"; maxPower: number; maxToughness?: number }
  /** 開拓進化の素材に、相手のクリーチャーも使える(相手の場に minOpp 体以上いるとき、元のパワーとタフネスが maxStat 以下のもの) */
  | { a: "pioneerOppBase"; maxSum: number; minOpp: number }
  /** 留まる:次の対戦相手のターンの終了時まで戦場を離れず、その終了時にマナゾーンに置かれる */
  | { a: "anchor" }
  /** 一度秘蔵庫から出たら、秘蔵庫には戻らない */
  | { a: "oneShot" }
  /** 計略:秘蔵庫に入れるインスタント・ソーサリー。献策で手札に加える */
  | { a: "lesson" }
  /** 覇業【呉】のあいだ、自分の水軍の条件をつねに満たす(孫権) */
  | { a: "navyAlways" }
  /** コスト軽減(第11.5弾):per があれば「per 1つにつき{mult}」、なければ{n}。if があればその条件のときだけ */
  | { a: "costDown"; per?: Amount; mult?: number; n?: number; if?: Cond; label?: string }
  /** 共鳴:filter に合う自分のパーマネント1つにつき、唱えるコストが{1}少なくなる */
  | { a: "affinity"; filter: Filter }
  /** 零式:条件を満たしていれば、マナを払わずに唱えてもよい */
  | { a: "free"; if: Cond }
  /** 罠(第13弾):手札からマナコストを払って裏向きで仕掛ける。仕掛けた次のターンから、コストなしで表向きにして(発動)効果を使える。
   *  表向きのあとは cost を払えば同じ効果を何度でも使える。on があれば、そのことが起きたときにだけ使える */
  | { a: "trap"; cost: string; on?: "oppEnter" | "oppDraw"; targets?: TargetSpec[]; effects: Effect[] }
  /** 任務(第13弾):任務カウンターが n 個になったら達成。reward を行い、墓地に置く */
  | { a: "quest"; n: number; reward: Effect[] }
);

/** モード呪文の選択肢 */
/** pay:混成マナ記号をその色で支払ったときだけ選べるモード(払った色で効果が変わるカード) */
export type SpellMode = { label: string; targets?: TargetSpec[]; effects: Effect[]; pay?: Color };

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
