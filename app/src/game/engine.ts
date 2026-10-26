/**
 * 対戦のルールエンジン。
 * 決定が必要な場面では agents[p].decide() に「質問(Decision)」を渡して答えを待つ。
 * 人間は画面で、CPUは ai.ts で答える。
 */
import type { Card } from "../types";
import type { Ability, ActivatedCost, Amount, Applause, Cond, Effect, Filter, StaticSpec, TargetSpec, TriggerEvent, SpellMode } from "./schema";
import { cardColors, manaValue, parseCost, type Color } from "../lib/mana";
import { findPayment, type ManaUnit } from "./payment";

export type PlayerId = 0 | 1;
export type Zone = "library" | "hand" | "mana" | "battlefield" | "graveyard" | "exile" | "stack" | "extra";
export type Step = "setup" | "untap" | "upkeep" | "draw" | "main1" | "attack" | "block" | "damage" | "main2" | "end" | "cleanup";

export const STEP_NAMES: Record<Step, string> = {
  setup: "準備",
  untap: "アンタップ",
  upkeep: "アップキープ",
  draw: "ドロー",
  main1: "メイン1",
  attack: "攻撃",
  block: "ブロック",
  damage: "戦闘ダメージ",
  main2: "メイン2",
  end: "終了",
  cleanup: "クリンナップ",
};

type Mod = { p: number; t: number; kw: string[] };

export type Obj = {
  uid: number;
  /** マナゾーンで裏向き(名前・色・能力を持たない欠色のカードとして扱う) */
  faceDown?: boolean;
  /** 生成されたカード(チャージできず、手札・スタック・戦場以外に移ると消える) */
  generated?: boolean;
  card: Card;
  owner: PlayerId;
  controller: PlayerId;
  zone: Zone;
  tapped: boolean;
  /** 召喚酔い */
  sick: boolean;
  damage: number;
  /** +1/+1カウンター */
  counters: number;
  deathtouched: boolean;
  /** ターン終了時までの修整 */
  temp: Mod[];
  /** 戦場にいる間ずっと続く修整 */
  perm: Mod[];
  /** 次のアンタップ・ステップにアンタップしない */
  freeze: boolean;
  /** オーラがつけられているクリーチャー */
  attachedTo: number | null;
  burned: boolean;
  /** 燃焼した枚数(烈燃) */
  burnCount: number;
  kicked: boolean;
  /** 疾駆で出た(終了ステップに手札に戻る) */
  dashed: boolean;
  x: number;
  token: boolean;
  /** トークンの色 */
  tokenColors?: Color[];
};

export type Player = {
  id: PlayerId;
  name: string;
  life: number;
  library: Obj[];
  hand: Obj[];
  mana: Obj[];
  battlefield: Obj[];
  graveyard: Obj[];
  exile: Obj[];
  /** 秘蔵庫(リリース召喚で出すクリーチャー) */
  extra: Obj[];
  chargesUsed: number;
  extraChargesThisTurn: number;
  /** 浮いているマナ(W/U/B/R/G/C) */
  pool: string[];
  drewFromEmpty: boolean;
  /** 孤高:デッキに同名カードが2枚以上入っていない */
  highlander: boolean;
  /** このターンに捨てたカードと、戦場を離れたクリーチャーの数(陰謀) */
  lostThisTurn: number;
  /** このターンに一度に攻撃したクリーチャーの最大数(強襲) */
  attackersThisTurn: number;
  /** このターンに唱えたインスタントとソーサリーの数(連唱) */
  spellsThisTurn: number;
  /** このターンにリリース召喚を行った */
  releasedThisTurn: boolean;
  /** 喝采(第9.5弾)。デッキに関係するカードがあるカテゴリーだけが溜まる(加護の枠を使う) */
  applause: Partial<Record<Applause, number>>;
  /** このターンに行動で溜めた喝采(上限の判定用) */
  applauseThisTurn: Partial<Record<Applause, number>>;
  /** このターンにエントラータしたカード */
  enteredThisTurn: Set<number>;
};

export type TargetRef =
  | { kind: "obj"; uid: number; zone: Zone }
  | { kind: "player"; id: PlayerId }
  | { kind: "stack"; id: number };

export type StackItem = {
  id: number;
  kind: "spell" | "trigger" | "activated";
  obj: Obj;
  controller: PlayerId;
  ability: Ability | null;
  targets: TargetRef[];
  burned: boolean;
  burnCount: number;
  kicked: boolean;
  dashed: boolean;
  /** 再演で墓地から唱えた(解決後に追放される) */
  flashback: boolean;
  x: number;
};

export type CastFrom = "hand" | "mana" | "graveyard" | "dash";

export type Action =
  | { type: "pass" }
  | { type: "cast"; uid: number; from: CastFrom }
  | { type: "charge"; uid: number }
  | { type: "activate"; uid: number; index: number }
  | { type: "cycle"; uid: number }
  | { type: "equip"; uid: number }
  /** 秘蔵庫からリリース召喚する(via: "entrata" ならエントラータ) */
  | { type: "summon"; uid: number; via?: "entrata" };

export type Decision =
  | { kind: "action"; options: Action[] }
  | { kind: "target"; prompt: string; spec: TargetSpec; options: TargetRef[]; source: Obj; effects: Effect[]; index: number }
  | { kind: "yesno"; prompt: string; reason: "may" | "burn" | "kicker" | "lookTop" | "mulligan" | "reclaim"; obj?: Obj }
  | { kind: "number"; prompt: string; min: number; max: number; reason?: "x" | "burn"; obj?: Obj }
  | { kind: "chooseCards"; prompt: string; options: number[]; count: number; reason: "discard" | "burn" | "reclaim" | "erode" | "sacrifice" | "bottom" | "tutor" | "sacCost" | "veil" }
  | { kind: "attackers"; options: number[] }
  /** モード呪文:選択肢から1つ選ぶ(答えは番号) */
  | { kind: "mode"; prompt: string; options: string[]; source: Obj; modes: SpellMode[] }
  /** リリースするカードを選ぶ:values の合計が min 以上になるように選ぶ */
  | { kind: "chooseSum"; prompt: string; options: number[]; values: number[]; min: number; target: Obj }
  | { kind: "blockers"; attackers: number[]; blockers: number[] };

export type BlockAnswer = Record<number, number[]>;

export interface Agent {
  decide(g: Game, p: PlayerId, d: Decision): Promise<unknown>;
}

export type LogEntry = { id: number; turn: number; player: PlayerId | null; text: string };

export class GameOver extends Error {
  constructor(public winner: PlayerId | null) {
    super("game over");
  }
}

// ---------------------------------------------------------------- 乱数
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------- カードの性質
export const isCreatureCard = (c: Card) => c.type.includes("クリーチャー");
export const isInstantCard = (c: Card) => c.type === "インスタント";
export const isSorceryCard = (c: Card) => c.type === "ソーサリー";
export const isPermanentCard = (c: Card) => !isInstantCard(c) && !isSorceryCard(c);
export const abilitiesOf = (c: Card): Ability[] => c.abilities ?? [];
export const hasPrintedKw = (c: Card, kw: string) => abilitiesOf(c).some((a) => a.a === "kw" && a.kw === kw);
export const spellAbility = (c: Card) => abilitiesOf(c).find((a) => a.a === "spell") as Extract<Ability, { a: "spell" }> | undefined;
export const burnAbility = (c: Card) => abilitiesOf(c).find((a) => a.a === "burn") as Extract<Ability, { a: "burn" }> | undefined;
export const releaseAbility = (c: Card) => abilitiesOf(c).find((a) => a.a === "release") as Extract<Ability, { a: "release" }> | undefined;
export const isAura = (c: Card) => abilitiesOf(c).some((a) => a.a === "enchant");
export const isEquipment = (c: Card) => abilitiesOf(c).some((a) => a.a === "equip");
/** 秘蔵庫のカード(リリース召喚を持つ) */
export const isExtraCard = (c: Card) => abilitiesOf(c).some((a) => a.a === "releaseSummon" || a.a === "entrata");
export const entrataOf = (c: Card) => abilitiesOf(c).find((a) => a.a === "entrata") as Extract<Ability, { a: "entrata" }> | undefined;
/** 喝采の枠は加護の枠(5つ)を使う */
export const BLESSING_SLOTS = 5;
/** 行動で溜まる喝采の、1ターンの上限 */
export const APPLAUSE_CAP: Record<Applause, number> = { 狂気: 2, 悲劇: 3, 喜劇: 3 };
/** カードが関係する喝采のカテゴリー */
export const applauseCatsOf = (c: Card): Applause[] => [...new Set([...JSON.stringify(c.abilities).matchAll(/"(?:cat|applause)":"(狂気|悲劇|喜劇)"/g)].map((m) => m[1] as Applause))];
export const releaseOf = (c: Card) => abilitiesOf(c).find((a) => a.a === "releaseSummon") as Extract<Ability, { a: "releaseSummon" }> | undefined;
export const offeringOf = (c: Card) => abilitiesOf(c).find((a) => a.a === "offering") as Extract<Ability, { a: "offering" }> | undefined;
/** 紋章(マナゾーンで働く能力)か */
export const isCrestAbility = (a: Ability) => (a.a === "static" || a.a === "trigger") && a.from === "mana";
export const hasCrest = (c: Card) => abilitiesOf(c).some(isCrestAbility);
/** マナゾーンのカードの色。裏向きなら欠色 */
export const manaColors = (o: Obj): Color[] => (o.faceDown ? [] : cardColors(o.card.cost));
/** マナゾーンで紋章が働くカードか(裏向きなら働かない) */
export const crestActive = (o: Obj) => !o.faceDown && hasCrest(o.card);
export function abilityOf<K extends Ability["a"]>(c: Card, kind: K): Extract<Ability, { a: K }> | undefined {
  return abilitiesOf(c).find((a) => a.a === kind) as Extract<Ability, { a: K }> | undefined;
}

/** カードが絞り込みに合うか */
export function matchFilter(c: Card, f: Filter | undefined, colors?: Color[]): boolean {
  if (!f) return true;
  if (f.type && !c.type.includes(f.type)) return false;
  if (f.spell && !(isInstantCard(c) || isSorceryCard(c))) return false;
  if (f.sub && !(c.subtype ?? "").split("・").includes(f.sub)) return false;
  if (f.name && !c.name.includes(f.name)) return false;
  const mv = manaValue(c.cost);
  if (f.mv !== undefined && mv !== f.mv) return false;
  if (f.minMV !== undefined && mv < f.minMV) return false;
  if (f.maxMV !== undefined && mv > f.maxMV) return false;
  if (f.maxPower !== undefined && (c.power ?? 99) > f.maxPower) return false;
  if (f.minPower !== undefined && (c.power ?? -1) < f.minPower) return false;
  if (f.color && !(colors ?? cardColors(c.cost)).includes(f.color)) return false;
  return true;
}

/** コストの汎用部分を n 減らす */
export function reduceGeneric(cost: string, n: number): string {
  if (n <= 0) return cost;
  let generic = 0;
  const rest: string[] = [];
  for (const m of cost.matchAll(/\{([^}]+)\}/g)) {
    if (/^\d+$/.test(m[1])) generic += Number(m[1]);
    else rest.push(m[0]);
  }
  const left = Math.max(0, generic - n);
  return (left > 0 ? `{${left}}` : "") + rest.join("");
}

const AURA_TARGET: TargetSpec = { t: "creature" };

let nextUid = 1;

export type GameOptions = {
  decks: [Card[], Card[]];
  names: [string, string];
  agents: [Agent, Agent];
  seed?: number;
  /** 状態が変わるたびに呼ぶ(画面の更新用) */
  onUpdate?: () => void;
  /** 先攻を固定する(テスト用) */
  first?: PlayerId;
  /** このターン数を超えたら引き分け(テスト用) */
  maxTurns?: number;
};

export class Game {
  players: [Player, Player];
  agents: [Agent, Agent];
  stack: StackItem[] = [];
  active: PlayerId = 0;
  turn = 0;
  step: Step = "setup";
  log: LogEntry[] = [];
  winner: PlayerId | null | undefined = undefined;
  combat: { attackers: number[]; blocks: BlockAnswer } | null = null;
  /** 質問待ちのプレイヤー(画面表示用) */
  waitingFor: PlayerId | null = null;
  private rng: () => number;
  private onUpdate: () => void;
  private pendingTriggers: { obj: Obj; ability: Extract<Ability, { a: "trigger" }>; controller: PlayerId }[] = [];
  private stackId = 1;
  private logId = 1;
  private firstPlayer: PlayerId;
  private maxTurns: number;
  /** 唱えたり能力を使ったりしたカードのID(テスト用の集計) */
  usedCards = new Set<string>();
  private aborted = false;

