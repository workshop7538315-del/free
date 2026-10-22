/**
 * CPUの思考。エンジンからの質問に、簡単な評価関数で答える。
 */
import type { Card } from "../types";
import type { Effect, TargetSpec } from "./schema";
import { cardColors, colorPips, manaValue, COLORS, type Color } from "../lib/mana";
import {
  abilitiesOf,
  burnAbility,
  isAura,
  isCreatureCard,
  isInstantCard,
  releaseAbility,
  spellAbility,
  type Action,
  type Agent,
  type BlockAnswer,
  type Decision,
  type Game,
  type Obj,
  type PlayerId,
  type TargetRef,
} from "./engine";

const KW_VALUE: Record<string, number> = {
  飛行: 1.5,
  接死: 1.5,
  絆魂: 1,
  先制攻撃: 1,
  トランプル: 0.6,
  呪禁: 1,
  威迫: 1,
  警戒: 0.4,
  速攻: 0.4,
  到達: 0.4,
  瞬速: 0.3,
  防衛: -1.5,
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class CpuAgent implements Agent {
  constructor(private delay = 0) {}

  async decide(g: Game, p: PlayerId, d: Decision): Promise<unknown> {
    const ans = this.think(g, p, d);
    const visible =
      (d.kind === "action" && (ans as Action).type !== "pass") ||
      (d.kind === "attackers" && (ans as number[]).length > 0) ||
      d.kind === "blockers";
    if (this.delay && visible) await sleep(this.delay);
    return ans;
  }

  private think(g: Game, p: PlayerId, d: Decision): unknown {
    switch (d.kind) {
      case "action":
        return chooseAction(g, p, d.options);
      case "target":
        return chooseTarget(g, p, d);
      case "yesno":
        return chooseYesNo(g, p, d);
      case "number":
        return d.max;
      case "chooseCards":
        return chooseCards(g, p, d);
      case "attackers":
        return chooseAttackers(g, p, d.options);
      case "blockers":
        return chooseBlocks(g, p, d.attackers, d.blockers);
    }
  }
}

// ---------------------------------------------------------------- 評価
function creatureValue(g: Game, o: Obj): number {
  let v = g.power(o) * 1.3 + g.toughness(o) * 0.9;
  for (const k of g.keywords(o)) v += KW_VALUE[k] ?? 0;
  if (abilitiesOf(o.card).some((a) => a.a === "static" && a.st.s === "anthem")) v += 2;
  if (abilitiesOf(o.card).some((a) => a.a === "activated" || a.a === "mana")) v += 1;
  return Math.max(0.5, v);
}

function cardCreatureValue(c: Card): number {
  let v = (c.power ?? 0) * 1.3 + (c.toughness ?? 0) * 0.9;
  for (const a of abilitiesOf(c)) if (a.a === "kw") v += KW_VALUE[a.kw] ?? 0;
  return v;
}

/** 手札に残しておきたい度合い */
function keepValue(g: Game, p: PlayerId, c: Card): number {
  const rarity = { コモン: 0, アンコモン: 0.5, レア: 1, 神話レア: 1.5 }[c.rarity] ?? 0;
  const mv = manaValue(c.cost);
  const mana = g.players[p].mana.length;
  let v = 2 + rarity + Math.min(mv, 6) * 0.4;
  if (isCreatureCard(c)) v += cardCreatureValue(c) * 0.15;
  // すぐには唱えられないカードはマナにしやすい
  if (mv > mana + 3) v -= 1.5;
  // チャージ時能力があるならマナに置く価値が高い
  if (abilitiesOf(c).some((a) => a.a === "trigger" && a.on === "charge")) v -= 1.2;
  if (releaseAbility(c)) v -= 0.8;
  return v;
}

/** まだ足りない色(手札の色マナ記号と、マナゾーンの色の差) */
function colorNeed(g: Game, p: PlayerId, except?: Obj): Record<Color, number> {
  const need: Record<Color, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  for (const o of g.players[p].hand) {
    if (o === except) continue;
    const pips = colorPips(o.card.cost);
    for (const c of COLORS) need[c] = Math.max(need[c], pips[c]);
  }
  for (const m of g.players[p].mana) for (const c of cardColors(m.card.cost)) need[c] -= 1;
  return need;
}

function kills(g: Game, a: Obj, b: Obj, extraPower = 0): boolean {
  const pw = g.power(a) + extraPower;
  if (pw <= 0) return false;
  return g.hasKw(a, "接死") || pw >= g.toughness(b) - b.damage;
}

function findObj(g: Game, r: TargetRef): Obj | undefined {
  return r.kind === "obj" ? g.find(r.uid) : undefined;
}

// ---------------------------------------------------------------- 行動
function chooseAction(g: Game, p: PlayerId, options: Action[]): Action {
  const pass: Action = { type: "pass" };
  if (options.length <= 1) return pass;
  const me = g.players[p];
  const myTurn = g.active === p;
  const main = (g.step === "main1" || g.step === "main2") && g.stack.length === 0 && myTurn;

  // 相手の呪文への対応
  const top = g.stack[g.stack.length - 1];
  if (top && top.controller !== p) {
    const counter = options.find((a) => a.type === "cast" && isCounter(g, a) && worthCountering(g, p, top));
    if (counter) return counter;
    return pass;
  }
  if (top) return pass;

  // チャージ
  const charges = options.filter((a): a is Extract<Action, { type: "charge" }> => a.type === "charge");
  if (main && charges.length > 0 && (me.mana.length < 7 || me.hand.length >= 4)) {
    const need = colorNeed(g, p);
    let best: { a: Action; s: number } | null = null;
    for (const a of charges) {
      const o = me.hand.find((x) => x.uid === a.uid)!;
      let s = keepValue(g, p, o.card);
      for (const c of cardColors(o.card.cost)) if (need[c] > 0) s -= 1.2;
      if (cardColors(o.card.cost).length >= 2) s += 0.6; // タップ状態で置かれる
      // 今すぐ唱えたいカードは残す
      if (manaValue(o.card.cost) <= me.mana.length + 1 && manaValue(o.card.cost) >= 1) s += 0.8;
      if (!best || s < best.s) best = { a, s };
    }
    if (best) return best.a;
  }

  // 唱える・起動する
  let best: { a: Action; s: number } | null = null;
  for (const a of options) {
    let s = -Infinity;
    if (a.type === "cast") s = scoreCast(g, p, a, main);
    else if (a.type === "activate") s = scoreActivate(g, p, a);
    if (s > 0 && (!best || s > best.s)) best = { a, s };
  }
  return best?.a ?? pass;
}

function isCounter(g: Game, a: Action): boolean {
  if (a.type !== "cast") return false;
  const o = g.find(a.uid);
  return !!o && !!spellAbility(o.card)?.effects.some((e) => e.do === "counter");
}

function worthCountering(g: Game, p: PlayerId, item: Game["stack"][number]): boolean {
  if (item.kind !== "spell") return false;
  const mv = manaValue(item.obj.card.cost) + item.x;
  if (mv >= 4) return true;
  if (mv >= 2 && isCreatureCard(item.obj.card)) return true;
  // 自分のクリーチャーを狙う除去
  return item.targets.some((t) => {
    const o = findObj(g, t);
    return !!o && o.controller === p && creatureValue(g, o) >= 3;
  });
}

function scoreCast(g: Game, p: PlayerId, a: Extract<Action, { type: "cast" }>, main: boolean): number {
  const o = g.find(a.uid);
  if (!o) return -1;
  const c = o.card;
  const opp = g.other(p);
  const inCombat = !!g.combat && g.step === "block";
  const oppEnd = g.step === "end" && g.active !== p;
  if (isCreatureCard(c)) {
    if (!main && !(oppEnd || (g.step === "attack" && g.active !== p))) return -1;
    let v = 3 + cardCreatureValue(c) * 0.6 + manaValue(c.cost) * 0.3;
    if (abilitiesOf(c).some((x) => x.a === "trigger" && x.on === "etb")) v += 1.5;
    return v;
  }
  if (isAura(c)) {
    const best = Math.max(0, ...g.creatures(opp).filter((x) => g.canAttack(x) || !x.tapped).map((x) => creatureValue(g, x)));
    return best >= 4 ? best : -1;
  }
  if (c.type === "エンチャント" || c.type === "アーティファクト") return main ? 2 + manaValue(c.cost) * 0.4 : -1;
  const sp = spellAbility(c);
  if (!sp) return -1;
  // インスタントは相手の終了ステップや戦闘中に使う方がよいものもある
  const effects = sp.effects;
  let v = 0;
  for (const e of effects) v += effectValue(g, p, e, sp.targets ?? [], inCombat);
  if (isInstantCard(c) && main && effects.some((e) => e.do === "counter")) return -1;
  if (isInstantCard(c) && !main && !oppEnd && !inCombat) return -1;
  if (effects.some((e) => (e.do === "pump" && (e.p as number) > 0) || e.do === "pumpAll") && !inCombat && !isCombatStart(g, p)) {
    // 戦闘外の強化は無駄が多い
    v -= 3;
  }
  const b = burnAbility(c);
  if (b) v += 0.3;
  return v > 0.8 ? v : -1;
}

function isCombatStart(g: Game, p: PlayerId) {
  return g.step === "main1" && g.active === p && g.creatures(p).filter((o) => g.canAttack(o)).length >= 2;
}

/** 効果の価値の目安 */
function effectValue(g: Game, p: PlayerId, e: Effect, targets: TargetSpec[], inCombat: boolean): number {
  const opp = g.other(p);
  const me = g.players[p];
  const them = g.players[opp];
  const oppCreatures = g.creatures(opp);
  const myCreatures = g.creatures(p);
  const n = (x: unknown, fallback = 1) => (typeof x === "number" ? x : x === "X" ? g.maxX(p, "{X}") : fallback);
  const bestKillable = (dmg: number) =>
    Math.max(0, ...oppCreatures.filter((o) => !g.hasKw(o, "呪禁") && g.toughness(o) - o.damage <= dmg).map((o) => creatureValue(g, o)));
  const bestOpp = Math.max(0, ...oppCreatures.filter((o) => !g.hasKw(o, "呪禁")).map((o) => creatureValue(g, o)));
  switch (e.do) {
    case "damage": {
      if (e.to === "opp") return them.life <= n(e.n) ? 50 : n(e.n) * 0.8;
      const dmg = n(e.n, 3);
      const spec = targets[e.tg ?? 0];
      if (spec?.t === "any" && them.life <= dmg) return 50;
      const k = bestKillable(dmg);
      if (k > 0) return k + 0.5;
      return spec?.t === "any" ? dmg * 0.5 : 0;
    }
    case "damageAll": {
      const dmg = n(e.n, 2);
      const theirs = oppCreatures.filter((o) => g.toughness(o) <= dmg).reduce((s, o) => s + creatureValue(g, o), 0);
      const mine = myCreatures.filter((o) => g.toughness(o) <= dmg).reduce((s, o) => s + creatureValue(g, o), 0);
      return theirs - mine - 1;
    }
    case "destroy":
    case "exile": {
      const spec = targets[e.tg] as TargetSpec;
      if (spec.t === "permanent") return them.battlefield.some((o) => spec.types.some((t) => o.card.type.includes(t))) ? 3 : 0;
      return bestOpp >= 2.5 ? bestOpp + 1 : 0;
    }
    case "destroyAll": {
      const theirs = oppCreatures.reduce((s, o) => s + creatureValue(g, o), 0);
      const mine = myCreatures.reduce((s, o) => s + creatureValue(g, o), 0);
      return theirs - mine - 4;
    }
    case "bounce":
    case "tuck":
      return bestOpp >= 4 ? bestOpp * 0.6 : 0;
    case "bounceAll": {
      const theirs = oppCreatures.reduce((s, o) => s + creatureValue(g, o), 0);
      const mine = myCreatures.reduce((s, o) => s + creatureValue(g, o), 0);
      return (theirs - mine) * 0.6 - 2;
    }
    case "tap":
      return inCombat ? 0 : bestOpp >= 4 && g.active === p ? 1.2 : 0.3;
    case "tapAll":
      return g.active === p && g.step === "main1" ? oppCreatures.length * 0.8 : 0;
    case "pump": {
      if (e.self) return 0.5;
      const pp = n(e.p, 0);
      const tt = n(e.t, 0);
      if (pp < 0 || tt < 0) return bestKillable(-tt);
      return inCombat ? 2 : 1;
    }
    case "pumpAll":
      if (e.who === "all") {
        const theirs = oppCreatures.filter((o) => g.toughness(o) <= -e.t).reduce((s, o) => s + creatureValue(g, o), 0);
        const mine = myCreatures.filter((o) => g.toughness(o) <= -e.t).reduce((s, o) => s + creatureValue(g, o), 0);
        return theirs - mine - 1;
      }
      return myCreatures.length * 0.8;
    case "counters":
      return myCreatures.length ? e.n * 1.2 : 0;
    case "countersAll":
      return myCreatures.length * e.n * 1.1;
    case "draw":
      return n(e.n, 1) * 1.6;
    case "discard":
      return e.who === "opp" ? (them.hand.length ? 1.5 : 0) : -0.8 * e.n;
    case "gainLife":
      return n(e.n, 1) * (me.life < 8 ? 0.6 : 0.2);
    case "loseLife":
      if (e.who === "opp") return them.life <= n(e.n, 1) ? 50 : n(e.n, 1) * 0.6;
      return me.life <= n(e.n, 1) + 2 ? -50 : -0.3 * n(e.n, 1);
    case "token": {
      const pw = typeof e.p === "number" ? e.p : me.mana.length;
      const t = typeof e.t === "number" ? e.t : me.mana.length;
      return e.n * (pw * 1.2 + t * 0.8 + (e.kw?.length ?? 0) * 0.8);
    }
    case "counter":
      return 3;
    case "returnCard": {
      const cards = me.graveyard.filter((o) => isCreatureCard(o.card));
      if (e.to === "mana") return me.graveyard.length ? 1.2 : 0;
      return cards.length ? Math.max(...cards.map((o) => cardCreatureValue(o.card))) * (e.to === "battlefield" ? 1 : 0.6) : 0;
    }
    case "rampTop":
      return me.mana.length < 8 ? 1.8 * e.n : 0.3;
    case "extraCharge":
      return me.hand.length > 1 && me.mana.length < 7 ? 1 : 0.1;
    case "reclaim":
      return 0.8;
    case "erode":
      return Math.min(e.n, them.mana.length) * 1.6;
    case "sacrifice":
      return oppCreatures.length ? Math.min(...oppCreatures.map((o) => creatureValue(g, o))) + 1 : 0;
    case "fight":
    case "bite": {
      let best = 0;
      for (const mine of myCreatures)
        for (const t of oppCreatures) {
          if (g.hasKw(t, "呪禁")) continue;
          const kill = kills(g, mine, t);
          const die = e.do === "fight" && kills(g, t, mine);
          if (kill) best = Math.max(best, creatureValue(g, t) - (die ? creatureValue(g, mine) : 0));
        }
      return best;
    }
    case "lookTop":
      return 0.3;
    case "addMana": {
      // 加えたマナで、今は唱えられない重いカードが唱えられるようになるなら使う
      if (!(g.step === "main1" || g.step === "main2") || g.active !== p) return 0;
      const untapped = me.mana.filter((o) => !o.tapped).length - 1;
      const extra = (e.mana.match(/\{/g) ?? []).length;
      const enables = me.hand.some((o) => {
        const mv = manaValue(o.card.cost);
        return !spellAbility(o.card)?.effects.some((x) => x.do === "addMana") && mv > untapped && mv <= untapped + extra;
      });
      return enables ? 2.5 : 0;
    }
  }
  return 0;
}

function scoreActivate(g: Game, p: PlayerId, a: Extract<Action, { type: "activate" }>): number {
  const o = g.find(a.uid);
  if (!o) return -1;
  const ab = abilitiesOf(o.card)[a.index];
  if (!ab || ab.a !== "activated") return -1;
  const opp = g.other(p);
  const lateMain = g.step === "main2" && g.active === p && g.stack.length === 0;
  const oppEnd = g.step === "end" && g.active !== p;
  for (const e of ab.effects) {
    if (e.do === "draw") return lateMain || oppEnd ? 2 : -1;
    if (e.do === "damage") {
      if (!(lateMain || oppEnd)) return -1;
      return 1.5;
    }
    if (e.do === "tap") {
      // 攻撃前に相手の一番強いブロッカーをタップする
      if (g.step === "main1" && g.active === p && g.creatures(p).some((x) => g.canAttack(x)) && g.creatures(opp).some((x) => !x.tapped)) return 1.5;
      return -1;
    }
  }
  return -1;
}

// ---------------------------------------------------------------- 対象
function harmful(e: Effect | undefined, index: number): boolean {
  if (!e) return true;
  switch (e.do) {
    case "pump":
      return (typeof e.p === "number" && e.p < 0) || (typeof e.t === "number" && e.t < 0);
    case "counters":
    case "returnCard":
      return false;
    case "fight":
    case "bite":
      return index === 1;
    default:
      return true;
  }
}

function chooseTarget(g: Game, p: PlayerId, d: Extract<Decision, { kind: "target" }>): TargetRef {
  const opp = g.other(p);
  const effect = d.effects.find((e) => ("tg" in e && (Array.isArray(e.tg) ? e.tg.includes(d.index) : e.tg === d.index)) || false);
  const auraEffect = isAura(d.source.card) ? abilitiesOf(d.source.card).find((a) => a.a === "static") : undefined;
  const bad = auraEffect ? auraEffect.a === "static" && auraEffect.st.s === "pacify" : harmful(effect, d.index);
  const opts = d.options;

  // 呪文を対象にするなら相手の呪文
  const stackOpts = opts.filter((o) => o.kind === "stack");
  if (stackOpts.length) {
    const theirs = stackOpts.filter((o) => g.stack.find((s) => s.id === (o as { id: number }).id)?.controller !== p);
    return (theirs.length ? theirs : stackOpts)[theirs.length ? theirs.length - 1 : 0];
  }

  // 墓地のカード
  const gy = opts.filter((o) => o.kind === "obj" && findObj(g, o)?.zone === "graveyard");
  if (gy.length) {
    return [...gy].sort((a, b) => cardScore(findObj(g, b)!.card) - cardScore(findObj(g, a)!.card))[0];
  }

  const dmg = effect && effect.do === "damage" && typeof effect.n === "number" ? effect.n : effect && effect.do === "damage" ? 99 : 0;
  if (bad) {
    // ダメージで相手を倒せるなら相手プレイヤー
    const oppPlayer = opts.find((o) => o.kind === "player" && o.id === opp);
    if (oppPlayer && dmg && g.players[opp].life <= dmg) return oppPlayer;
    const theirs = opts
      .map((r) => ({ r, o: findObj(g, r) }))
      .filter((x) => x.o && x.o.controller !== p) as { r: TargetRef; o: Obj }[];
    if (theirs.length) {
      let pool = theirs;
      if (effect?.do === "damage") {
        const killable = theirs.filter((x) => g.toughness(x.o) - x.o.damage <= dmg);
        if (killable.length) pool = killable;
        else if (oppPlayer) return oppPlayer;
      }
      if (effect?.do === "pump") {
        const t = typeof effect.t === "number" ? -effect.t : 0;
        const killable = theirs.filter((x) => g.toughness(x.o) - x.o.damage <= t);
        if (killable.length) pool = killable;
      }
      if (effect?.do === "tap") pool = pool.filter((x) => !x.o.tapped).length ? pool.filter((x) => !x.o.tapped) : pool;
      return [...pool].sort((a, b) => creatureValue(g, b.o) - creatureValue(g, a.o))[0].r;
    }
    if (oppPlayer) return oppPlayer;
    // 自分のものしかない:一番価値の低いもの
    const mine = opts.map((r) => ({ r, o: findObj(g, r) })).filter((x) => x.o) as { r: TargetRef; o: Obj }[];
    if (mine.length) return [...mine].sort((a, b) => creatureValue(g, a.o) - creatureValue(g, b.o))[0].r;
    return opts[0];
  }
  // 自分のクリーチャーを強化:戦闘中のものを優先
  const mine = opts.map((r) => ({ r, o: findObj(g, r) })).filter((x) => x.o && x.o.controller === p) as { r: TargetRef; o: Obj }[];
  if (mine.length) {
    const inCombat = (o: Obj) =>
      !!g.combat && (g.combat.attackers.includes(o.uid) || Object.values(g.combat.blocks).some((bs) => bs.includes(o.uid)));
    if (effect?.do === "fight" || effect?.do === "bite") return [...mine].sort((a, b) => g.power(b.o) - g.power(a.o))[0].r;
    return [...mine].sort((a, b) => Number(inCombat(b.o)) - Number(inCombat(a.o)) || creatureValue(g, b.o) - creatureValue(g, a.o))[0].r;
  }
  return opts[0];
}

function cardScore(c: Card): number {
  return isCreatureCard(c) ? cardCreatureValue(c) + manaValue(c.cost) * 0.3 : manaValue(c.cost) * 0.5;
}

// ---------------------------------------------------------------- はい/いいえ
function chooseYesNo(g: Game, p: PlayerId, d: Extract<Decision, { kind: "yesno" }>): boolean {
  const me = g.players[p];
  switch (d.reason) {
    case "mulligan":
      return true;
    case "burn": {
      const n = d.obj ? burnAbility(d.obj.card)?.n ?? 1 : 1;
      return me.mana.length - n >= 4 || (g.players[g.other(p)].life <= 5 && me.mana.length - n >= 2);
    }
    case "reclaim":
      return me.mana.length >= 5;
    case "lookTop":
      return !!d.obj && manaValue(d.obj.card.cost) > me.mana.length + 3;
    case "may":
      return true;
  }
}

// ---------------------------------------------------------------- カードを選ぶ
function chooseCards(g: Game, p: PlayerId, d: Extract<Decision, { kind: "chooseCards" }>): number[] {
  const objs = d.options.map((u) => g.find(u)).filter((o): o is Obj => !!o);
  const me = g.players[p];
  let sorted: Obj[];
  switch (d.reason) {
    case "discard":
    case "bottom":
      sorted = [...objs].sort((a, b) => keepValue(g, p, a.card) - keepValue(g, p, b.card));
      break;
    case "burn": {
      const need = colorNeed(g, p);
      const score = (o: Obj) => (o.tapped ? 0 : 10) + cardColors(o.card.cost).reduce((s, c) => s + Math.max(0, need[c]), 0);
      sorted = [...objs].sort((a, b) => score(a) - score(b));
      break;
    }
    case "reclaim":
      sorted = [...objs].sort((a, b) => cardScore(b.card) - cardScore(a.card) + (b.tapped ? 1 : 0) - (a.tapped ? 1 : 0));
      break;
    case "erode":
      sorted = [...objs].sort((a, b) => Number(a.tapped) - Number(b.tapped) || cardColors(b.card.cost).length - cardColors(a.card.cost).length);
      break;
    case "sacrifice":
      sorted = [...objs].sort((a, b) => creatureValue(g, a) - creatureValue(g, b));
      break;
  }
  void me;
  return sorted.slice(0, d.count).map((o) => o.uid);
}

// ---------------------------------------------------------------- 攻撃とブロック
function chooseAttackers(g: Game, p: PlayerId, options: number[]): number[] {
  const opp = g.other(p);
  const cands = options.map((u) => g.find(u)).filter((o): o is Obj => !!o);
  const blockers = g.creatures(opp).filter((b) => !b.tapped && !g.isPacified(b));
  const oppLife = g.players[opp].life;
  const myLife = g.players[p].life;

  // 全員で攻撃すれば勝てるか(ブロッカー1体につき最大の攻撃1体を止められると仮定)
  const powers = cands.map((o) => g.power(o)).sort((a, b) => b - a);
  const unblockedPower = powers.slice(blockers.length).reduce((s, x) => s + x, 0);
  if (unblockedPower >= oppLife) return cands.map((o) => o.uid);

  const oppPower = g.creatures(opp).reduce((s, o) => s + (g.hasKw(o, "防衛") ? 0 : g.power(o)), 0);
  const defensive = oppPower >= myLife - 2;

  const out: number[] = [];
  for (const a of cands) {
    const can = blockers.filter((b) => g.canBlock(b, a));
    if (g.hasKw(a, "威迫") && can.length < 2) {
      out.push(a.uid);
      continue;
    }
    if (can.length === 0) {
      if (!defensive || g.hasKw(a, "警戒") || g.hasKw(a, "飛行")) out.push(a.uid);
      continue;
    }
    if (defensive && !g.hasKw(a, "警戒")) continue;
    const bad = can.some((b) => kills(g, b, a) && !kills(g, a, b));
    const trade = can.some((b) => kills(g, b, a) && kills(g, a, b) && creatureValue(g, b) < creatureValue(g, a) - 0.5);
    if (!bad && !trade) out.push(a.uid);
  }
  return out;
}

function chooseBlocks(g: Game, p: PlayerId, attackerIds: number[], blockerIds: number[]): BlockAnswer {
  const attackers = attackerIds
    .map((u) => g.find(u))
    .filter((o): o is Obj => !!o)
    .sort((a, b) => g.power(b) - g.power(a));
  const free = blockerIds.map((u) => g.find(u)).filter((o): o is Obj => !!o);
  const myLife = g.players[p].life;
  let incoming = attackers.reduce((s, a) => s + g.power(a), 0);
  const out: BlockAnswer = {};
  for (const a of attackers) {
    if (g.hasKw(a, "威迫")) continue;
    const can = free.filter((b) => g.canBlock(b, a));
    if (!can.length) continue;
    const byValue = (xs: Obj[]) => [...xs].sort((x, y) => creatureValue(g, x) - creatureValue(g, y));
    const great = byValue(can.filter((b) => kills(g, b, a) && !kills(g, a, b)));
    const safe = byValue(can.filter((b) => !kills(g, a, b)));
    const trade = byValue(can.filter((b) => kills(g, b, a) && creatureValue(g, b) <= creatureValue(g, a) + 0.3));
    let pick: Obj | undefined = great[0] ?? safe[0] ?? trade[0];
    if (!pick && incoming >= myLife) pick = byValue(can)[0];
    if (pick) {
      out[a.uid] = [pick.uid];
      free.splice(free.indexOf(pick), 1);
      if (!g.hasKw(a, "トランプル")) incoming -= g.power(a);
    }
  }
  return out;
}
