/**
 * 対戦のルールエンジン。
 * 決定が必要な場面では agents[p].decide() に「質問(Decision)」を渡して答えを待つ。
 * 人間は画面で、CPUは ai.ts で答える。
 */
import type { Card } from "../types";
import type { Ability, Amount, Cond, Effect, StaticSpec, TargetSpec, TriggerEvent } from "./schema";
import { cardColors, manaValue, parseCost, type Color } from "../lib/mana";
import { findPayment, type ManaUnit } from "./payment";

export type PlayerId = 0 | 1;
export type Zone = "library" | "hand" | "mana" | "battlefield" | "graveyard" | "exile" | "stack";
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
  chargesUsed: number;
  extraChargesThisTurn: number;
  /** 浮いているマナ(W/U/B/R/G/C) */
  pool: string[];
  drewFromEmpty: boolean;
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
  x: number;
};

export type Action =
  | { type: "pass" }
  | { type: "cast"; uid: number; from: "hand" | "mana" }
  | { type: "charge"; uid: number }
  | { type: "activate"; uid: number; index: number };

export type Decision =
  | { kind: "action"; options: Action[] }
  | { kind: "target"; prompt: string; spec: TargetSpec; options: TargetRef[]; source: Obj; effects: Effect[]; index: number }
  | { kind: "yesno"; prompt: string; reason: "may" | "burn" | "lookTop" | "mulligan" | "reclaim"; obj?: Obj }
  | { kind: "number"; prompt: string; min: number; max: number }
  | { kind: "chooseCards"; prompt: string; options: number[]; count: number; reason: "discard" | "burn" | "reclaim" | "erode" | "sacrifice" | "bottom" }
  | { kind: "attackers"; options: number[] }
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
      library: opts.decks[id].map((card) => this.newObj(card, id, "library")),
      hand: [],
      mana: [],
      battlefield: [],
      graveyard: [],
      exile: [],
      chargesUsed: 0,
      extraChargesThisTurn: 0,
      pool: [],
      drewFromEmpty: false,
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
    if (this.log.length > 400) this.log.splice(0, this.log.length - 400);
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
      for (const z of [p.battlefield, p.hand, p.mana, p.graveyard, p.library, p.exile]) {
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
    if (wasBattlefield && to !== "battlefield") o.burned = false;
    o.controller = opts.controller ?? o.owner;
    o.zone = to;
    if (o.token && to !== "battlefield") return;
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
        break;
      case "library":
        if (opts.top) p.library.unshift(o);
        else p.library.push(o);
        break;
      case "exile":
        p.exile.push(o);
        break;
      case "stack":
        break;
    }
  }

  colorsOf(o: Obj): Color[] {
    return o.tokenColors ?? cardColors(o.card.cost);
  }

  // ------------------------------------------------------------ 条件・性質
  cond(c: Cond, p: PlayerId, burned = false): boolean {
    switch (c) {
      case "burned":
        return burned;
      case "bloom":
        return this.players[p].mana.length >= 7;
      case "fewerMana":
        return this.players[p].mana.length < this.players[this.other(p)].mana.length;
    }
  }

  private statics(o: Obj): Mod[] {
    const mods: Mod[] = [];
    if (o.zone !== "battlefield") return mods;
    const creature = isCreatureCard(o.card);
    for (const src of this.players[o.controller].battlefield) {
      for (const a of abilitiesOf(src.card)) {
        if (a.a !== "static") continue;
        if (a.if && !this.cond(a.if, src.controller)) continue;
        const st = a.st;
        if (st.s === "anthem" && creature && !(st.others && src === o)) mods.push({ p: st.p, t: st.t, kw: st.kw ?? [] });
        if (st.s === "self" && src === o) mods.push({ p: st.p, t: st.t, kw: st.kw ?? [] });
      }
    }
    for (const p of this.players) {
      for (const aura of p.battlefield) {
        if (aura.attachedTo !== o.uid) continue;
        for (const a of abilitiesOf(aura.card)) {
          if (a.a === "static" && a.st.s === "auraBuff") mods.push({ p: a.st.p, t: a.st.t, kw: a.st.kw ?? [] });
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
    if (blocker.tapped || !isCreatureCard(blocker.card) || this.isPacified(blocker)) return false;
    if (this.hasKw(attacker, "飛行") && !this.hasKw(blocker, "飛行") && !this.hasKw(blocker, "到達")) return false;
    return true;
  }

  chargesAllowed(p: PlayerId): number {
    let n = 1 + this.players[p].extraChargesThisTurn;
    for (const o of this.players[p].battlefield)
      for (const a of abilitiesOf(o.card)) if (a.a === "static" && a.st.s === "extraCharge") n += a.st.n;
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
    if (options.length <= count) return options;
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
          if (spec.types.some((t) => o.card.type.includes(t)) && this.targetable(o, by)) out.push({ kind: "obj", uid: o.uid, zone: o.zone });
        break;
      case "graveyard":
        for (const o of this.players[by].graveyard)
          if (!spec.cardType || o.card.type.includes(spec.cardType)) out.push({ kind: "obj", uid: o.uid, zone: o.zone });
        break;
    }
    return out;
  }

  private stillLegal(r: TargetRef, spec: TargetSpec, by: PlayerId): boolean {
    if (r.kind === "player") return spec.t === "any";
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
      const cs = cardColors(o.card.cost);
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

  /** 唱えられるか(コストと対象の有無とタイミング) */
  canCast(p: PlayerId, o: Obj, from: "hand" | "mana"): boolean {
    const c = o.card;
    const instantSpeed = isInstantCard(c) || hasPrintedKw(c, "瞬速");
    if (!instantSpeed && !this.sorcerySpeed(p)) return false;
    let cost = c.cost;
    if (from === "mana") {
      const rel = releaseAbility(c);
      if (!rel) return false;
      cost = rel.cost;
    }
    if (!this.canPay(p, cost, 0, from === "mana" ? o : undefined)) return false;
    const sp = spellAbility(c);
    if (sp?.targets) for (const t of sp.targets) if (this.targetOptions(t, p).length === 0) return false;
    if (isAura(c) && this.targetOptions(AURA_TARGET, p).length === 0) return false;
    return true;
  }

  canActivate(p: PlayerId, o: Obj, index: number): boolean {
    const a = abilitiesOf(o.card)[index];
    if (!a || a.a !== "activated" || o.zone !== "battlefield" || o.controller !== p) return false;
    if (a.cost.tap && (o.tapped || (isCreatureCard(o.card) && o.sick))) return false;
    if (a.cost.mana && !this.canPay(p, a.cost.mana, 0, a.cost.tap ? o : undefined)) return false;
    if (a.targets) for (const t of a.targets) if (this.targetOptions(t, p).length === 0) return false;
    return true;
  }

  actionOptions(p: PlayerId): Action[] {
    const pl = this.players[p];
    const out: Action[] = [{ type: "pass" }];
    if (this.winner !== undefined) return out;
    if (this.sorcerySpeed(p) && pl.chargesUsed < this.chargesAllowed(p)) {
      for (const o of pl.hand) out.push({ type: "charge", uid: o.uid });
    }
    for (const o of pl.hand) if (this.canCast(p, o, "hand")) out.push({ type: "cast", uid: o.uid, from: "hand" });
    for (const o of pl.mana) if (releaseAbility(o.card) && this.canCast(p, o, "mana")) out.push({ type: "cast", uid: o.uid, from: "mana" });
    for (const o of pl.battlefield)
      abilitiesOf(o.card).forEach((a, i) => {
        if (a.a === "activated" && this.canActivate(p, o, i)) out.push({ type: "activate", uid: o.uid, index: i });
      });
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
      const zone = a.from === "hand" ? this.players[p].hand : this.players[p].mana;
      const o = zone.find((x) => x.uid === a.uid);
      if (o && this.canCast(p, o, a.from)) await this.cast(p, o, a.from);
    } else if (a.type === "activate") {
      const o = this.players[p].battlefield.find((x) => x.uid === a.uid);
      if (o && this.canActivate(p, o, a.index)) await this.activate(p, o, a.index);
    }
  }

  /** マナゾーンに置く(チャージや効果)。チャージ時能力が誘発する */
  private putIntoMana(o: Obj, p: PlayerId, tapped?: boolean) {
    this.move(o, "mana", { tapped: tapped || undefined });
    for (const ab of abilitiesOf(o.card)) {
      if (ab.a === "trigger" && ab.on === "charge") this.pendingTriggers.push({ obj: o, ability: ab, controller: p });
    }
  }

  private async cast(p: PlayerId, o: Obj, from: "hand" | "mana") {
    const c = o.card;
    const cost = from === "mana" ? releaseAbility(c)!.cost : c.cost;
    const exclude = from === "mana" ? o : undefined;
    let x = 0;
    if (cost.includes("{X}")) {
      const max = this.maxX(p, cost, exclude);
      x = max === 0 ? 0 : await this.ask<number>(p, { kind: "number", prompt: `${c.name}:Xの値を決めてください`, min: 0, max });
      x = Math.max(0, Math.min(max, Math.floor(x)));
    }
    const sp = spellAbility(c);
    const specs = isAura(c) ? [AURA_TARGET] : sp?.targets ?? [];
    const targets = await this.chooseTargets(p, specs, o, sp?.effects ?? []);
    if (!targets) return;
    let burned = false;
    const b = burnAbility(c);
    const manaLeft = this.players[p].mana.filter((m) => m !== o).length;
    if (b && manaLeft >= b.n) {
      burned = await this.askYesNo(p, `${c.name}:燃焼 ${b.n}(マナゾーンのカードを${b.n}枚墓地に置く)を行いますか?`, "burn", o);
    }
    if (!this.pay(p, cost, x, exclude)) return;
    if (burned && b) {
      const opts = this.players[p].mana.filter((m) => m !== o);
      const picked = await this.askCards(p, `燃焼:墓地に置くマナゾーンのカードを${b.n}枚選んでください`, opts, b.n, "burn");
      for (const m of picked) this.move(m, "graveyard");
    }
    this.move(o, "stack");
    this.usedCards.add(c.id);
    const item: StackItem = { id: this.stackId++, kind: "spell", obj: o, controller: p, ability: sp ?? null, targets, burned, x };
    this.stack.push(item);
    const tgt = targets.length ? `(対象:${targets.map((t) => this.describeRef(t)).join("、")})` : "";
    this.addLog(`${c.name}を${from === "mana" ? "マナ解放で" : ""}唱えた${burned ? "(燃焼)" : ""}${x ? `(X=${x})` : ""}${tgt}`, p);
    if (isInstantCard(c) || isSorceryCard(c)) {
      for (const src of this.players[p].battlefield)
        for (const ab of abilitiesOf(src.card)) if (ab.a === "trigger" && ab.on === "castSpell") this.pendingTriggers.push({ obj: src, ability: ab, controller: p });
    }
  }

  private async activate(p: PlayerId, o: Obj, index: number) {
    const a = abilitiesOf(o.card)[index] as Extract<Ability, { a: "activated" }>;
    const targets = await this.chooseTargets(p, a.targets ?? [], o, a.effects);
    if (!targets) return;
    if (a.cost.mana && !this.pay(p, a.cost.mana, 0, a.cost.tap ? o : undefined)) return;
    if (a.cost.tap) o.tapped = true;
    this.usedCards.add(o.card.id);
    this.stack.push({ id: this.stackId++, kind: "activated", obj: o, controller: p, ability: a, targets, burned: false, x: 0 });
    this.addLog(`${o.card.name}の能力を起動した`, p);
  }

  // ------------------------------------------------------------ 誘発
  private queueTriggers(on: TriggerEvent, objs: Obj[]) {
    for (const o of objs)
      for (const ab of abilitiesOf(o.card)) if (ab.a === "trigger" && ab.on === on) this.pendingTriggers.push({ obj: o, ability: ab, controller: o.controller });
  }

  private async flushTriggers() {
    while (this.pendingTriggers.length) {
      // 手番のプレイヤーの誘発を先にスタックに置く(後に解決される)
      const list = this.pendingTriggers.splice(0);
      list.sort((a, b) => (a.controller === this.active ? 0 : 1) - (b.controller === this.active ? 0 : 1));
      for (const t of list) {
        const ab = t.ability;
        if (ab.if && !this.cond(ab.if, t.controller, t.obj.burned)) continue;
        // 燃焼したときだけの効果しかない誘発は、燃焼していなければ置かない
        if (ab.effects.every((e) => e.if === "burned") && !t.obj.burned) continue;
        const targets = await this.chooseTargets(t.controller, ab.targets ?? [], t.obj, ab.effects);
        if (!targets) continue;
        this.stack.push({ id: this.stackId++, kind: "trigger", obj: t.obj, controller: t.controller, ability: ab, targets, burned: t.obj.burned, x: 0 });
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
          return;
        }
        this.enterBattlefield(item.obj, item.controller, item.burned, item.x);
        return;
      }
      await this.runAbility(item);
      if (item.obj.zone === "stack") this.move(item.obj, "graveyard");
      return;
    }
    this.stack.pop();
    await this.runAbility(item);
  }

  private enterBattlefield(o: Obj, controller: PlayerId, burned = false, x = 0) {
    this.move(o, "battlefield", { controller });
    o.sick = true;
    o.burned = burned;
    o.x = x;
    this.addLog(`${o.card.name}が戦場に出た`, controller);
    this.queueTriggers("etb", [o]);
  }

  private async runAbility(item: StackItem) {
    const ab = item.ability;
    if (!ab || !("effects" in ab)) return;
    const specs = "targets" in ab && ab.targets ? ab.targets : [];
    const legal = item.targets.map((t, i) => this.stillLegal(t, specs[i], item.controller));
    if (specs.length && legal.every((l) => !l)) {
      this.addLog(`${item.obj.card.name}は対象が不正になり、効果を発揮しなかった`, item.controller);
      return;
    }
    if (ab.a === "trigger" && ab.if && !this.cond(ab.if, item.controller, item.burned)) return;
    await this.runEffects(ab.effects, { item, legal });
  }

  private amount(n: Amount, ctx: Ctx): number {
    if (typeof n === "number") return n;
    if (n === "X") return ctx.item.x;
    if (n.count === "mana") return this.players[ctx.item.controller].mana.length;
    return this.creatures(ctx.item.controller).length;
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
      if (e.if && !this.cond(e.if, p, ctx.item.burned)) continue;
      if (e.unless && this.cond(e.unless, p, ctx.item.burned)) continue;
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
    if (source && source.zone === "battlefield" && this.hasKw(source, "絆魂")) this.players[source.controller].life += n;
  }

  private destroy(o: Obj) {
    if (o.zone !== "battlefield") return;
    this.die(o);
  }

  /** 戦場から墓地へ(死亡) */
  private die(o: Obj) {
    const controller = o.controller;
    const wasCreature = isCreatureCard(o.card);
    const dyingAbilities = abilitiesOf(o.card);
    this.move(o, "graveyard");
    this.addLog(`${o.card.name}が墓地に置かれた`, controller);
    if (wasCreature) {
      for (const ab of dyingAbilities) if (ab.a === "trigger" && ab.on === "dies") this.pendingTriggers.push({ obj: o, ability: ab, controller });
      this.queueTriggers("allyDies", this.players[controller].battlefield);
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
        for (const o of [...this.creatures(0), ...this.creatures(1)]) this.dealDamage(src, o, n);
        if (e.players) for (const id of [0, 1] as PlayerId[]) this.dealDamage(src, { kind: "player", id }, n);
        this.addLog(`${src.card.name}が${e.players ? "すべてのクリーチャーとプレイヤー" : "すべてのクリーチャー"}に${n}点のダメージ`, p);
        break;
      }
      case "destroy": {
        const o = this.refObj(ctx, e.tg);
        if (o) this.destroy(o);
        break;
      }
      case "destroyAll":
        for (const o of [...this.creatures(0), ...this.creatures(1)])
          if (e.maxPower === undefined || this.power(o) <= e.maxPower) this.destroy(o);
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
        for (const o of targets) o.temp.push({ p: e.p, t: e.t, kw: e.kw ?? [] });
        break;
      }
      case "buffSelf":
        if (src.zone === "battlefield") src.perm.push({ p: e.p, t: e.t, kw: e.kw ?? [] });
        break;
      case "counters": {
        const o = e.self ? (src.zone === "battlefield" ? src : null) : this.refObj(ctx, e.tg);
        if (o) o.counters += e.n;
        break;
      }
      case "countersAll":
        for (const o of this.creatures(p)) o.counters += e.n;
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
        pl.life += n;
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
        for (let i = 0; i < e.n; i++) {
          const card: Card = {
            id: `token-${e.sub}`,
            name: `${e.sub}トークン`,
            cost: "",
            type: "クリーチャー",
            subtype: e.sub,
            power: pp,
            toughness: tt,
            rarity: "トークン",
            text: e.kw?.length ? [e.kw.join("、")] : [],
            abilities: (e.kw ?? []).map((k) => ({ a: "kw" as const, kw: k })),
          };
          const o = this.newObj(card, p, "battlefield");
          o.token = true;
          o.tokenColors = e.color === "C" ? [] : [e.color];
          this.players[p].battlefield.push(o);
          o.sick = true;
          this.queueTriggers("etb", [o]);
        }
        this.addLog(`${pp}/${tt}の${e.sub}トークンを${e.n}体生成した`, p);
        break;
      }
      case "counter": {
        const r = this.ref(ctx, e.tg);
        if (r && r.kind === "stack") {
          const s = this.stack.find((x) => x.id === r.id);
          if (s) {
            this.stack = this.stack.filter((x) => x !== s);
            this.addLog(`${s.obj.card.name}が打ち消された`, p);
            if (s.kind === "spell") this.move(s.obj, "graveyard");
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
        break;
      }
      case "sacrifice": {
        const cs = this.creatures(opp);
        if (cs.length === 0) break;
        const [o] = await this.askCards(opp, "生け贄に捧げるクリーチャーを選んでください", cs, 1, "sacrifice");
        this.addLog(`${o.card.name}を生け贄に捧げた`, opp);
        this.die(o);
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
          if (isCreatureCard(o.card) && (this.toughness(o) <= 0 || o.damage >= this.toughness(o) || (o.deathtouched && o.damage > 0))) {
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
              this.move(o, "graveyard");
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
    const anyFirst = [...alive(), ...this.blockersInCombat()].some((o) => this.hasKw(o, "先制攻撃"));
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

  private validateBlocks(ans: BlockAnswer, attackers: Obj[], blockers: Obj[]): BlockAnswer {
    const out: BlockAnswer = {};
    const used = new Set<number>();
    for (const a of attackers) {
      const bs = (ans[a.uid] ?? [])
        .map((u) => blockers.find((b) => b.uid === u))
        .filter((b): b is Obj => !!b && !used.has(b.uid) && this.canBlock(b, a));
      if (this.hasKw(a, "威迫") && bs.length < 2) continue;
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
      return firstStrikeStep ? fs : !fs || firstStrikeStep === null;
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
    // アップキープ
    this.step = "upkeep";
    this.queueTriggers("upkeep", pl.battlefield);
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
    this.queueTriggers("endStep", pl.battlefield);
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