  constructor(opts: GameOptions) {
    this.maxTurns = opts.maxTurns ?? Infinity;
    this.rng = mulberry32(opts.seed ?? Math.floor(Math.random() * 2 ** 31));
    this.onUpdate = opts.onUpdate ?? (() => {});
    this.agents = opts.agents;
    const mk = (id: PlayerId): Player => ({
      id,
      name: opts.names[id],
      life: 20,
      library: opts.decks[id].filter((card) => !isExtraCard(card)).map((card) => this.newObj(card, id, "library")),
      hand: [],
      mana: [],
      battlefield: [],
      graveyard: [],
      exile: [],
      extra: opts.decks[id].filter(isExtraCard).map((card) => this.newObj(card, id, "extra")),
      chargesUsed: 0,
      extraChargesThisTurn: 0,
      pool: [],
      drewFromEmpty: false,
      highlander: (() => {
        const main = opts.decks[id].filter((c) => !isExtraCard(c));
        return new Set(main.map((c) => c.name)).size === main.length;
      })(),
      lostThisTurn: 0,
      attackersThisTurn: 0,
      spellsThisTurn: 0,
      releasedThisTurn: false,
      // 喝采:デッキ(メインか秘蔵庫)に関係するカードがあるカテゴリーだけ、加護の枠を使って0から溜まる
      applause: Object.fromEntries([...new Set(opts.decks[id].flatMap(applauseCatsOf))].slice(0, BLESSING_SLOTS).map((c) => [c, 0])),
      applauseThisTurn: {},
      enteredThisTurn: new Set(),
    });
    this.players = [mk(0), mk(1)];
    this.firstPlayer = opts.first ?? (this.rng() < 0.5 ? 0 : 1);
  }

  // ------------------------------------------------------------ 基本
  private newObj(card: Card, owner: PlayerId, zone: Zone): Obj {
    return {
      uid: nextUid++,
      card,
      owner,
      controller: owner,
      zone,
      tapped: false,
      sick: false,
      damage: 0,
      counters: 0,
      deathtouched: false,
      temp: [],
      perm: [],
      freeze: false,
      attachedTo: null,
      burned: false,
      burnCount: 0,
      kicked: false,
      dashed: false,
      x: 0,
      token: false,
    };
  }

  other(p: PlayerId): PlayerId {
    return p === 0 ? 1 : 0;
  }

  update() {
    this.onUpdate();
  }

  addLog(text: string, player: PlayerId | null = null) {
    this.log.push({ id: this.logId++, turn: this.turn, player, text });
    // 対戦後にログ全体をコピーできるよう、多めに残す
    if (this.log.length > 5000) this.log.splice(0, this.log.length - 5000);
    this.update();
  }

  private shuffle<T>(arr: T[]) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  find(uid: number): Obj | undefined {
    for (const p of this.players) {
      for (const z of [p.battlefield, p.hand, p.mana, p.graveyard, p.library, p.exile, p.extra]) {
        const o = z.find((x) => x.uid === uid);
        if (o) return o;
      }
    }
    return this.stack.find((s) => s.obj.uid === uid)?.obj;
  }

  zoneArray(o: Obj): Obj[] | null {
    const p = this.players[o.zone === "battlefield" ? o.controller : o.owner];
    switch (o.zone) {
      case "battlefield":
        return p.battlefield;
      case "hand":
        return p.hand;
      case "mana":
        return p.mana;
      case "graveyard":
        return p.graveyard;
      case "library":
        return p.library;
      case "exile":
        return p.exile;
      case "extra":
        return p.extra;
      default:
        return null;
    }
  }

  /** カードを別の領域に移す。トークンは戦場を離れると消える */
  private move(o: Obj, to: Zone, opts: { top?: boolean; tapped?: boolean; controller?: PlayerId } = {}) {
    const arr = this.zoneArray(o);
    if (arr) {
      const i = arr.indexOf(o);
      if (i >= 0) arr.splice(i, 1);
    }
    if (o.zone === "stack") this.stack = this.stack.filter((s) => s.obj !== o);
    const wasBattlefield = o.zone === "battlefield";
    // 領域を移ると表向きに戻る
    o.faceDown = false;
    // 陰謀:戦場を離れたクリーチャーと、手札から墓地に置かれた(捨てた)カードを数える
    if (wasBattlefield && to !== "battlefield" && isCreatureCard(o.card)) this.players[o.controller].lostThisTurn++;
    if (o.zone === "hand" && to === "graveyard") this.players[o.owner].lostThisTurn++;
    // 領域を移ると新しいオブジェクトとして扱う
    o.tapped = false;
    o.sick = false;
    o.damage = 0;
    o.counters = 0;
    o.deathtouched = false;
    o.temp = [];
    o.perm = [];
    o.freeze = false;
    o.attachedTo = null;
    if (wasBattlefield && to !== "battlefield") {
      o.burned = false;
      o.burnCount = 0;
      o.kicked = false;
      o.dashed = false;
      // 装備品は外れる
      for (const q of this.players) for (const e of q.battlefield) if (e.attachedTo === o.uid && isEquipment(e.card)) e.attachedTo = null;
    }
    // 秘蔵庫のカードは、戦場を離れたら(どこへ行く場合も)秘蔵庫に戻る
    if (isExtraCard(o.card) && to !== "battlefield" && to !== "extra") {
      to = "extra";
      o.faceDown = false;
      this.addLog(`${o.card.name}は秘蔵庫に戻った`, o.owner);
      // ウシータ(退場):秘蔵庫に戻るときに誘発する
      if (wasBattlefield)
        for (const ab of abilitiesOf(o.card))
          if (ab.a === "trigger" && ab.on === "uscita") this.pendingTriggers.push({ obj: o, ability: ab, controller: o.owner });
    }
    o.controller = opts.controller ?? o.owner;
    o.zone = to;
    if (o.token && to !== "battlefield") return;
    // 生成されたカードは、手札・スタック・戦場以外に移ると消える
    if (o.generated && to !== "hand" && to !== "stack" && to !== "battlefield") return;
    const p = this.players[to === "battlefield" ? o.controller : o.owner];
    switch (to) {
      case "battlefield":
        p.battlefield.push(o);
        break;
      case "hand":
        p.hand.push(o);
        break;
      case "mana":
        o.tapped = opts.tapped ?? cardColors(o.card.cost).length >= 2;
        p.mana.push(o);
        break;
      case "graveyard":
        p.graveyard.push(o);
        // 「どこからでも墓地に置かれたとき」
        for (const ab of abilitiesOf(o.card)) if (ab.a === "trigger" && ab.on === "toGraveyard") this.pendingTriggers.push({ obj: o, ability: ab, controller: o.owner });
        break;
      case "library":
        if (opts.top) p.library.unshift(o);
        else p.library.push(o);
        break;
      case "exile":
        p.exile.push(o);
        break;
      case "extra":
        p.extra.push(o);
        break;
      case "stack":
        break;
    }
  }

  colorsOf(o: Obj): Color[] {
    return o.tokenColors ?? cardColors(o.card.cost);
  }

  // ------------------------------------------------------------ 条件・性質
  cond(c: Cond, p: PlayerId, burned = false, kicked = false): boolean {
    const pl = this.players[p];
    if (typeof c === "object") {
      if ("armed" in c) return pl.mana.filter((o) => manaColors(o).includes(c.armed)).length >= c.n;
      if ("applause" in c) return (pl.applause[c.applause] ?? 0) >= c.n;
      return pl.battlefield.filter((o) => matchFilter(o.card, c.control, this.colorsOf(o))).length >= c.n;
    }
    switch (c) {
      case "burned":
        return burned;
      case "kicked":
        return kicked;
      case "bloom":
        return pl.mana.length >= 7;
      case "fullBloom":
        return pl.mana.length >= 10;
      case "abyss":
        return pl.graveyard.length >= 12;
      case "oppTurn":
        return this.active !== p;
      case "void":
        return pl.mana.length > 0 && pl.mana.filter((o) => manaColors(o).length === 0).length * 2 >= pl.mana.length;
      case "vacuum":
        return pl.mana.length > 0 && pl.mana.every((o) => manaColors(o).length === 0);
      case "raid":
        return pl.attackersThisTurn >= 2;
      case "chain":
        return pl.spellsThisTurn >= 2;
      case "intrigue":
        return this.players[this.other(p)].lostThisTurn > 0;
      case "fewerMana":
        return pl.mana.length < this.players[this.other(p)].mana.length;
      case "notMoreMana":
        return pl.mana.length <= this.players[this.other(p)].mana.length;
      case "threshold":
        return pl.graveyard.length >= 7;
      case "hellbent":
        return pl.hand.length === 0;
      case "highlander":
        return pl.highlander;
      case "metalcraft":
        return pl.battlefield.filter((o) => o.card.type.includes("アーティファクト")).length >= 3;
      case "ferocious":
        return this.creatures(p).some((o) => this.power(o) >= 4);
    }
  }

  /** 数を数える(自分基準) */
  count(n: Amount, p: PlayerId, x = 0, burnCount = 0): number {
    if (typeof n === "number") return n;
    if (n === "X") return x;
    const pl = this.players[p];
    switch (n.count) {
      case "mana":
        return pl.mana.length;
      case "creatures":
        return this.creatures(p).length;
      case "oppCreatures":
        return this.creatures(this.other(p)).length;
      case "graveyard":
        return pl.graveyard.length;
      case "hand":
        return pl.hand.length;
      case "burned":
        return burnCount;
      case "crests":
        return pl.mana.filter(crestActive).length;
      case "colorlessMana":
        return pl.mana.filter((o) => manaColors(o).length === 0).length;
      case "colorsInMana":
        return new Set(pl.mana.flatMap(manaColors)).size;
      case "perm":
        return pl.battlefield.filter((o) => matchFilter(o.card, n.filter, this.colorsOf(o))).length;
      case "applause":
        return pl.applause[n.cat] ?? 0;
    }
  }

  /** その領域で働いている能力。紋章はマナゾーンでだけ、それ以外は戦場でだけ働く */
  activeAbilities(o: Obj): Ability[] {
    const inMana = o.zone === "mana";
    if (inMana && o.faceDown) return [];
    return abilitiesOf(o.card).filter((a) => isCrestAbility(a) === inMana);
  }

  /** 能力を持ちうるパーマネントとマナゾーンのカード */
  sources(p: PlayerId): Obj[] {
    return [...this.players[p].battlefield, ...this.players[p].mana];
  }

  private statics(o: Obj): Mod[] {
    const mods: Mod[] = [];
    if (o.zone !== "battlefield") return mods;
    const creature = isCreatureCard(o.card);
    for (const src of this.sources(o.controller)) {
      for (const a of this.activeAbilities(src)) {
        if (a.a !== "static") continue;
        if (a.if && !this.cond(a.if, src.controller)) continue;
        const st = a.st;
        if (st.s === "anthem" && creature && !(st.others && src === o) && matchFilter(o.card, st.filter, this.colorsOf(o)))
          mods.push({ p: st.p, t: st.t, kw: st.kw ?? [] });
        if (st.s === "self" && src === o) mods.push({ p: st.p, t: st.t, kw: st.kw ?? [] });
        if (st.s === "scale" && src === o) {
          const k = this.count(st.per, o.controller);
          mods.push({ p: st.p * k, t: st.t * k, kw: [] });
        }
      }
    }
    for (const p of this.players) {
      for (const aura of p.battlefield) {
        if (aura.attachedTo !== o.uid) continue;
        for (const a of abilitiesOf(aura.card)) {
          if (a.a === "static" && a.st.s === "auraBuff" && (!a.if || this.cond(a.if, aura.controller)))
            mods.push({ p: a.st.p, t: a.st.t, kw: a.st.kw ?? [] });
        }
      }
    }
    return mods;
  }

  private allMods(o: Obj): Mod[] {
    return [...o.perm, ...o.temp, ...this.statics(o)];
  }

  power(o: Obj): number {
    return (o.card.power ?? 0) + o.counters + this.allMods(o).reduce((s, m) => s + m.p, 0);
  }

  toughness(o: Obj): number {
    return (o.card.toughness ?? 0) + o.counters + this.allMods(o).reduce((s, m) => s + m.t, 0);
  }

  keywords(o: Obj): Set<string> {
    const set = new Set<string>();
    for (const a of abilitiesOf(o.card)) if (a.a === "kw") set.add(a.kw);
    for (const m of this.allMods(o)) for (const k of m.kw) set.add(k);
    return set;
  }

  hasKw(o: Obj, kw: string): boolean {
    return this.keywords(o).has(kw);
  }

  isPacified(o: Obj): boolean {
    for (const p of this.players)
      for (const aura of p.battlefield)
        if (aura.attachedTo === o.uid && abilitiesOf(aura.card).some((a) => a.a === "static" && a.st.s === "pacify")) return true;
    return false;
  }

  creatures(p: PlayerId): Obj[] {
    return this.players[p].battlefield.filter((o) => isCreatureCard(o.card));
  }

  canAttack(o: Obj): boolean {
    return (
      o.zone === "battlefield" &&
      isCreatureCard(o.card) &&
      !o.tapped &&
      (!o.sick || this.hasKw(o, "速攻")) &&
      !this.hasKw(o, "防衛") &&
      !this.isPacified(o)
    );
  }

  canBlock(blocker: Obj, attacker: Obj): boolean {
    if (blocker.tapped || !isCreatureCard(blocker.card) || this.isPacified(blocker) || this.hasKw(blocker, "ブロックできない")) return false;
    if (this.hasKw(attacker, "飛行") && !this.hasKw(blocker, "飛行") && !this.hasKw(blocker, "到達")) return false;
    if (this.hasKw(attacker, "天翔") && !this.hasKw(blocker, "天翔")) return false;
    return true;
  }

  chargesAllowed(p: PlayerId): number {
    let n = 1 + this.players[p].extraChargesThisTurn;
    for (const o of this.sources(p))
      for (const a of this.activeAbilities(o)) if (a.a === "static" && a.st.s === "extraCharge" && (!a.if || this.cond(a.if, p))) n += a.st.n;
    return n;
  }

  // ------------------------------------------------------------ 質問
  /** 対戦をやめる(画面を離れたとき) */
  abort() {
    this.aborted = true;
  }

  private async ask<T>(p: PlayerId, d: Decision): Promise<T> {
    if (this.aborted) throw new GameOver(null);
    this.waitingFor = p;
    this.update();
    const ans = (await this.agents[p].decide(this, p, d)) as T;
    if (this.aborted) throw new GameOver(null);
    this.waitingFor = null;
    return ans;
  }

  private async askYesNo(p: PlayerId, prompt: string, reason: Extract<Decision, { kind: "yesno" }>["reason"], obj?: Obj) {
    return this.ask<boolean>(p, { kind: "yesno", prompt, reason, obj });
  }

  private async askCards(p: PlayerId, prompt: string, options: Obj[], count: number, reason: Extract<Decision, { kind: "chooseCards" }>["reason"]) {
    // 選ぶ必要がないときもコピーを返す。元の配列(マナゾーンや手札そのもの)を返すと、
    // 呼び出し側がカードを移しながら回すときに要素が詰まって、1枚おきに飛ばされてしまう
    if (options.length <= count) return [...options];
    const uids = await this.ask<number[]>(p, { kind: "chooseCards", prompt, options: options.map((o) => o.uid), count, reason });
    const picked = options.filter((o) => uids.includes(o.uid)).slice(0, count);
    // 足りない分は先頭から補う(不正な答えへの備え)
    for (const o of options) if (picked.length < count && !picked.includes(o)) picked.push(o);
    return picked;
  }

  // ------------------------------------------------------------ 対象
  describeRef(r: TargetRef): string {
    if (r.kind === "player") return this.players[r.id].name;
    if (r.kind === "stack") return this.stack.find((s) => s.id === r.id)?.obj.card.name ?? "(呪文)";
    return this.find(r.uid)?.card.name ?? "(カード)";
  }

  private targetable(o: Obj, by: PlayerId): boolean {
    return !(o.controller !== by && this.hasKw(o, "呪禁"));
  }

  private matchCreature(o: Obj, spec: Extract<TargetSpec, { t: "creature" }>, by: PlayerId): boolean {
    if (o.zone !== "battlefield" || !isCreatureCard(o.card) || !this.targetable(o, by)) return false;
    if (spec.who === "you" && o.controller !== by) return false;
    if (spec.who === "opp" && o.controller === by) return false;
    if (spec.nonColor && this.colorsOf(o).includes(spec.nonColor)) return false;
    if (spec.tapped && !o.tapped) return false;
    if (spec.minPower !== undefined && this.power(o) < spec.minPower) return false;
    if (spec.maxPower !== undefined && this.power(o) > spec.maxPower) return false;
    if (spec.flying && !this.hasKw(o, "飛行")) return false;
    if (spec.filter && !matchFilter(o.card, spec.filter, this.colorsOf(o))) return false;
    return true;
  }

  targetOptions(spec: TargetSpec, by: PlayerId, exclude?: StackItem): TargetRef[] {
    const out: TargetRef[] = [];
    const bf = [...this.players[0].battlefield, ...this.players[1].battlefield];
    switch (spec.t) {
      case "creature":
        for (const o of bf) if (this.matchCreature(o, spec, by)) out.push({ kind: "obj", uid: o.uid, zone: o.zone });
        break;
      case "any":
        for (const o of bf) if (this.matchCreature(o, { t: "creature" }, by)) out.push({ kind: "obj", uid: o.uid, zone: o.zone });
        out.push({ kind: "player", id: this.other(by) }, { kind: "player", id: by });
        break;
      case "player":
        out.push({ kind: "player", id: this.other(by) });
        break;
      case "spell":
        for (const s of this.stack) {
          if (s.kind !== "spell" || s === exclude) continue;
          if (spec.noncreature && isCreatureCard(s.obj.card)) continue;
          if (spec.maxMV !== undefined && manaValue(s.obj.card.cost) > spec.maxMV) continue;
          out.push({ kind: "stack", id: s.id });
        }
        break;
      case "permanent":
        for (const o of bf)
          if (
            spec.types.some((t) => o.card.type.includes(t)) &&
            this.targetable(o, by) &&
            !(spec.who === "you" && o.controller !== by) &&
            !(spec.who === "opp" && o.controller === by)
          )
            out.push({ kind: "obj", uid: o.uid, zone: o.zone });
        break;
      case "graveyard":
        for (const o of this.players[by].graveyard)
          if ((!spec.cardType || o.card.type.includes(spec.cardType)) && matchFilter(o.card, spec.filter))
            out.push({ kind: "obj", uid: o.uid, zone: o.zone });
        break;
    }
    return out;
  }

  private stillLegal(r: TargetRef, spec: TargetSpec, by: PlayerId): boolean {
    if (r.kind === "player") return spec.t === "any" || spec.t === "player";
    if (r.kind === "stack") return this.stack.some((s) => s.id === r.id);
    const o = this.find(r.uid);
    if (!o || o.zone !== r.zone) return false;
    return this.targetOptions(spec, by).some((x) => x.kind === "obj" && x.uid === o.uid);
  }

  /** 対象を選ぶ。選べない対象があれば null */
  private async chooseTargets(p: PlayerId, specs: TargetSpec[], source: Obj, effects: Effect[], exclude?: StackItem): Promise<TargetRef[] | null> {
    const chosen: TargetRef[] = [];
    for (let i = 0; i < specs.length; i++) {
      const options = this.targetOptions(specs[i], p, exclude).filter(
        (o) => !chosen.some((c) => c.kind === o.kind && JSON.stringify(c) === JSON.stringify(o)),
      );
      if (options.length === 0) return null;
      const pick =
        options.length === 1
          ? options[0]
          : await this.ask<TargetRef>(p, { kind: "target", prompt: `${source.card.name}の対象を選んでください`, spec: specs[i], options, source, effects, index: i });
      chosen.push(options.find((o) => JSON.stringify(o) === JSON.stringify(pick)) ?? options[0]);
    }
    return chosen;
  }

  // ------------------------------------------------------------ マナ
  private manaUnits(p: PlayerId, exclude?: Obj): ManaUnit[] {
    const pl = this.players[p];
    const units: ManaUnit[] = [];
    pl.pool.forEach((m, i) => units.push({ tapGroup: `pool${i}`, options: [m], priority: 0 }));
    for (const o of pl.mana) {
      if (o.tapped || o === exclude) continue;
      const cs = manaColors(o);
      units.push({ tapGroup: `m${o.uid}`, options: cs.length ? cs : ["C"], priority: 1 });
    }
    for (const o of pl.battlefield) {
      if (o.tapped || o === exclude) continue;
      if (isCreatureCard(o.card) && o.sick) continue;
      for (const a of abilitiesOf(o.card)) {
        if (a.a !== "mana") continue;
        if (a.produce[0] === "any") units.push({ tapGroup: `b${o.uid}`, options: ["W", "U", "B", "R", "G"], priority: 2 });
        else if (a.produce.length > 1) {
          // 「{G}か{U}」
          units.push({ tapGroup: `b${o.uid}`, options: a.produce.map((s) => s.replace(/[{}]/g, "")), priority: 2 });
        } else {
          // 「{C}{C}」のように一度に複数出す
          for (const m of parseCost(a.produce[0])) {
            const sym = m.kind === "color" ? m.c : "C";
            units.push({ tapGroup: `b${o.uid}`, options: [sym], priority: 2 });
          }
        }
      }
    }
    return units;
  }

  canPay(p: PlayerId, cost: string, x = 0, exclude?: Obj): boolean {
    return !!findPayment(cost, x, this.manaUnits(p, exclude));
  }

  maxX(p: PlayerId, cost: string, exclude?: Obj): number {
    let x = 0;
    while (x < 30 && this.canPay(p, cost, x + 1, exclude)) x++;
    return x;
  }

  private pay(p: PlayerId, cost: string, x: number, exclude?: Obj): boolean {
    const units = this.manaUnits(p, exclude);
    const pay = findPayment(cost, x, units);
    if (!pay) return false;
    const pl = this.players[p];
    const leftovers: string[] = [];
    // 使った浮きマナを消す
    const poolUsed = [...pay.usedUnits].filter((i) => units[i].tapGroup.startsWith("pool")).map((i) => Number(units[i].tapGroup.slice(4)));
    pl.pool = pl.pool.filter((_, i) => !poolUsed.includes(i));
    for (const g of pay.usedGroups) {
      if (g.startsWith("m")) {
        const o = pl.mana.find((m) => m.uid === Number(g.slice(1)));
        if (o) o.tapped = true;
      } else if (g.startsWith("b")) {
        const o = pl.battlefield.find((m) => m.uid === Number(g.slice(1)));
        if (o) o.tapped = true;
        // 一度に複数出す能力の余りは浮かせる
        units.forEach((u, i) => {
          if (u.tapGroup === g && !pay.usedUnits.has(i)) leftovers.push(u.options[0]);
        });
      }
    }
    pl.pool.push(...leftovers);
    return true;
  }

  private emptyPools() {
    for (const p of this.players) p.pool = [];
  }

  // ------------------------------------------------------------ 行動の候補
  private isMain() {
    return this.step === "main1" || this.step === "main2";
  }

  private sorcerySpeed(p: PlayerId) {
    return p === this.active && this.isMain() && this.stack.length === 0;
  }

  /** 実際に払うコスト(共鳴・コスト軽減・零式を反映) */
  effectiveCost(p: PlayerId, o: Obj, from: CastFrom): string | null {
    const c = o.card;
    let cost = c.cost;
    if (from === "mana") {
      if (o.faceDown) return null;
      const rel = releaseAbility(c);
      if (!rel) return null;
      cost = rel.cost;
    } else if (from === "graveyard") {
      const fb = abilityOf(c, "flashback");
      if (!fb) return null;
      cost = fb.cost;
    } else if (from === "dash") {
      const d = abilityOf(c, "dash");
      if (!d) return null;
      cost = d.cost;
    } else {
      const free = abilityOf(c, "free");
      if (free && this.cond(free.if, p)) return "";
    }
    let discount = 0;
    const aff = abilityOf(c, "affinity");
    if (aff) discount += this.players[p].battlefield.filter((x) => matchFilter(x.card, aff.filter, this.colorsOf(x))).length;
    if (abilityOf(c, "voidAffinity")) discount += this.players[p].mana.filter((x) => x.faceDown).length;
    for (const src of this.sources(p))
      for (const a of this.activeAbilities(src))
        if (a.a === "static" && a.st.s === "discount" && matchFilter(c, a.st.filter) && (!a.if || this.cond(a.if, p))) discount += a.st.n;
    return reduceGeneric(cost, discount);
  }

  /** 唱えられるか(コストと対象の有無とタイミング) */
  canCast(p: PlayerId, o: Obj, from: CastFrom): boolean {
    const c = o.card;
    const instantSpeed = isInstantCard(c) || hasPrintedKw(c, "瞬速");
    if (!instantSpeed && !this.sorcerySpeed(p)) return false;
    const cost = this.effectiveCost(p, o, from);
    if (cost === null) return false;
    if (!this.canPay(p, cost, 0, from === "mana" ? o : undefined)) return false;
    const sp = spellAbility(c);
    if (sp?.modes) {
      if (!sp.modes.some((m) => (m.targets ?? []).every((t) => this.targetOptions(t, p).length > 0))) return false;
    } else if (sp?.targets) for (const t of sp.targets) if (this.targetOptions(t, p).length === 0) return false;
    if (isAura(c) && this.targetOptions(AURA_TARGET, p).length === 0) return false;
    return true;
  }

  /** 生け贄コストに使えるクリーチャー */
  sacOptions(p: PlayerId, cost: ActivatedCost): Obj[] {
    if (!cost.sac) return [];
    return this.creatures(p).filter((x) => matchFilter(x.card, cost.sac, this.colorsOf(x)));
  }

  canActivate(p: PlayerId, o: Obj, index: number): boolean {
    const a = abilitiesOf(o.card)[index];
    if (!a || a.a !== "activated" || o.zone !== "battlefield" || o.controller !== p) return false;
    if (a.cost.tap && (o.tapped || (isCreatureCard(o.card) && o.sick))) return false;
    if (a.cost.sac && this.sacOptions(p, a.cost).length === 0) return false;
    if (a.cost.life && this.players[p].life <= a.cost.life) return false;
    if (a.cost.applause && (this.players[p].applause[a.cost.applause.cat] ?? 0) < a.cost.applause.n) return false;
    if (a.cost.mana && !this.canPay(p, a.cost.mana, 0, a.cost.tap ? o : undefined)) return false;
    if (a.targets) for (const t of a.targets) if (this.targetOptions(t, p).length === 0) return false;
    return true;
  }

  actionOptions(p: PlayerId): Action[] {
    const pl = this.players[p];
    const out: Action[] = [{ type: "pass" }];
    if (this.winner !== undefined) return out;
    if (this.sorcerySpeed(p) && pl.chargesUsed < this.chargesAllowed(p)) {
      for (const o of pl.hand) if (!o.generated) out.push({ type: "charge", uid: o.uid });
    }
    for (const o of pl.hand) if (this.canCast(p, o, "hand")) out.push({ type: "cast", uid: o.uid, from: "hand" });
    for (const o of pl.mana) if (!o.faceDown && releaseAbility(o.card) && this.canCast(p, o, "mana")) out.push({ type: "cast", uid: o.uid, from: "mana" });
    for (const o of pl.graveyard) if (abilityOf(o.card, "flashback") && this.canCast(p, o, "graveyard")) out.push({ type: "cast", uid: o.uid, from: "graveyard" });
    for (const o of pl.hand) if (abilityOf(o.card, "dash") && this.canCast(p, o, "dash")) out.push({ type: "cast", uid: o.uid, from: "dash" });
    for (const o of pl.hand) {
      const cy = abilityOf(o.card, "cycling");
      if (cy && this.canPay(p, cy.cost)) out.push({ type: "cycle", uid: o.uid });
    }
    if (this.sorcerySpeed(p))
      for (const o of pl.battlefield) {
        const eq = abilityOf(o.card, "equip");
        if (eq && this.creatures(p).some((c) => c.uid !== o.attachedTo) && this.canPay(p, eq.cost)) out.push({ type: "equip", uid: o.uid });
      }
    for (const o of pl.battlefield)
      abilitiesOf(o.card).forEach((a, i) => {
        if (a.a === "activated" && this.canActivate(p, o, i)) out.push({ type: "activate", uid: o.uid, index: i });
      });
    if (this.sorcerySpeed(p) && !pl.releasedThisTurn)
      for (const o of pl.extra) if (this.canRelease(p, o)) out.push({ type: "summon", uid: o.uid });
    if (this.sorcerySpeed(p)) for (const o of pl.extra) if (this.canEntrata(p, o)) out.push({ type: "summon", uid: o.uid, via: "entrata" });
    return out;
  }

  // ------------------------------------------------------------ 行動
  private async performAction(p: PlayerId, a: Action) {
    if (a.type === "charge") {
      const o = this.players[p].hand.find((x) => x.uid === a.uid);
      if (!o || !this.sorcerySpeed(p) || this.players[p].chargesUsed >= this.chargesAllowed(p)) return;
      this.players[p].chargesUsed++;
      if (abilitiesOf(o.card).some((ab) => ab.a === "trigger" && ab.on === "charge")) this.usedCards.add(o.card.id);
      this.addLog(`${o.card.name}をチャージした`, p);
      this.putIntoMana(o, p);
    } else if (a.type === "cast") {
      const pl = this.players[p];
      const zone = a.from === "hand" || a.from === "dash" ? pl.hand : a.from === "mana" ? pl.mana : pl.graveyard;
      const o = zone.find((x) => x.uid === a.uid);
      if (o && this.canCast(p, o, a.from)) await this.cast(p, o, a.from);
    } else if (a.type === "summon") {
      if (a.via === "entrata") this.entrata(p, a.uid);
      else await this.releaseSummon(p, a.uid);
    } else if (a.type === "cycle") {
      const o = this.players[p].hand.find((x) => x.uid === a.uid);
      const cy = o && abilityOf(o.card, "cycling");
      if (!o || !cy || !this.pay(p, cy.cost, 0)) return;
      this.usedCards.add(o.card.id);
      this.move(o, "graveyard");
      this.addLog(`${o.card.name}を循環した`, p);
      this.draw(p, 1);
    } else if (a.type === "equip") {
      const o = this.players[p].battlefield.find((x) => x.uid === a.uid);
      const eq = o && abilityOf(o.card, "equip");
      if (!o || !eq || !this.sorcerySpeed(p)) return;
      const spec: TargetSpec = { t: "creature", who: "you" };
      const opts = this.targetOptions(spec, p).filter((r) => r.kind === "obj" && r.uid !== o.attachedTo);
      if (!opts.length || !this.canPay(p, eq.cost)) return;
      const pick =
        opts.length === 1
          ? opts[0]
          : await this.ask<TargetRef>(p, { kind: "target", prompt: `${o.card.name}を装備するクリーチャーを選んでください`, spec, options: opts, source: o, effects: [], index: 0 });
      const target = opts.find((r) => JSON.stringify(r) === JSON.stringify(pick)) ?? opts[0];
      if (!this.pay(p, eq.cost, 0)) return;
      this.usedCards.add(o.card.id);
      o.attachedTo = (target as { uid: number }).uid;
      this.addLog(`${o.card.name}を${this.describeRef(target)}に装備した`, p);
    } else if (a.type === "activate") {
      const o = this.players[p].battlefield.find((x) => x.uid === a.uid);
      if (o && this.canActivate(p, o, a.index)) await this.activate(p, o, a.index);
    }
  }

  /** マナゾーンに置く(チャージや効果)。チャージ時能力が誘発する */
  private putIntoMana(o: Obj, p: PlayerId, tapped?: boolean) {
    this.move(o, "mana", { tapped: tapped || undefined });
    // チャージ時の能力でマナゾーンに置かれたカードのチャージ時は誘発しない(連鎖しない)
    if (!this.inChargeTrigger)
      for (const ab of abilitiesOf(o.card)) {
        if (ab.a === "trigger" && ab.on === "charge") this.pendingTriggers.push({ obj: o, ability: ab, controller: p });
      }
    this.queueTriggers("manaEnter", this.sources(p));
  }

  private async cast(p: PlayerId, o: Obj, from: CastFrom) {
    const c = o.card;
    let cost = this.effectiveCost(p, o, from) ?? c.cost;
    const exclude = from === "mana" ? o : undefined;
    let x = 0;
    if (cost.includes("{X}")) {
      const max = this.maxX(p, cost, exclude);
      x = max === 0 ? 0 : await this.ask<number>(p, { kind: "number", prompt: `${c.name}:Xの値を決めてください`, min: 0, max });
      x = Math.max(0, Math.min(max, Math.floor(x)));
    }
    let sp = spellAbility(c);
    // モード呪文:使えるモードから1つ選ぶ
    if (sp?.modes) {
      const usable = sp.modes.filter((m) => (m.targets ?? []).every((t) => this.targetOptions(t, p).length > 0));
      if (!usable.length) return;
      const idx =
        usable.length === 1
          ? 0
          : await this.ask<number>(p, { kind: "mode", prompt: `${c.name}:モードを1つ選んでください`, options: usable.map((m) => m.label), source: o, modes: usable });
      const mode = usable[Math.max(0, Math.min(usable.length - 1, Math.floor(idx ?? 0)))];
      this.addLog(`${c.name}:「${mode.label}」を選んだ`, p);
      sp = { a: "spell", effects: mode.effects, ...(mode.targets ? { targets: mode.targets } : {}) };
    }
    const specs = isAura(c) ? [AURA_TARGET] : sp?.targets ?? [];
    const targets = await this.chooseTargets(p, specs, o, sp?.effects ?? []);
    if (!targets) return;
    let burnCount = 0;
    const b = burnAbility(c);
    const manaLeft = this.players[p].mana.filter((m) => m !== o).length;
    if (b && b.upTo) {
      const max = Math.min(b.n, manaLeft);
      if (max > 0) {
        const n = await this.ask<number>(p, { kind: "number", prompt: `${c.name}:烈燃 何枚燃焼しますか?(マナゾーンのカードを墓地に置く)`, min: 0, max, reason: "burn", obj: o });
        burnCount = Math.max(0, Math.min(max, Math.floor(n || 0)));
      }
    } else if (b && manaLeft >= b.n) {
      if (await this.askYesNo(p, `${c.name}:燃焼 ${b.n}(マナゾーンのカードを${b.n}枚墓地に置く)を行いますか?`, "burn", o)) burnCount = b.n;
    }
    const burned = burnCount > 0;
    let kicked = false;
    const k = abilityOf(c, "kicker");
    if (k && this.canPay(p, cost + k.cost, x, exclude)) {
      kicked = await this.askYesNo(p, `${c.name}:追加払い ${k.cost} を支払いますか?`, "kicker", o);
      if (kicked) cost = cost + k.cost;
    }
    if (!this.pay(p, cost, x, exclude)) return;
    if (burned) {
      const opts = this.players[p].mana.filter((m) => m !== o);
      const picked = await this.askCards(p, `燃焼:墓地に置くマナゾーンのカードを${burnCount}枚選んでください`, opts, burnCount, "burn");
      for (const m of picked) this.move(m, "graveyard");
    }
    this.move(o, "stack");
    this.usedCards.add(c.id);
    if (isInstantCard(c) || isSorceryCard(c)) {
      this.players[p].spellsThisTurn++;
      // 狂気:青か赤のインスタントかソーサリー
      if (cardColors(c.cost).some((x) => x === "U" || x === "R")) this.gainApplause(p, "狂気", 1, true);
    }
    // 「唱えたとき」(呪文より先に解決する。打ち消されても失われない)
    for (const ab of abilitiesOf(c)) if (ab.a === "trigger" && ab.on === "castSelf") this.pendingTriggers.push({ obj: o, ability: ab, controller: p });
    const item: StackItem = {
      id: this.stackId++,
      kind: "spell",
      obj: o,
      controller: p,
      ability: sp ?? null,
      targets,
      burned,
      burnCount,
      kicked,
      dashed: from === "dash",
      flashback: from === "graveyard",
      x,
    };
    this.stack.push(item);
    const tgt = targets.length ? `(対象:${targets.map((t) => this.describeRef(t)).join("、")})` : "";
    const how = from === "mana" ? "マナ解放で" : from === "graveyard" ? "再演で" : from === "dash" ? "疾駆で" : cost === "" && c.cost !== "" ? (abilityOf(c, "free") && this.cond(abilityOf(c, "free")!.if, p) ? "零式で" : "コスト0で") : "";
    this.addLog(`${c.name}を${how}唱えた${burned ? `(燃焼${burnCount}枚)` : ""}${kicked ? "(追加払い)" : ""}${x ? `(X=${x})` : ""}${tgt}`, p);
    for (const src of this.sources(p))
      for (const ab of this.activeAbilities(src)) {
        if (ab.a !== "trigger") continue;
        if (ab.on === "castSpell" && (isInstantCard(c) || isSorceryCard(c))) this.pendingTriggers.push({ obj: src, ability: ab, controller: p });
        if (ab.on === "cast" && matchFilter(c, ab.filter)) this.pendingTriggers.push({ obj: src, ability: ab, controller: p });
      }
  }

  private async activate(p: PlayerId, o: Obj, index: number) {
    const a = abilitiesOf(o.card)[index] as Extract<Ability, { a: "activated" }>;
    const targets = await this.chooseTargets(p, a.targets ?? [], o, a.effects);
    if (!targets) return;
    if (a.cost.mana && !this.pay(p, a.cost.mana, 0, a.cost.tap ? o : undefined)) return;
    if (a.cost.tap) o.tapped = true;
    if (a.cost.life) {
      this.players[p].life -= a.cost.life;
      this.addLog(`${a.cost.life}点のライフを支払った`, p);
    }
    if (a.cost.sac) {
      const [victim] = await this.askCards(p, "生け贄に捧げるクリーチャーを選んでください", this.sacOptions(p, a.cost), 1, "sacCost");
      if (victim) this.sacrifice(victim, p);
    }
    if (a.cost.sacSelf) this.sacrifice(o, p);
    if (a.cost.applause) this.spendApplause(p, a.cost.applause.cat, a.cost.applause.n);
    this.usedCards.add(o.card.id);
    this.stack.push({ id: this.stackId++, kind: "activated", obj: o, controller: p, ability: a, targets, burned: false, burnCount: 0, kicked: false, dashed: false, flashback: false, x: 0 });
    this.addLog(`${o.card.name}の能力を起動した`, p);
  }

  // ------------------------------------------------------------ 誘発
  private queueTriggers(on: TriggerEvent, objs: Obj[]) {
    for (const o of objs)
      for (const ab of this.activeAbilities(o)) if (ab.a === "trigger" && ab.on === on) this.pendingTriggers.push({ obj: o, ability: ab, controller: o.controller });
  }

  private async flushTriggers() {
    while (this.pendingTriggers.length) {
      // 手番のプレイヤーの誘発を先にスタックに置く(後に解決される)
      const list = this.pendingTriggers.splice(0);
      list.sort((a, b) => (a.controller === this.active ? 0 : 1) - (b.controller === this.active ? 0 : 1));
      for (const t of list) {
        const ab = t.ability;
        if (ab.if && !this.cond(ab.if, t.controller, t.obj.burned, t.obj.kicked)) continue;
        // 「1ターンに1回」の誘発
        if (ab.oncePerTurn) {
          const key = `${t.obj.uid}:${abilitiesOf(t.obj.card).indexOf(ab)}`;
          if (this.onceUsed.has(key)) continue;
          this.onceUsed.add(key);
        }
        // 燃焼・追加払いしたときだけの効果しかない誘発は、していなければ置かない
        if (ab.effects.every((e) => e.if === "burned") && !t.obj.burned) continue;
        if (ab.effects.every((e) => e.if === "kicked") && !t.obj.kicked) continue;
        const targets = await this.chooseTargets(t.controller, ab.targets ?? [], t.obj, ab.effects);
        if (!targets) continue;
        this.stack.push({
          id: this.stackId++,
          kind: "trigger",
          obj: t.obj,
          controller: t.controller,
          ability: ab,
          targets,
          burned: t.obj.burned,
          burnCount: t.obj.burnCount,
          kicked: t.obj.kicked,
          dashed: false,
          flashback: false,
          x: 0,
        });
      }
      this.update();
    }
  }

  // ------------------------------------------------------------ 解決
  private async resolveTop() {
    const item = this.stack[this.stack.length - 1];
    if (!item) return;
    const c = item.obj.card;
    if (item.kind === "spell") {
      this.stack.pop();
      if (isPermanentCard(c)) {
        if (isAura(c)) {
          const t = item.targets[0];
          if (!t || !this.stillLegal(t, AURA_TARGET, item.controller)) {
            this.addLog(`${c.name}は対象がいなくなり、墓地に置かれた`, item.controller);
            this.move(item.obj, "graveyard");
            return;
          }
          this.move(item.obj, "battlefield", { controller: item.controller });
          item.obj.attachedTo = (t as { uid: number }).uid;
          this.addLog(`${c.name}が${this.describeRef(t)}につけられた`, item.controller);
          this.entered(item.obj);
          return;
        }
        this.enterBattlefield(item.obj, item.controller, item.burned, item.x, item.kicked, item.burnCount, item.dashed);
        return;
      }
      await this.runAbility(item);
      if (item.obj.zone === "stack") this.move(item.obj, item.flashback ? "exile" : "graveyard");
      return;
    }
    this.stack.pop();
    await this.runAbility(item);
  }

  private enterBattlefield(o: Obj, controller: PlayerId, burned = false, x = 0, kicked = false, burnCount = 0, dashed = false) {
    this.move(o, "battlefield", { controller });
    o.sick = true;
    o.burned = burned;
    o.burnCount = burnCount;
    o.kicked = kicked;
    o.dashed = dashed;
    if (dashed) o.perm.push({ p: 0, t: 0, kw: ["速攻"] });
    o.x = x;
    this.addLog(`${o.card.name}が戦場に出た`, controller);
    this.entered(o);
  }

  /** 戦場に出たときの誘発(自身と、他のパーマネントの「〜が出るたび」) */
  private entered(o: Obj) {
    this.queueTriggers("etb", [o]);
    for (const src of this.sources(o.controller)) {
      if (src === o) continue;
      for (const ab of this.activeAbilities(src))
        if (ab.a === "trigger" && ab.on === "allyEnter" && matchFilter(o.card, ab.filter, this.colorsOf(o)))
          this.pendingTriggers.push({ obj: src, ability: ab, controller: src.controller });
    }
  }

  /** ライフを得る(ライフを得たときの誘発つき) */
  gainLife(p: PlayerId, n: number) {
    if (n <= 0) return;
    this.players[p].life += n;
    this.queueTriggers("lifeGain", this.sources(p));
  }

  /** チャージ時の能力を解決している最中か(その能力でマナゾーンに置かれたカードのチャージ時は誘発しない) */
  /** このターンに使った「1ターンに1回」の誘発 */
  private onceUsed = new Set<string>();

  private inChargeTrigger = false;

  private async runAbility(item: StackItem) {
    const ab = item.ability;
    if (!ab || !("effects" in ab)) return;
    if (ab.a === "trigger" && ab.on === "charge") {
      this.inChargeTrigger = true;
      try {
        await this.runAbilityBody(item, ab);
      } finally {
        this.inChargeTrigger = false;
      }
      return;
    }
    await this.runAbilityBody(item, ab);
  }

  private async runAbilityBody(item: StackItem, ab: Extract<Ability, { effects: Effect[] }>) {
    const specs = "targets" in ab && ab.targets ? ab.targets : [];
    const legal = item.targets.map((t, i) => this.stillLegal(t, specs[i], item.controller));
    if (specs.length && legal.every((l) => !l)) {
      this.addLog(`${item.obj.card.name}は対象が不正になり、効果を発揮しなかった`, item.controller);
      return;
    }
    if (ab.a === "trigger" && ab.if && !this.cond(ab.if, item.controller, item.burned, item.kicked)) return;
    await this.runEffects(ab.effects, { item, legal });
  }

  private amount(n: Amount, ctx: Ctx): number {
    return this.count(n, ctx.item.controller, ctx.item.x, ctx.item.burnCount);
  }

  private ref(ctx: Ctx, i: number | undefined): TargetRef | null {
    if (i === undefined) return null;
    if (!ctx.legal[i]) return null;
    return ctx.item.targets[i] ?? null;
  }

  private refObj(ctx: Ctx, i: number | undefined): Obj | null {
    const r = this.ref(ctx, i);
    if (!r || r.kind !== "obj") return null;
    return this.find(r.uid) ?? null;
  }

  private async runEffects(effects: Effect[], ctx: Ctx) {
    for (const e of effects) {
      const p = ctx.item.controller;
      if (e.if && !this.cond(e.if, p, ctx.item.burned, ctx.item.kicked)) continue;
      if (e.unless && this.cond(e.unless, p, ctx.item.burned, ctx.item.kicked)) continue;
      if (e.may) {
        if (!(await this.mayApply(e, ctx))) continue;
        const ok = await this.askYesNo(p, `${ctx.item.obj.card.name}:${effectSummary(e)}を行いますか?`, "may", ctx.item.obj);
        if (!ok) continue;
      }
      await this.runEffect(e, ctx);
      this.checkState();
    }
  }

  /** 「してもよい」の効果が実行できる状況か */
  private async mayApply(e: Effect, ctx: Ctx): Promise<boolean> {
    if ("tg" in e && typeof e.tg === "number") return !!this.ref(ctx, e.tg);
    return true;
  }

  private dealDamage(source: Obj | null, target: TargetRef | Obj, n: number, combat = false) {
    if (n <= 0) return;
    const srcName = source?.card.name ?? "";
    if ("uid" in target && "card" in target) {
      const o = target;
      if (o.zone !== "battlefield") return;
      o.damage += n;
      if (source && this.hasKw(source, "接死")) o.deathtouched = true;
    } else if (target.kind === "player") {
      this.players[target.id].life -= n;
      if (!combat) this.addLog(`${srcName}が${this.players[target.id].name}に${n}点のダメージ`, source?.controller ?? null);
    } else if (target.kind === "obj") {
      const o = this.find(target.uid);
      if (o) this.dealDamage(source, o, n, combat);
      return;
    }
    if (source && source.zone === "battlefield" && this.hasKw(source, "絆魂")) this.gainLife(source.controller, n);
    if (source && source.zone === "battlefield" && isCreatureCard(source.card) && this.hasKw(source, "吸血")) source.counters += 1;
  }

  private destroy(o: Obj) {
    if (o.zone !== "battlefield") return;
    if (this.hasKw(o, "破壊不能")) {
      this.addLog(`${o.card.name}は破壊されなかった(破壊不能)`, o.controller);
      return;
    }
    this.die(o);
  }

  /** 生け贄に捧げる(「生け贄に捧げるたび」が誘発する) */
  private sacrifice(o: Obj, p: PlayerId) {
    if (o.zone !== "battlefield") return;
    this.addLog(`${o.card.name}を生け贄に捧げた`, p);
    // 悲劇:生け贄に捧げるか、トークンでないクリーチャーが死亡するたび(クリーチャーは die の側で数える)
    // 悲劇は黒か赤のものだけ
    if ((!isCreatureCard(o.card) || o.token) && this.colorsOf(o).some((x) => x === "B" || x === "R")) this.gainApplause(p, "悲劇", 1, true);
    const card = o.card;
    const colors = this.colorsOf(o);
    for (const src of this.sources(p))
      for (const ab of this.activeAbilities(src))
        if (ab.a === "trigger" && ab.on === "sacrifice" && src !== o && matchFilter(card, ab.filter, colors))
          this.pendingTriggers.push({ obj: src, ability: ab, controller: p });
    this.die(o);
  }

  // ------------------------------------------------------------ リリース召喚(秘蔵庫)
  /** リリースに使えるカードと、そのとき数えるマナ総量(奉納を足す) */
  releaseFodder(p: PlayerId, target: Obj): { o: Obj; value: number }[] {
    const subs = (target.card.subtype ?? "").split("・");
    // 素材にできるもの:カードごとの指定(なければエンチャント)。奉納を持つものはいつでも使える
    const from = releaseOf(target.card)?.from ?? [{ type: "エンチャント" }];
    return this.players[p].battlefield
      .filter((o) => !o.token && (!!offeringOf(o.card) || from.some((f) => matchFilter(o.card, f, this.colorsOf(o)))))
      .map((o) => {
        const off = offeringOf(o.card);
        const bonus = off && (!off.sub || subs.includes(off.sub)) ? off.n : 0;
        return { o, value: manaValue(o.card.cost) + bonus };
      });
  }

  canRelease(p: PlayerId, o: Obj): boolean {
    const r = releaseOf(o.card);
    if (!r || o.zone !== "extra") return false;
    return this.releaseFodder(p, o).reduce((s, x) => s + x.value, 0) >= r.n;
  }

  private async releaseSummon(p: PlayerId, uid: number) {
    const pl = this.players[p];
    const o = pl.extra.find((x) => x.uid === uid);
    if (!o || !this.sorcerySpeed(p) || pl.releasedThisTurn || !this.canRelease(p, o)) return;
    const r = releaseOf(o.card)!;
    const fodder = this.releaseFodder(p, o);
    const ans = await this.ask<number[]>(p, {
      kind: "chooseSum",
      prompt: `${o.card.name}をリリース召喚します。リリースするカードを、マナ総量の合計が${r.n}以上になるように選んでください`,
      options: fodder.map((x) => x.o.uid),
      values: fodder.map((x) => x.value),
      min: r.n,
      target: o,
    });
    let picked = fodder.filter((x) => (ans ?? []).includes(x.o.uid));
    // 足りなければ、価値の低い順に補う(不正な答えへの備え)
    if (picked.reduce((s, x) => s + x.value, 0) < r.n)
      for (const x of [...fodder].sort((a, b) => a.value - b.value)) {
        if (picked.reduce((s, y) => s + y.value, 0) >= r.n) break;
        if (!picked.includes(x)) picked.push(x);
      }
    pl.releasedThisTurn = true;
    this.addLog(`${picked.map((x) => x.o.card.name).join("、")}をリリースし、${o.card.name}をリリース召喚した`, p);
    for (const x of picked) this.sacrifice(x.o, p);
    this.usedCards.add(o.card.id);
    this.enterBattlefield(o, p);
  }

  // ------------------------------------------------------------ 喝采とエントラータ(第9.5弾)
  /** 喝采を増やす。capped なら行動で溜まる分として1ターンの上限を守る。デッキに関係のないカテゴリーは溜まらない */
  gainApplause(p: PlayerId, cat: Applause, n: number, capped: boolean) {
    const pl = this.players[p];
    if (pl.applause[cat] === undefined || n <= 0) return;
    let add = n;
    if (capped) {
      add = Math.min(n, APPLAUSE_CAP[cat] - (pl.applauseThisTurn[cat] ?? 0));
      if (add <= 0) return;
      pl.applauseThisTurn[cat] = (pl.applauseThisTurn[cat] ?? 0) + add;
    }
    pl.applause[cat] = (pl.applause[cat] ?? 0) + add;
    this.addLog(`喝采【${cat}】+${add}(${pl.applause[cat]})`, p);
  }

  private spendApplause(p: PlayerId, cat: Applause, n: number) {
    const pl = this.players[p];
    pl.applause[cat] = Math.max(0, (pl.applause[cat] ?? 0) - n);
  }

  canEntrata(p: PlayerId, o: Obj): boolean {
    const en = entrataOf(o.card);
    const pl = this.players[p];
    return !!en && o.zone === "extra" && !pl.enteredThisTurn.has(o.uid) && (pl.applause[en.cat] ?? 0) >= en.n;
  }

  private entrata(p: PlayerId, uid: number) {
    const pl = this.players[p];
    const o = pl.extra.find((x) => x.uid === uid);
    if (!o || !this.sorcerySpeed(p) || !this.canEntrata(p, o)) return;
    const en = entrataOf(o.card)!;
    this.spendApplause(p, en.cat, en.n);
    pl.enteredThisTurn.add(o.uid);
    this.addLog(`喝采【${en.cat}】を${en.n}消費し、${o.card.name}がエントラータ(登場)した`, p);
    this.usedCards.add(o.card.id);
    this.enterBattlefield(o, p);
  }

  /** 戦場から墓地へ(死亡) */
  private die(o: Obj) {
    if (o.zone !== "battlefield") return;
    const controller = o.controller;
    const wasCreature = isCreatureCard(o.card);
    const dyingAbilities = abilitiesOf(o.card).filter((a) => !isCrestAbility(a));
    const undying = wasCreature && !o.token && o.counters === 0 && this.hasKw(o, "不屈");
    const rinne = wasCreature && !o.token && this.hasKw(o, "輪廻");
    const tragic = wasCreature && !o.token && this.colorsOf(o).some((x) => x === "B" || x === "R");
    this.move(o, "graveyard");
    this.addLog(`${o.card.name}が墓地に置かれた`, controller);
    if (tragic) this.gainApplause(controller, "悲劇", 1, true);
    if (wasCreature) {
      for (const ab of dyingAbilities) if (ab.a === "trigger" && ab.on === "dies") this.pendingTriggers.push({ obj: o, ability: ab, controller });
      this.queueTriggers("allyDies", this.sources(controller));
    }
    if (undying && (o.zone as Zone) === "graveyard") {
      this.enterBattlefield(o, o.owner);
      o.counters = 1;
      this.addLog(`${o.card.name}が不屈で戻ってきた`, o.owner);
    } else if (rinne && (o.zone as Zone) === "graveyard") {
      this.putIntoMana(o, o.owner);
      this.addLog(`${o.card.name}が輪廻でマナゾーンに置かれた`, o.owner);
    }
  }

  private async runEffect(e: Effect, ctx: Ctx) {
    const p = ctx.item.controller;
    const opp = this.other(p);
    const src = ctx.item.obj;
    const pl = this.players[p];
    switch (e.do) {
      case "damage": {
        const n = this.amount(e.n, ctx);
        if (e.to === "opp") this.dealDamage(src, { kind: "player", id: opp }, n);
        else {
          const r = this.ref(ctx, e.tg);
          if (r) {
            this.dealDamage(src, r, n);
            if (r.kind === "obj") this.addLog(`${src.card.name}が${this.describeRef(r)}に${n}点のダメージ`, p);
          }
        }
        break;
      }
      case "damageAll": {
        const n = this.amount(e.n, ctx);
        const victims = e.who === "opp" ? this.creatures(opp) : [...this.creatures(0), ...this.creatures(1)];
        for (const o of victims) this.dealDamage(src, o, n);
        if (e.players) for (const id of (e.who === "opp" ? [opp] : [0, 1]) as PlayerId[]) this.dealDamage(src, { kind: "player", id }, n);
        this.addLog(`${src.card.name}が${e.who === "opp" ? "相手の" : "すべての"}クリーチャー${e.players ? "とプレイヤー" : ""}に${n}点のダメージ`, p);
        break;
      }
      case "destroy": {
        const o = this.refObj(ctx, e.tg);
        if (o) this.destroy(o);
        break;
      }
      case "destroyAll":
        for (const o of [...this.creatures(0), ...this.creatures(1)])
          if ((e.maxPower === undefined || this.power(o) <= e.maxPower) && matchFilter(o.card, e.filter, this.colorsOf(o))) this.destroy(o);
        break;
      case "exile": {
        const o = this.refObj(ctx, e.tg);
        if (o) {
          this.move(o, "exile");
          this.addLog(`${o.card.name}が追放された`, p);
        }
        break;
      }
      case "bounce": {
        const o = this.refObj(ctx, e.tg);
        if (o) {
          this.move(o, "hand");
          this.addLog(`${o.card.name}が手札に戻った`, p);
        }
        break;
      }
      case "bounceAll":
        for (const o of [...this.creatures(0), ...this.creatures(1)]) this.move(o, "hand");
        this.addLog("すべてのクリーチャーが手札に戻った", p);
        break;
      case "tuck": {
        const o = this.refObj(ctx, e.tg);
        if (o) {
          this.move(o, "library", { top: true });
          this.addLog(`${o.card.name}がライブラリーの一番上に置かれた`, p);
        }
        break;
      }
      case "tap": {
        const o = this.refObj(ctx, e.tg);
        if (o) {
          o.tapped = true;
          if (e.freeze) o.freeze = true;
          this.addLog(`${o.card.name}をタップした`, p);
        }
        break;
      }
      case "untap": {
        if (e.all) for (const o of this.creatures(p)) o.tapped = false;
        else {
          const o = this.refObj(ctx, e.tg);
          if (o) o.tapped = false;
        }
        this.addLog(e.all ? "自分のクリーチャーをすべてアンタップした" : "アンタップした", p);
        break;
      }
      case "tapAll":
        for (const o of this.creatures(opp)) o.tapped = true;
        this.addLog("相手のクリーチャーをすべてタップした", p);
        break;
      case "pump": {
        const o = e.self ? (src.zone === "battlefield" ? src : null) : this.refObj(ctx, e.tg);
        if (o) {
          const pp = this.amount(e.p, ctx);
          const tt = this.amount(e.t, ctx);
          o.temp.push({ p: pp, t: tt, kw: e.kw ?? [] });
          this.addLog(`${o.card.name}が${signed(pp)}/${signed(tt)}${e.kw?.length ? `と${e.kw.join("・")}` : ""}を得た`, p);
        }
        break;
      }
      case "pumpAll": {
        const targets = e.who === "all" ? [...this.creatures(0), ...this.creatures(1)] : this.creatures(p);
        for (const o of targets) if (matchFilter(o.card, e.filter, this.colorsOf(o))) o.temp.push({ p: e.p, t: e.t, kw: e.kw ?? [] });
        break;
      }
      case "buffSelf":
        if (src.zone === "battlefield") src.perm.push({ p: e.p, t: e.t, kw: e.kw ?? [] });
        break;
      case "counters": {
        const o = e.self ? (src.zone === "battlefield" ? src : null) : this.refObj(ctx, e.tg);
        if (o) o.counters += this.amount(e.n, ctx);
        break;
      }
      case "countersAll":
        for (const o of this.creatures(p)) if (matchFilter(o.card, e.filter, this.colorsOf(o))) o.counters += e.n;
        break;
      case "draw":
        this.draw(p, this.amount(e.n, ctx));
        break;
      case "discard": {
        const who = e.who === "opp" ? opp : p;
        const hand = this.players[who].hand;
        if (hand.length === 0) break;
        const picked = await this.askCards(who, `捨てるカードを${e.n}枚選んでください`, hand, e.n, "discard");
        for (const o of picked) {
          this.move(o, "graveyard");
          this.addLog(`${o.card.name}を捨てた`, who);
        }
        break;
      }
      case "gainLife": {
        const n = this.amount(e.n, ctx);
        this.gainLife(p, n);
        this.addLog(`${n}点のライフを得た`, p);
        break;
      }
      case "loseLife": {
        const who = e.who === "opp" ? opp : p;
        const n = this.amount(e.n, ctx);
        this.players[who].life -= n;
        this.addLog(`${this.players[who].name}は${n}点のライフを失った`, p);
        break;
      }
      case "token": {
        const pp = this.amount(e.p, ctx);
        const tt = this.amount(e.t, ctx);
        const count = this.amount(e.n, ctx);
        for (let i = 0; i < count; i++) {
          const card: Card = {
            id: `token-${e.sub}`,
            name: `${e.sub}トークン`,
            cost: "",
            type: e.artifact ? "アーティファクト・クリーチャー" : "クリーチャー",
            subtype: e.sub,
            power: pp,
            toughness: tt,
            rarity: "トークン",
            text: [...(e.kw?.length ? [e.kw.join("、")] : []), ...(e.spawn ? ["このクリーチャーを生け贄に捧げる:{C}を加える。"] : [])],
            abilities: [
              ...(e.kw ?? []).map((k) => ({ a: "kw" as const, kw: k })),
              ...(e.spawn ? [{ a: "activated" as const, cost: { sacSelf: true }, effects: [{ do: "addMana" as const, mana: "{C}" }] }] : []),
            ],
          };
          const o = this.newObj(card, p, "battlefield");
          o.token = true;
          o.tokenColors = e.color === "C" ? [] : [e.color];
          this.players[p].battlefield.push(o);
          o.sick = true;
          this.entered(o);
        }
        if (count > 0) this.addLog(`${pp}/${tt}の${e.sub}トークンを${count}体生成した`, p);
        break;
      }
      case "counter": {
        const r = this.ref(ctx, e.tg);
        if (r && r.kind === "stack") {
          const s = this.stack.find((x) => x.id === r.id);
          if (s) {
            this.stack = this.stack.filter((x) => x !== s);
            this.addLog(`${s.obj.card.name}が打ち消された`, p);
            if (s.kind === "spell") this.move(s.obj, s.flashback ? "exile" : "graveyard");
          }
        }
        break;
      }
      case "returnCard": {
        const o = this.refObj(ctx, e.tg);
        if (!o || o.zone !== "graveyard") break;
        if (e.to === "hand") {
          this.move(o, "hand");
          this.addLog(`${o.card.name}を墓地から手札に戻した`, p);
        } else if (e.to === "mana") {
          this.putIntoMana(o, p);
          this.addLog(`${o.card.name}を墓地からマナゾーンに置いた`, p);
        } else if (isPermanentCard(o.card) && !isAura(o.card)) {
          this.enterBattlefield(o, p);
        }
        break;
      }
      case "rampTop":
        for (let i = 0; i < e.n; i++) {
          const o = pl.library[0];
          if (!o) break;
          this.putIntoMana(o, p, e.tapped);
          this.addLog(`ライブラリーの一番上の${o.card.name}をマナゾーンに置いた`, p);
        }
        break;
      case "extraCharge":
        pl.extraChargesThisTurn += e.n;
        break;
      case "reclaim": {
        if (pl.mana.length === 0) break;
        if (e.then?.length) {
          const ok = await this.askYesNo(p, `${src.card.name}:還元(マナゾーンのカードを1枚手札に戻す)を行いますか?`, "reclaim", src);
          if (!ok) break;
        }
        const [o] = await this.askCards(p, "還元:手札に戻すマナゾーンのカードを選んでください", pl.mana, 1, "reclaim");
        this.move(o, "hand");
        this.addLog(`還元で${o.card.name}を手札に戻した`, p);
        if (e.then) await this.runEffects(e.then, ctx);
        break;
      }
      case "erode": {
        const zone = this.players[opp].mana;
        const picked = await this.askCards(p, `侵食:相手のマナゾーンから墓地に置くカードを${e.n}枚選んでください`, zone, Math.min(e.n, zone.length), "erode");
        for (const o of picked) {
          this.move(o, "graveyard");
          this.addLog(`侵食で${this.players[opp].name}の${o.card.name}を墓地に置いた`, p);
        }
        if (picked.length < e.n)
          this.addLog(`侵食 ${e.n}:${this.players[opp].name}のマナゾーンにカードが${picked.length}枚しかなかったので、あるだけ墓地に置いた`, p);
        break;
      }
      case "sacrifice": {
        const cs = this.creatures(opp);
        if (cs.length === 0) break;
        const [o] = await this.askCards(opp, "生け贄に捧げるクリーチャーを選んでください", cs, 1, "sacrifice");
        this.sacrifice(o, opp);
        break;
      }
      case "fight":
      case "bite": {
        const a = this.refObj(ctx, e.tg[0]);
        const b = this.refObj(ctx, e.tg[1]);
        if (!a || !b || a.zone !== "battlefield" || b.zone !== "battlefield") break;
        const pa = this.power(a);
        const pb = this.power(b);
        this.dealDamage(a, b, pa);
        if (e.do === "fight") this.dealDamage(b, a, pb);
        this.addLog(`${a.card.name}と${b.card.name}が${e.do === "fight" ? "格闘した" : "噛みついた"}`, p);
        break;
      }
      case "duel": {
        const a = e.self ? src : this.refObj(ctx, e.tg[0]);
        const b = this.refObj(ctx, e.self ? e.tg[0] : e.tg[1]);
        if (!a || !b || a.zone !== "battlefield" || b.zone !== "battlefield" || !isCreatureCard(a.card)) break;
        const lethal = (o: Obj) =>
          o.zone !== "battlefield" || ((o.damage >= this.toughness(o) || (o.deathtouched && o.damage > 0)) && !this.hasKw(o, "破壊不能"));
        // 決闘では、先制攻撃(二段攻撃)を持つ側だけが先にダメージを与える。それで倒れた側はダメージを返せない
        const first = (o: Obj) => this.hasKw(o, "先制攻撃") || this.hasKw(o, "二段攻撃");
        const pa = this.power(a);
        const pb = this.power(b);
        if (first(a) && !first(b)) {
          this.dealDamage(a, b, pa);
          if (!lethal(b)) this.dealDamage(b, a, pb);
        } else if (first(b) && !first(a)) {
          this.dealDamage(b, a, pb);
          if (!lethal(a)) this.dealDamage(a, b, pa);
        } else {
          this.dealDamage(a, b, pa);
          this.dealDamage(b, a, pb);
        }
        const won = lethal(b) && !lethal(a);
        this.addLog(`${a.card.name}が${b.card.name}と決闘した${won ? "(勝利)" : ""}`, p);
        if (won) {
          await this.runEffects(e.win ?? [], ctx);
          this.queueTriggers("duelWin", this.sources(p));
        }
        break;
      }
      case "lookTop": {
        const top = pl.library[0];
        if (!top) break;
        const bottom = await this.askYesNo(p, `ライブラリーの一番上は「${top.card.name}」です。一番下に置きますか?`, "lookTop", top);
        if (bottom) {
          pl.library.shift();
          pl.library.push(top);
          this.addLog("ライブラリーの一番上のカードを一番下に置いた", p);
        }
        break;
      }
      case "addMana":
        for (const m of parseCost(e.mana)) pl.pool.push(m.kind === "color" ? m.c : "C");
        this.addLog(`${e.mana}を加えた`, p);
        break;
      case "tutor": {
        const found = pl.library.filter((o) => matchFilter(o.card, e.filter));
        if (found.length) {
          // 同じ名前は1つにまとめて選ばせる
          const unique = found.filter((o, i) => found.findIndex((x) => x.card.name === o.card.name) === i);
          const [o] = await this.askCards(p, "ライブラリーから探すカードを選んでください", unique, 1, "tutor");
          if (e.to === "hand") {
            this.move(o, "hand");
            this.addLog(`ライブラリーから${o.card.name}を手札に加えた`, p);
          } else if (e.to === "mana") {
            this.putIntoMana(o, p);
            this.addLog(`ライブラリーから${o.card.name}をマナゾーンに置いた`, p);
          } else {
            this.enterBattlefield(o, p);
          }
        } else this.addLog("ライブラリーに当てはまるカードがなかった", p);
        this.shuffle(pl.library);
        break;
      }
      case "manifest": {
        const opts = pl.mana.filter((o) => !o.faceDown && isCreatureCard(o.card) && manaValue(o.card.cost) <= e.maxMV);
        if (!opts.length) {
          this.addLog("顕現:マナゾーンに出せるクリーチャーがなかった", p);
          break;
        }
        const [o] = await this.askCards(p, `顕現:マナゾーンから戦場に出すクリーチャー(マナ総量${e.maxMV}以下)を選んでください`, opts, 1, "tutor");
        this.addLog(`顕現で${o.card.name}をマナゾーンから戦場に出した`, p);
        this.enterBattlefield(o, p);
        if (e.haste) o.temp.push({ p: 0, t: 0, kw: ["速攻"] });
        break;
      }
      case "plunder": {
        const zone = this.players[opp].mana;
        const picked = await this.askCards(p, `略奪:相手のマナゾーンから奪うカードを${e.n}枚選んでください`, zone, Math.min(e.n, zone.length), "erode");
        const names: string[] = [];
        for (const o of picked) {
          names.push(o.faceDown ? "裏向きのカード" : o.card.name);
          zone.splice(zone.indexOf(o), 1);
          o.owner = p;
          o.controller = p;
          // 裏向きにして置く(チャージ時の能力は誘発しない)
          this.move(o, "mana", { tapped: true });
          o.faceDown = true;
        }
        // 何枚奪ったかが分かるように、1行にまとめて書く
        if (picked.length)
          this.addLog(`略奪 ${e.n}:${this.players[opp].name}のマナゾーンから${picked.length}枚(${names.join("、")})を奪い、裏向きで自分のマナゾーンに置いた`, p);
        if (picked.length) this.queueTriggers("manaEnter", this.sources(p));
        // 相手のマナゾーンのカードが足りないときは、選ばずにあるだけ奪う。そのことをログに残す
        if (zone.length === 0 && picked.length < e.n)
          this.addLog(
            picked.length === 0
              ? `略奪 ${e.n}:${this.players[opp].name}のマナゾーンにカードがなかったので、何も奪えなかった`
              : `略奪 ${e.n}:${this.players[opp].name}のマナゾーンにカードが${picked.length}枚しかなかったので、選ばずに${picked.length}枚すべてを奪った`,
            p,
          );
        break;
      }
      case "applause":
        this.gainApplause(p, e.cat, e.n, false);
        break;
      case "create": {
        for (let i = 0; i < e.n; i++) {
          const o = this.newObj(e.card as Card, p, "hand");
          o.generated = true;
          pl.hand.push(o);
        }
        this.addLog(`《${e.card.name}》を${e.n}枚手札に加えた(生成)`, p);
        break;
      }
      case "ingest": {
        const lib = this.players[opp].library;
        const taken: Obj[] = [];
        for (let i = 0; i < e.n && lib.length; i++) {
          const o = lib[0];
          lib.shift();
          o.owner = p;
          o.controller = p;
          this.move(o, "mana", { tapped: true });
          o.faceDown = true;
          taken.push(o);
        }
        if (taken.length) {
          this.addLog(`嚥下 ${e.n}:${this.players[opp].name}のライブラリーの上から${taken.length}枚を裏向きで自分のマナゾーンに置いた`, p);
          this.queueTriggers("manaEnter", this.sources(p));
        }
        break;
      }
      case "veilOpp": {
        let cands = this.players[opp].mana.filter((o) => !o.faceDown);
        if (e.crest) cands = cands.filter(crestActive);
        const picked = e.all ? cands : await this.askCards(p, `裏向きにする相手のマナゾーンのカードを${e.n}枚選んでください`, cands, Math.min(e.n, cands.length), "erode");
        for (const o of picked) o.faceDown = true;
        if (picked.length) this.addLog(`${this.players[opp].name}のマナゾーンの${picked.length}枚を裏向きにした`, p);
        break;
      }
      case "shuffleGraveyard": {
        const owner = this.players[src.owner];
        const n = owner.graveyard.length;
        for (const o of [...owner.graveyard]) this.move(o, "library");
        this.shuffle(owner.library);
        this.addLog(`${owner.name}の墓地のカード${n}枚をライブラリーに加えて切り直した`, src.owner);
        break;
      }
      case "veil": {
        // 自分のマナゾーンをN枚、続いて相手のマナゾーンをN枚裏向きにする(どちらも自分が選ぶ)
        const faceUp = pl.mana.filter((o) => !o.faceDown);
        const picked = await this.askCards(p, `虚化:裏向きにする自分のマナゾーンのカードを${e.n}枚選んでください`, faceUp, Math.min(e.n, faceUp.length), "veil");
        for (const o of picked) o.faceDown = true;
        if (picked.length) this.addLog(`虚化で自分の${picked.map((o) => o.card.name).join("、")}を裏向きにした`, p);
        const theirs = this.players[opp].mana.filter((o) => !o.faceDown);
        const pickedOpp = await this.askCards(p, `虚化:裏向きにする相手のマナゾーンのカードを${e.n}枚選んでください`, theirs, Math.min(e.n, theirs.length), "erode");
        for (const o of pickedOpp) o.faceDown = true;
        if (pickedOpp.length) this.addLog(`虚化で${this.players[opp].name}の${pickedOpp.map((o) => o.card.name).join("、")}を裏向きにした`, p);
        break;
      }
      case "mill": {
        const who = e.who === "opp" ? opp : p;
        const lib = this.players[who].library;
        const n = Math.min(this.amount(e.n, ctx), lib.length);
        for (let i = 0; i < n; i++) this.move(lib[0], "graveyard");
        this.addLog(`${this.players[who].name}のライブラリーの上から${n}枚を墓地に置いた`, p);
        break;
      }
    }
  }

  draw(p: PlayerId, n: number) {
    const pl = this.players[p];
    for (let i = 0; i < n; i++) {
      const o = pl.library[0];
      if (!o) {
        pl.drewFromEmpty = true;
        return;
      }
      this.move(o, "hand");
    }
  }

  // ------------------------------------------------------------ 状況起因処理
  checkState() {
    for (let guard = 0; guard < 20; guard++) {
      let changed = false;
      for (const p of this.players) {
        for (const o of [...p.battlefield]) {
          if (!isCreatureCard(o.card)) continue;
          const lethal = o.damage >= this.toughness(o) || (o.deathtouched && o.damage > 0);
          if (this.toughness(o) <= 0 || (lethal && !this.hasKw(o, "破壊不能"))) {
            this.die(o);
            changed = true;
          }
        }
      }
      for (const p of this.players) {
        for (const o of [...p.battlefield]) {
          if (o.attachedTo !== null) {
            const host = this.find(o.attachedTo);
            if (!host || host.zone !== "battlefield") {
              if (isEquipment(o.card)) o.attachedTo = null;
              else this.move(o, "graveyard");
              changed = true;
            }
          } else if (isAura(o.card)) {
            this.move(o, "graveyard");
            changed = true;
          }
        }
      }
      if (!changed) break;
    }
    const lost = this.players.map((p) => p.life <= 0 || p.drewFromEmpty);
    if (lost[0] || lost[1]) {
      this.winner = lost[0] && lost[1] ? null : lost[0] ? 1 : 0;
      this.addLog(this.winner === null ? "引き分け" : `${this.players[this.winner].name}の勝ち`);
      throw new GameOver(this.winner);
    }
    this.update();
  }

  // ------------------------------------------------------------ 優先権
  private async priorityStep() {
    for (;;) {
      await this.flushTriggers();
      this.checkState();
      let p = this.active;
      let passes = 0;
      while (passes < 2) {
        // 相手のメインフェイズでスタックが空のときは、相手に優先権を渡さない(簡略化)
        if (p !== this.active && this.isMain() && this.stack.length === 0) {
          passes++;
          p = this.other(p);
          continue;
        }
        const options = this.actionOptions(p);
        const mustAsk = options.length > 1 || (p === this.active && this.isMain() && this.stack.length === 0);
        if (!mustAsk) {
          passes++;
          p = this.other(p);
          continue;
        }
        const a = await this.ask<Action>(p, { kind: "action", options });
        if (!a || a.type === "pass") {
          passes++;
          p = this.other(p);
          continue;
        }
        await this.performAction(p, a);
        await this.flushTriggers();
        this.checkState();
        passes = 0;
      }
      if (this.stack.length === 0) break;
      await this.resolveTop();
      this.checkState();
    }
    this.emptyPools();
  }

  // ------------------------------------------------------------ 戦闘
  private async combatPhase() {
    const p = this.active;
    const d = this.other(p);
    const candidates = this.creatures(p).filter((o) => this.canAttack(o));
    if (candidates.length === 0) return;
    this.step = "attack";
    this.update();
    const chosen = await this.ask<number[]>(p, { kind: "attackers", options: candidates.map((o) => o.uid) });
    const attackers = candidates.filter((o) => chosen?.includes(o.uid));
    if (attackers.length === 0) return;
    for (const o of attackers) if (!this.hasKw(o, "警戒")) o.tapped = true;
    this.combat = { attackers: attackers.map((o) => o.uid), blocks: {} };
    this.players[p].attackersThisTurn = Math.max(this.players[p].attackersThisTurn, attackers.length);
    // 喜劇:赤か白のクリーチャー2体以上で攻撃したとき
    const comic = attackers.filter((o) => this.colorsOf(o).some((x) => x === "R" || x === "W")).length;
    if (comic >= 2) this.gainApplause(p, "喜劇", comic >= 3 ? 2 : 1, true);
    this.addLog(`${attackers.map((o) => o.card.name).join("、")}で攻撃した`, p);
    this.queueTriggers("attacks", attackers);
    await this.priorityStep();

    // ブロック
    this.step = "block";
    const alive = () => this.combat!.attackers.map((u) => this.find(u)).filter((o): o is Obj => !!o && o.zone === "battlefield");
    const blockers = this.creatures(d).filter((b) => alive().some((a) => this.canBlock(b, a)));
    if (blockers.length > 0 && alive().length > 0) {
      const ans = await this.ask<BlockAnswer>(d, { kind: "blockers", attackers: alive().map((o) => o.uid), blockers: blockers.map((o) => o.uid) });
      this.combat.blocks = this.validateBlocks(ans ?? {}, alive(), blockers);
      const desc = Object.entries(this.combat.blocks)
        .filter(([, bs]) => bs.length)
        .map(([a, bs]) => `${this.find(Number(a))?.card.name}を${bs.map((b) => this.find(b)?.card.name).join("と")}`)
        .join("、");
      if (desc) this.addLog(`${desc}でブロックした`, d);
    }
    await this.priorityStep();

    // ダメージ
    this.step = "damage";
    const anyFirst = [...alive(), ...this.blockersInCombat()].some((o) => this.hasKw(o, "先制攻撃") || this.hasKw(o, "二段攻撃"));
    if (anyFirst) {
      this.combatDamage(true);
      this.checkState();
    }
    this.combatDamage(false);
    this.checkState();
    await this.priorityStep();
    this.combat = null;
  }

  private blockersInCombat(): Obj[] {
    if (!this.combat) return [];
    return Object.values(this.combat.blocks)
      .flat()
      .map((u) => this.find(u))
      .filter((o): o is Obj => !!o && o.zone === "battlefield");
  }

  /** この攻撃クリーチャーをブロックするのに必要な体数(威迫2、大威迫3) */
  minBlockers(a: Obj): number {
    return this.hasKw(a, "大威迫") ? 3 : this.hasKw(a, "威迫") ? 2 : 1;
  }

  private validateBlocks(ans: BlockAnswer, attackers: Obj[], blockers: Obj[]): BlockAnswer {
    const out: BlockAnswer = {};
    const used = new Set<number>();
    for (const a of attackers) {
      const bs = (ans[a.uid] ?? [])
        .map((u) => blockers.find((b) => b.uid === u))
        .filter((b, i, arr): b is Obj => !!b && arr.indexOf(b) === i && (!used.has(b.uid) || this.hasKw(b, "鉄壁")) && this.canBlock(b, a));
      if (bs.length < this.minBlockers(a)) continue;
      if (bs.length) {
        out[a.uid] = bs.map((b) => b.uid);
        bs.forEach((b) => used.add(b.uid));
      }
    }
    return out;
  }

  private combatDamage(firstStrikeStep: boolean | null) {
    if (!this.combat) return;
    const p = this.active;
    const d = this.other(p);
    const dealsNow = (o: Obj) => {
      const fs = this.hasKw(o, "先制攻撃");
      const ds = this.hasKw(o, "二段攻撃");
      return firstStrikeStep ? fs || ds : !fs || ds || firstStrikeStep === null;
    };
    const hits: { src: Obj; to: Obj | PlayerId; n: number }[] = [];
    for (const uid of this.combat.attackers) {
      const a = this.find(uid);
      if (!a || a.zone !== "battlefield") continue;
      const blocked = uid in this.combat.blocks;
      const blockers = (this.combat.blocks[uid] ?? []).map((u) => this.find(u)).filter((o): o is Obj => !!o && o.zone === "battlefield");
      if (dealsNow(a)) {
        let remaining = this.power(a);
        if (!blocked) hits.push({ src: a, to: d, n: remaining });
        else if (blockers.length === 0) {
          if (this.hasKw(a, "トランプル")) hits.push({ src: a, to: d, n: remaining });
        } else {
          const trample = this.hasKw(a, "トランプル");
          const deathtouch = this.hasKw(a, "接死");
          blockers.forEach((b, i) => {
            if (remaining <= 0) return;
            const lethal = deathtouch ? 1 : Math.max(0, this.toughness(b) - b.damage);
            const isLast = i === blockers.length - 1;
            const n = isLast && !trample ? remaining : Math.min(remaining, lethal);
            if (n > 0) hits.push({ src: a, to: b, n });
            remaining -= n;
          });
          if (trample && remaining > 0) hits.push({ src: a, to: d, n: remaining });
        }
      }
      for (const b of blockers) if (dealsNow(b)) hits.push({ src: b, to: a, n: this.power(b) });
    }
    const toPlayer: Record<number, number> = {};
    for (const h of hits) {
      if (typeof h.to === "number") {
        this.dealDamage(h.src, { kind: "player", id: h.to as PlayerId }, h.n, true);
        toPlayer[h.to] = (toPlayer[h.to] ?? 0) + h.n;
      } else this.dealDamage(h.src, h.to, h.n, true);
    }
    for (const [id, n] of Object.entries(toPlayer)) if (n > 0) this.addLog(`${this.players[Number(id)].name}に${n}点の戦闘ダメージ`, p);
  }

  // ------------------------------------------------------------ ゲームの流れ
  async run(): Promise<PlayerId | null> {
    try {
      for (const p of this.players) this.shuffle(p.library);
      for (const id of [0, 1] as PlayerId[]) {
        this.draw(id, 6);
        const again = await this.askYesNo(id, "この手札で始めますか?「いいえ」で1回だけ引き直せます(引き直したら1枚をライブラリーの一番下に置く)", "mulligan");
        if (again === false) {
          const pl = this.players[id];
          for (const o of [...pl.hand]) this.move(o, "library");
          this.shuffle(pl.library);
          this.draw(id, 6);
          const [o] = await this.askCards(id, "ライブラリーの一番下に置くカードを1枚選んでください", pl.hand, 1, "bottom");
          this.move(o, "library");
          this.addLog("マリガンした", id);
        }
      }
      this.active = this.firstPlayer;
      this.addLog(`${this.players[this.active].name}が先攻`);
      for (;;) {
        await this.takeTurn();
      }
    } catch (e) {
      if (e instanceof GameOver) {
        this.update();
        return e.winner;
      }
      throw e;
    }
  }

  private async takeTurn() {
    this.turn++;
    if (this.turn > this.maxTurns) {
      this.winner = null;
      throw new GameOver(null);
    }
    const p = this.active;
    const pl = this.players[p];
    this.addLog(`― ${pl.name}のターン${Math.ceil(this.turn / 2)} ―`, p);
    // アンタップ
    this.step = "untap";
    for (const o of pl.battlefield) {
      if (o.freeze) o.freeze = false;
      else o.tapped = false;
      o.sick = false;
    }
    for (const o of pl.mana) o.tapped = false;
    pl.chargesUsed = 0;
    pl.extraChargesThisTurn = 0;
    for (const q of this.players) {
      q.lostThisTurn = 0;
      q.attackersThisTurn = 0;
      q.spellsThisTurn = 0;
      q.releasedThisTurn = false;
      q.applauseThisTurn = {};
      q.enteredThisTurn.clear();
    }
    this.onceUsed.clear();
    // アップキープ
    this.step = "upkeep";
    this.queueTriggers("upkeep", this.sources(p));
    await this.priorityStep();
    // ドロー
    this.step = "draw";
    if (this.turn > 1) this.draw(p, 1);
    this.checkState();
    // メイン1
    this.step = "main1";
    await this.priorityStep();
    // 戦闘
    await this.combatPhase();
    // メイン2
    this.step = "main2";
    await this.priorityStep();
    // 終了
    this.step = "end";
    for (const o of [...pl.battlefield]) {
      if (o.dashed) {
        this.move(o, "hand");
        this.addLog(`${o.card.name}は疾駆の効果で手札に戻った`, p);
      }
    }
    this.queueTriggers("endStep", this.sources(p));
    await this.priorityStep();
    // クリンナップ
    this.step = "cleanup";
    if (pl.hand.length > 7) {
      const n = pl.hand.length - 7;
      const picked = await this.askCards(p, `手札が7枚になるように${n}枚捨ててください`, pl.hand, n, "discard");
      for (const o of picked) this.move(o, "graveyard");
    }
    for (const q of this.players)
      for (const o of q.battlefield) {
        o.damage = 0;
        o.deathtouched = false;
        o.temp = [];
      }
    this.emptyPools();
    this.active = this.other(p);
  }
}

type Ctx = { item: StackItem; legal: boolean[] };

function signed(n: number) {
  return n >= 0 ? `+${n}` : `${n}`;
}

function effectSummary(e: Effect): string {
  switch (e.do) {
    case "returnCard":
      return e.to === "hand" ? "墓地のカードを手札に戻す" : e.to === "battlefield" ? "墓地のカードを戦場に戻す" : "墓地のカードをマナゾーンに置く";
    default:
      return "効果";
  }
}

export function staticSpecText(st: StaticSpec): string {
  return st.s;
}
