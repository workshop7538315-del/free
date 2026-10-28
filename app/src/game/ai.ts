/**
 * CPUの思考。エンジンからの質問に、簡単な評価関数で答える。
 */
import type { Card } from "../types";
import type { Amount, Applause, Effect, TargetSpec } from "./schema";
import { cardColors, colorPips, manaValue, parseCost, COLORS, type Color } from "../lib/mana";
import {
  abilitiesOf,
  burnAbility,
  abilityOf,
  hasCrest,
  crestActive,
  manaColors,
  isAura,
  isCreatureCard,
  isEquipment,
  isInstantCard,
  isExtraCard,
  APPLAUSE_CAP,
  BLESSING_ELDORADO,
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
  天翔: 2.5,
  大威迫: 1.6,
  吸血: 1.2,
  鉄壁: 1,
  輪廻: 0.8,
  二段攻撃: 2,
  破壊不能: 2,
  不屈: 1,
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
        return chooseNumber(g, p, d);
      case "chooseCards":
        return chooseCards(g, p, d);
      case "attackers":
        return chooseAttackers(g, p, d.options);
      case "blockers":
        return chooseBlocks(g, p, d.attackers, d.blockers);
      case "mode":
        return chooseMode(g, p, d);
      case "chooseSum":
        return chooseSum(g, p, d);
      case "color": {
        // 出せるマナがいちばん多い色で払う(ほかの色を残す)
        const me = g.players[p];
        const count = (c: string) => me.mana.filter((o) => !o.tapped && manaColors(o).includes(c as never)).length;
        return [...d.options].sort((a, b) => count(b) - count(a))[0];
      }
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
/** 陶酔(捨てられたとき)を持つか */
function hasDiscardTrigger(c: Card): boolean {
  return abilitiesOf(c).some((a) => a.a === "trigger" && a.on === "discarded");
}

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
  if (abilityOf(c, "flashback")) v -= 0.4;
  // 紋章を持つカードは、マナゾーンに置くと働くのでマナにしたい
  if (hasCrest(c)) v -= 1.6;
  // 装備品は自分のクリーチャーがいる・来るなら手札に残す
  if (abilityOf(c, "equip")) v += 1.2;
  // 生け贄の起動型能力を持つものは、生け贄にするクリーチャーとの組み合わせで強い
  if (abilitiesOf(c).some((a) => a.a === "activated" && (a.cost.sac || a.cost.sacSelf))) v += 0.6;
  return v;
}

/** まだ足りない色(手札の色マナ記号と、マナゾーンの色の差) */
function colorNeed(g: Game, p: PlayerId, except?: Obj): Record<Color | "C", number> {
  const need: Record<Color | "C", number> = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };
  for (const o of g.players[p].hand) {
    if (o === except) continue;
    const pips = colorPips(o.card.cost);
    for (const c of COLORS) need[c] = Math.max(need[c], pips[c]);
    // {C}(欠色マナでしか払えない記号)
    need.C = Math.max(need.C, parseCost(o.card.cost).filter((s) => s.kind === "colorless").length);
  }
  for (const m of g.players[p].mana) {
    const cs = manaColors(m);
    for (const c of cs) need[c] -= 1;
    if (cs.length === 0) need.C -= 1;
  }
  return need;
}

function kills(g: Game, a: Obj, b: Obj, extraPower = 0): boolean {
  const pw = g.power(a) + extraPower;
  if (pw <= 0) return false;
  return g.hasKw(a, "接死") || pw >= g.toughness(b) - b.damage;
}

/** 決闘で先にダメージを与えられるか */
function duelFirst(g: Game, o: Obj): boolean {
  return g.hasKw(o, "先制攻撃") || g.hasKw(o, "二段攻撃");
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
      if (cardColors(o.card.cost).length === 0 && need.C > 0) s -= 1.2;
      if (cardColors(o.card.cost).length >= 2) s += 0.6; // タップ状態で置かれる
      // 今すぐ唱えたいカードは残す
      if (manaValue(o.card.cost) <= me.mana.length + 1 && manaValue(o.card.cost) >= 1) s += 0.8;
      if (!best || s < best.s) best = { a, s };
    }
    // 2回目以降のチャージ(追加チャージ)は、手札を使い切らないように、マナにしてよいカードだけにする
    const extra = me.chargesUsed >= 1;
    const maxMV = Math.max(0, ...me.hand.map((o) => manaValue(o.card.cost)));
    if (best && extra && !(best.s < 2.3 || (me.hand.length >= 5 && me.mana.length < maxMV))) best = null;
    if (best) return best.a;
  }

  // 唱える・起動する
  let best: { a: Action; s: number } | null = null;
  for (const a of options) {
    let s = -Infinity;
    if (a.type === "cast") s = scoreCast(g, p, a, main);
    else if (a.type === "activate") s = scoreActivate(g, p, a);
    else if (a.type === "equip") s = main && g.step === "main1" && g.find(a.uid)?.attachedTo == null ? 2.2 : -1;
    else if (a.type === "cycle") s = scoreCycle(g, p, a.uid);
    else if (a.type === "summon")
      s =
        a.via === "entrata" ? scoreEntrata(g, p, a.uid)
        : a.via === "pioneer" ? scorePioneer(g, p, a.uid)
        : a.via === "assemble" ? scoreAssemble(g, p, a.uid)
        : a.via === "evolve" ? scoreEvolve(g, p, a.uid)
        : a.via === "curtain" ? scoreCurtain(g, p, a.uid)
        : scoreSummon(g, p, a.uid);
    if (s > 0 && (!best || s > best.s)) best = { a, s };
  }
  return best?.a ?? pass;
}

function scoreCycle(g: Game, p: PlayerId, uid: number): number {
  const o = g.find(uid);
  if (!o) return -1;
  const me = g.players[p];
  const late = (g.step === "main2" && g.active === p) || (g.step === "end" && g.active !== p);
  if (!late) return -1;
  const tooBig = manaValue(o.card.cost) > me.mana.length + 2;
  return tooBig || me.hand.length >= 5 ? 0.9 : -1;
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
    if (!main) return -1;
    if (auraIsHarmful(c)) {
      const best = Math.max(0, ...g.creatures(opp).filter((x) => g.canAttack(x) || !x.tapped).map((x) => creatureValue(g, x)));
      return best >= 3 ? best : -1;
    }
    return g.creatures(p).length ? 2.5 + manaValue(c.cost) * 0.3 : -1;
  }
  if (c.type === "エンチャント" || c.type === "アーティファクト") return main ? 2 + manaValue(c.cost) * 0.4 : -1;
  const sp = spellAbility(c);
  if (!sp) return -1;
  // インスタントは相手の終了ステップや戦闘中に使う方がよいものもある
  const evalMode = (effects: Effect[], targets: TargetSpec[]) => {
    let v = 0;
    for (const e of effects) v += effectValue(g, p, e, targets, inCombat);
    if (isInstantCard(c) && main && effects.some((e) => e.do === "counter")) return -1;
    if (effects.some((e) => (e.do === "pump" && (e.p as number) > 0) || e.do === "pumpAll") && !inCombat && !isCombatStart(g, p)) {
      // 戦闘外の強化は無駄が多い
      v -= 3;
    }
    return v;
  };
  if (isInstantCard(c) && !main && !oppEnd && !inCombat) return -1;
  // モード呪文は、いま選べるモードのうち一番よいもので評価する
  let v = sp.modes
    ? Math.max(-1, ...sp.modes.filter((m) => (m.targets ?? []).every((t) => g.targetOptions(t, p).length > 0)).map((m) => evalMode(m.effects, m.targets ?? [])))
    : evalMode(sp.effects, sp.targets ?? []);
  const b = burnAbility(c);
  if (b) v += 0.3;
  // 唱えると喝采【狂気】が溜まる
  if (v > 0 && applauseRoom(g, p, "狂気")) v += 0.6;
  return v > 0.8 ? v : -1;
}

/** 相手につけるオーラか(攻撃不能や、マイナス修整) */
function auraIsHarmful(c: Card): boolean {
  return abilitiesOf(c).some((a) => a.a === "static" && (a.st.s === "pacify" || (a.st.s === "auraBuff" && a.st.p + a.st.t < 0)));
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
  const n = (x: unknown, fallback = 1) =>
    typeof x === "number" ? x : x === "X" ? g.maxX(p, "{X}") : typeof x === "object" && x
        ? (x as { count: string }).count === "burned"
          ? Math.max(1, Math.min(5, me.mana.length - 3))
          : g.count(x as Amount, p)
        : fallback;
  const bestKillable = (dmg: number) =>
    Math.max(0, ...oppCreatures.filter((o) => !g.hasKw(o, "呪禁") && g.toughness(o) - o.damage <= dmg).map((o) => creatureValue(g, o)));
  const bestOpp = Math.max(0, ...oppCreatures.filter((o) => !g.hasKw(o, "呪禁")).map((o) => creatureValue(g, o)));
  switch (e.do) {
    case "damage": {
      if (e.to === "opp") return them.life <= n(e.n) ? 50 : n(e.n) * 0.8;
      const dmg = n(e.n, 3);
      const spec = targets[e.tg ?? 0];
      if (spec?.t === "player") return them.life <= dmg ? 50 : dmg * 0.8;
      if (spec?.t === "any" && them.life <= dmg) return 50;
      const k = bestKillable(dmg);
      if (k > 0) return k + 0.5;
      return spec?.t === "any" ? dmg * 0.5 : 0;
    }
    case "damageAll": {
      const dmg = n(e.n, 2);
      const theirs = oppCreatures.filter((o) => g.toughness(o) <= dmg).reduce((s, o) => s + creatureValue(g, o), 0);
      const mine = e.who === "opp" ? 0 : myCreatures.filter((o) => g.toughness(o) <= dmg).reduce((s, o) => s + creatureValue(g, o), 0);
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
      const mine = e.who === "opp" ? 0 : myCreatures.reduce((s, o) => s + creatureValue(g, o), 0);
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
      return myCreatures.length || e.self ? n(e.n) * 1.2 : 0;
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
      const pw = n(e.p, 1);
      const t = n(e.t, 1);
      return n(e.n, 1) * (pw * 1.2 + t * 0.8 + (e.kw?.length ?? 0) * 0.8);
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
    case "sacrifice": {
      const vs = oppCreatures.map((o) => creatureValue(g, o)).sort((a, b) => a - b).slice(0, e.n ?? 1);
      return vs.length ? vs.reduce((a, b) => a + b, 0) + vs.length : 0;
    }
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
    case "duel": {
      const winValue = (e.win ?? []).reduce((sum, w) => sum + Math.max(0, effectValue(g, p, w, targets, inCombat)), 0);
      if (e.self) return oppCreatures.filter((t) => !g.hasKw(t, "呪禁")).length ? 1.2 + winValue * 0.5 : 0;
      let best = 0;
      for (const mine of myCreatures)
        for (const t of oppCreatures) {
          if (g.hasKw(t, "呪禁")) continue;
          if (!kills(g, mine, t)) continue;
          const die = kills(g, t, mine) && !(duelFirst(g, mine) && !duelFirst(g, t));
          best = Math.max(best, creatureValue(g, t) - (die ? creatureValue(g, mine) : 0) + (die ? 0 : winValue));
        }
      return best;
    }
    case "lookTop":
      return 0.3;
    case "untap":
      return e.all ? myCreatures.filter((o) => o.tapped).length * 0.6 : 0.4;
    case "tutor":
      return e.to === "battlefield" ? 3 : e.to === "hand" ? 2 : 1.5;
    case "manifest": {
      const cands = me.mana.filter((o) => isCreatureCard(o.card) && manaValue(o.card.cost) <= e.maxMV);
      return cands.length ? Math.max(...cands.map((o) => cardCreatureValue(o.card))) * 0.8 + (e.haste ? 1 : 0) : 0;
    }
    case "plunder":
      return Math.min(e.n, them.mana.length) * 2.2;
    case "applause":
      return e.n * 0.6;
    case "heist":
      return me.extra.length ? Math.min(e.n, me.extra.length) * 1.4 : 0.8;
    case "selfToMana":
      return 1;
    case "addiction":
      return me.hand.some((x) => hasDiscardTrigger(x.card)) ? 0.5 : -1.5;
    case "create":
      // 生成したカードの価値(軽い呪文やトークンを想定)
      return e.n * (0.9 + Math.min(manaValue(e.card.cost), 4) * 0.25);
    case "ingest":
      // 自分のマナが増える(相手の山札も減る)
      return Math.min(e.n, them.library.length) * (me.mana.length < 9 ? 1.4 : 0.5) + (them.library.length <= e.n ? 15 : 0);
    case "veilOpp": {
      const cands = them.mana.filter((o) => !o.faceDown && (!e.crest || crestActive(o)) && (manaColors(o).length > 0 || crestActive(o)));
      return (e.all ? cands.length : Math.min(e.n, cands.length)) * 0.8;
    }
    case "shuffleGraveyard":
      return 0;
    case "veil": {
      // 虚無のカード(欠色が多いと強くなる)があるときだけ得
      const voidCards = [...me.hand, ...me.battlefield].filter((o) => o.card.tags?.includes("虚無")).length;
      const colored = me.mana.filter((o) => manaColors(o).length > 0).length;
      // 相手のマナの色や紋章を消せる分も得
      const theirs = them.mana.filter((o) => manaColors(o).length > 0 || crestActive(o)).length;
      return (voidCards ? Math.min(e.n, colored) * 0.6 : 0) + Math.min(e.n, theirs) * 0.8;
    }
    case "mill":
      return e.who === "opp" ? n(e.n, 1) * (them.library.length <= n(e.n, 1) ? 20 : 0.35) : n(e.n, 1) * 0.2;
    case "createMana": {
      if (!(g.step === "main1" || g.step === "main2") || g.active !== p) return 0;
      const untapped = me.mana.filter((o) => !o.tapped).length - 1;
      const enables = me.hand.some((o) => {
        const mv = manaValue(o.card.cost);
        return !spellAbility(o.card)?.effects.some((x) => x.do === "addMana" || x.do === "createMana") && mv > untapped && mv <= untapped + e.n;
      });
      return enables ? 2.5 : 0;
    }
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
  const inCombat = !!g.combat && g.step === "block";
  const effects = ab.effects;
  // 攻撃前に相手のブロッカーをタップする
  if (effects.some((e) => e.do === "tap")) {
    if (g.step === "main1" && g.active === p && g.creatures(p).some((x) => g.canAttack(x)) && g.creatures(opp).some((x) => !x.tapped)) return 1.5;
    return -1;
  }
  const pumps = effects.some((e) => e.do === "pump" || e.do === "pumpAll");
  if (pumps && !inCombat) return -1;
  if (!pumps && !(lateMain || oppEnd)) return -1;
  let value = 0;
  for (const e of effects) value += effectValue(g, p, e, ab.targets ?? [], inCombat);
  let cost = 0;
  if (ab.cost.sac) {
    const opts = g.sacOptions(p, ab.cost);
    const cheapest = Math.min(...opts.map((x) => creatureValue(g, x) - (x.token ? 2 : 0)));
    cost += Math.max(0.5, cheapest);
  }
  if (ab.cost.sacSelf) cost += (isCreatureCard(o.card) ? creatureValue(g, o) : 1.5) * (isExtraCard(o.card) ? 0.3 : 1);
  // 生け贄に捧げると喝采【悲劇】が溜まる
  if ((ab.cost.sac || ab.cost.sacSelf) && applauseRoom(g, p, "悲劇")) value += 0.9;
  if (ab.cost.life) cost += ab.cost.life * (g.players[p].life < 8 ? 1 : 0.3);
  if (ab.cost.discard) {
    // 陶酔のカードがあれば、捨てること自体が得になる
    const hand = g.players[p].hand.filter((x) => x.uid !== o.uid);
    cost += hand.some((x) => hasDiscardTrigger(x.card)) ? -1 : 1.3 * ab.cost.discard;
  }
  if (ab.cost.applause) {
    // 秘蔵庫にその喝采で出せる役者がいるなら、喝采は取っておきたい
    const cat = ab.cost.applause.cat;
    const saving = g.players[p].extra.some((x) => abilitiesOf(x.card).some((b) => b.a === "entrata" && b.cat === cat));
    cost += ab.cost.applause.n * (saving ? 0.9 : 0.4);
  }
  const score = value - cost;
  return score > 0.5 ? score : -1;
}

// ---------------------------------------------------------------- 対象
function harmful(e: Effect | undefined, index: number): boolean {
  if (!e) return true;
  switch (e.do) {
    case "pump":
      return (typeof e.p === "number" && e.p < 0) || (typeof e.t === "number" && e.t < 0);
    case "counters":
    case "returnCard":
    case "untap":
      return false;
    case "fight":
    case "bite":
      return index === 1;
    case "duel":
      return e.self ? index === 0 : index === 1;
    default:
      return true;
  }
}

function chooseTarget(g: Game, p: PlayerId, d: Extract<Decision, { kind: "target" }>): TargetRef {
  const opp = g.other(p);
  const effect = d.effects.find((e) => ("tg" in e && (Array.isArray(e.tg) ? e.tg.includes(d.index) : e.tg === d.index)) || false);
  const bad = isEquipment(d.source.card) ? false : isAura(d.source.card) ? auraIsHarmful(d.source.card) : harmful(effect, d.index);
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
      if (effect?.do === "duel" || effect?.do === "fight" || effect?.do === "bite") {
        // 決闘・格闘:自分のクリーチャーが倒せて、できれば生き残れる相手を選ぶ
        const fighter =
          effect.do === "duel" && effect.self
            ? d.source
            : [...g.creatures(p)].sort((a, b) => g.power(b) - g.power(a))[0];
        if (fighter) {
          const killable = theirs.filter((x) => kills(g, fighter, x.o));
          const safe = killable.filter(
            (x) => effect.do === "bite" || !kills(g, x.o, fighter) || (effect.do === "duel" && duelFirst(g, fighter) && !duelFirst(g, x.o)),
          );
          if (safe.length) pool = safe;
          else if (killable.length) pool = killable;
        }
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
    if (effect?.do === "fight" || effect?.do === "bite" || effect?.do === "duel") return [...mine].sort((a, b) => g.power(b.o) - g.power(a.o))[0].r;
    return [...mine].sort((a, b) => Number(inCombat(b.o)) - Number(inCombat(a.o)) || creatureValue(g, b.o) - creatureValue(g, a.o))[0].r;
  }
  return opts[0];
}

function cardScore(c: Card): number {
  return isCreatureCard(c) ? cardCreatureValue(c) + manaValue(c.cost) * 0.3 : manaValue(c.cost) * 0.5;
}

// ---------------------------------------------------------------- はい/いいえ
/** 数を決める(Xの値、烈燃の枚数) */
function chooseNumber(g: Game, p: PlayerId, d: Extract<Decision, { kind: "number" }>): number {
  if (d.reason !== "burn") return d.max;
  const me = g.players[p];
  const them = g.players[g.other(p)];
  // 相手のライフを削り切れるなら全部、そうでなければマナを3枚は残す
  const dealsToPlayer = d.obj && spellAbility(d.obj.card)?.targets?.some((t) => t.t === "any" || t.t === "player");
  if (dealsToPlayer && them.life <= d.max) return d.max;
  return Math.max(Math.min(1, d.max), Math.min(d.max, me.mana.length - 4));
}

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
    case "blessing":
      // ライブラリーに余裕があれば、マナと戦場を減らさずに済む方を選ぶ
      return me.library.length >= 12;
    case "kicker":
      return true;
    case "lookTop":
      return !!d.obj && manaValue(d.obj.card.cost) > me.mana.length + 3;
    case "may":
      return true;
  }
  return true;
}

// ---------------------------------------------------------------- カードを選ぶ
function chooseCards(g: Game, p: PlayerId, d: Extract<Decision, { kind: "chooseCards" }>): number[] {
  const objs = d.options.map((u) => g.find(u)).filter((o): o is Obj => !!o);
  const me = g.players[p];
  let sorted: Obj[] = objs;
  switch (d.reason) {
    case "pioneerBase":
      sorted = [...objs].sort((a, b) => creatureValue(g, a) - creatureValue(g, b));
      break;
    case "discard": {
      // 陶酔(捨てられたとき)を持つカードは、捨てると得をする
      const v = (c: Card) => keepValue(g, p, c) - (hasDiscardTrigger(c) ? 4 : 0);
      sorted = [...objs].sort((a, b) => v(a.card) - v(b.card));
      break;
    }
    case "heist": {
      // 宝石獣(マナ解放で出る)を優先してマナに置く。ほかは価値の低いものから
      const v = (o: Obj) => (abilitiesOf(o.card).some((a) => a.a === "gem") ? -10 + manaValue(o.card.cost) * 0.1 : cardCreatureValue(o.card));
      sorted = [...objs].sort((a, b) => v(a) - v(b));
      break;
    }
    case "bottom":
      sorted = [...objs].sort((a, b) => keepValue(g, p, a.card) - keepValue(g, p, b.card));
      break;
    case "burn": {
      const need = colorNeed(g, p);
      // 紋章を持つカードはマナゾーンに残す
      const score = (o: Obj) =>
        (o.tapped ? 0 : 10) + (crestActive(o) ? 30 : 0) + manaColors(o).reduce((s, c) => s + Math.max(0, need[c]), 0);
      sorted = [...objs].sort((a, b) => score(a) - score(b));
      break;
    }
    case "reclaim":
      sorted = [...objs].sort(
        (a, b) => cardScore(b.card) - (hasCrest(b.card) ? 6 : 0) - (cardScore(a.card) - (hasCrest(a.card) ? 6 : 0)) + (b.tapped ? 1 : 0) - (a.tapped ? 1 : 0),
      );
      break;
    case "erode":
      // 相手の紋章を優先して奪う・壊す
      sorted = [...objs].sort(
        (a, b) =>
          Number(crestActive(b)) - Number(crestActive(a)) ||
          Number(a.tapped) - Number(b.tapped) ||
          manaColors(b).length - manaColors(a).length,
      );
      break;
    case "veil": {
      // 使わない色のカードから裏向きにする。紋章やマナ解放を持つカードは残す
      const need = colorNeed(g, p);
      const score = (o: Obj) =>
        (crestActive(o) ? 30 : 0) +
        (releaseAbility(o.card) ? 10 : 0) +
        (manaColors(o).length === 0 ? 5 : 0) +
        manaColors(o).reduce((s, c) => s + Math.max(0, need[c]) * 3, 0);
      sorted = [...objs].sort((a, b) => score(a) - score(b));
      break;
    }
    case "sacrifice":
    case "sacCost":
      sorted = [...objs].sort((a, b) => creatureValue(g, a) - (a.token ? 2 : 0) - (creatureValue(g, b) - (b.token ? 2 : 0)));
      break;
    case "tutor":
      sorted = [...objs].sort((a, b) => cardScore(b.card) - cardScore(a.card));
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
    if (can.length < g.minBlockers(a)) {
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

/** 攻撃クリーチャーが、このブロッカーたち(この順にダメージを割り振る)のうち倒すもの */
function killedByAttacker(g: Game, a: Obj, blockers: Obj[]): Obj[] {
  const deathtouch = g.hasKw(a, "接死");
  let rem = g.power(a) * (g.hasKw(a, "二段攻撃") ? 2 : 1);
  const killed: Obj[] = [];
  for (const b of blockers) {
    if (rem <= 0) break;
    const lethal = deathtouch ? 1 : Math.max(1, g.toughness(b) - b.damage);
    if (rem >= lethal) {
      if (!g.hasKw(b, "破壊不能") || deathtouch) killed.push(b);
      rem -= lethal;
    } else rem = 0;
  }
  return killed.filter((b) => !g.hasKw(b, "破壊不能"));
}

/** ブロッカーたちで攻撃クリーチャーを倒せるか(先制攻撃で先に倒されるものは数えない) */
function blockersKill(g: Game, a: Obj, blockers: Obj[]): boolean {
  if (g.hasKw(a, "破壊不能") || !blockers.length) return false;
  const firstStrike = g.hasKw(a, "先制攻撃") || g.hasKw(a, "二段攻撃");
  const dead = firstStrike ? killedByAttacker(g, a, blockers) : [];
  const dealing = blockers.filter((b) => !dead.includes(b) || g.hasKw(b, "先制攻撃") || g.hasKw(b, "二段攻撃"));
  if (dealing.some((b) => g.hasKw(b, "接死") && g.power(b) > 0)) return true;
  const total = dealing.reduce((s, b) => s + Math.max(0, g.power(b)) * (g.hasKw(b, "二段攻撃") ? 2 : 1), 0);
  return total >= g.toughness(a) - a.damage;
}

/** ブロックされたときに自分に届く戦闘ダメージ */
function damageThrough(g: Game, a: Obj, blockers: Obj[]): number {
  const mult = g.hasKw(a, "二段攻撃") ? 2 : 1;
  const pw = Math.max(0, g.power(a));
  const blocked = blockers.length >= g.minBlockers(a);
  if (!blocked) return pw * mult;
  if (!g.hasKw(a, "トランプル")) return 0;
  const deathtouch = g.hasKw(a, "接死");
  const absorb = blockers.reduce((s, b) => s + (deathtouch ? 1 : Math.max(0, g.toughness(b) - b.damage)), 0);
  return Math.max(0, pw - absorb) * mult;
}

/** 組み合わせ(size 個)を列挙する */
function combos<T>(xs: T[], size: number): T[][] {
  if (size === 0) return [[]];
  if (xs.length < size) return [];
  const [head, ...rest] = xs;
  return [...combos(rest, size - 1).map((c) => [head, ...c]), ...combos(rest, size)];
}

export function chooseBlocks(g: Game, p: PlayerId, attackerIds: number[], blockerIds: number[]): BlockAnswer {
  const attackers = attackerIds
    .map((u) => g.find(u))
    .filter((o): o is Obj => !!o)
    .sort((a, b) => creatureValue(g, b) - creatureValue(g, a));
  const free = blockerIds.map((u) => g.find(u)).filter((o): o is Obj => !!o);
  const myLife = g.players[p].life;
  const assign = new Map<Obj, Obj[]>();
  const value = (o: Obj) => creatureValue(g, o) - (o.token ? 1 : 0);
  // ブロッカーは価値の低い順に並べる(攻撃側のダメージは前から割り振られる)
  const ordered = (bs: Obj[]) => [...bs].sort((x, y) => value(x) - value(y));
  const take = (a: Obj, bs: Obj[]) => {
    assign.set(a, ordered([...(assign.get(a) ?? []), ...bs]));
    // 鉄壁は何体でもブロックできるので、残しておく
    for (const b of bs) if (!g.hasKw(b, "鉄壁")) free.splice(free.indexOf(b), 1);
  };
  const lost = (a: Obj, bs: Obj[]) => killedByAttacker(g, a, ordered(bs)).reduce((s, b) => s + value(b), 0);
  const totalThrough = () => attackers.reduce((s, a) => s + damageThrough(g, a, assign.get(a) ?? []), 0);

  // 1) 1体で得をするブロック:一方的に倒す、倒されない、価値の低いもので相打ち
  for (const a of attackers) {
    if (g.minBlockers(a) > 1) continue;
    const can = free.filter((b) => g.canBlock(b, a));
    const byValue = (xs: Obj[]) => [...xs].sort((x, y) => value(x) - value(y));
    const great = byValue(can.filter((b) => blockersKill(g, a, [b]) && !lost(a, [b])));
    const safe = byValue(can.filter((b) => !lost(a, [b]) && (!g.hasKw(a, "トランプル") || damageThrough(g, a, [b]) < g.power(a))));
    const trade = byValue(can.filter((b) => blockersKill(g, a, [b]) && value(b) <= value(a) + 0.3));
    const pick = great[0] ?? safe[0] ?? trade[0];
    if (pick) take(a, [pick]);
  }

  // 2) 複数体で囲んで倒す:倒せて、失うものより得るものが大きいとき
  for (const a of attackers) {
    if (assign.get(a)?.length) continue;
    const can = free.filter((b) => g.canBlock(b, a)).slice(0, 9);
    let best: { bs: Obj[]; net: number } | null = null;
    for (const size of [2, 3]) {
      if (size < g.minBlockers(a)) continue;
      for (const bs of combos(can, size)) {
        if (!blockersKill(g, a, bs)) continue;
        const net = value(a) - lost(a, bs) + damageThrough(g, a, []) * 0.15 - damageThrough(g, a, bs) * 0.15;
        if (net > 0.5 && (!best || net > best.net)) best = { bs, net };
      }
      if (best) break;
    }
    if (best) take(a, best.bs);
  }

  // 3) このままだと負けるなら、ダメージを一番減らせるように残りのブロッカーを足していく
  //    (トランプル相手には何体も重ねて受け止める)
  for (let guard = 0; guard < 20 && totalThrough() >= myLife && free.length; guard++) {
    let best: { a: Obj; bs: Obj[]; gain: number; cost: number } | null = null;
    for (const a of attackers) {
      const cur = assign.get(a) ?? [];
      const before = damageThrough(g, a, cur);
      if (before <= 0) continue;
      const can = free.filter((b) => g.canBlock(b, a) && !cur.includes(b));
      const need = Math.max(1, g.minBlockers(a) - cur.length);
      const options = need > 1 ? combos(can.slice(0, 8), need) : can.map((b) => [b]);
      for (const bs of options) {
        const gain = before - damageThrough(g, a, [...cur, ...bs]);
        if (gain <= 0) continue;
        const cost = bs.reduce((s, b) => s + value(b), 0);
        if (!best || gain > best.gain || (gain === best.gain && cost < best.cost)) best = { a, bs, gain, cost };
      }
    }
    if (!best) break;
    take(best.a, best.bs);
  }

  const out: BlockAnswer = {};
  for (const [a, bs] of assign) if (bs.length) out[a.uid] = bs.map((b) => b.uid);
  return out;
}

// ---------------------------------------------------------------- モード呪文・リリース召喚
function chooseMode(g: Game, p: PlayerId, d: Extract<Decision, { kind: "mode" }>): number {
  let best = 0;
  let bestV = -Infinity;
  d.modes.forEach((m, i) => {
    const inCombat = !!g.combat && g.step === "block";
    let v = m.effects.reduce((s, e) => s + effectValue(g, p, e, m.targets ?? [], inCombat), 0);
    if (m.effects.some((e) => (e.do === "pump" && (e.p as number) > 0) || e.do === "pumpAll") && !inCombat && !isCombatStart(g, p)) v -= 3;
    if (v > bestV) {
      bestV = v;
      best = i;
    }
  });
  return best;
}

/** リリースの素材として失う価値 */
function fodderWorth(g: Game, p: PlayerId, o: Obj): number {
  // マナゾーンのカード:マナが育っているほど手放しやすい
  if (o.zone === "mana") {
    const n = g.players[p].mana.length;
    const base = n >= 10 ? 0.4 : n >= 8 ? 1.0 : n >= 6 ? 2.0 : 3.5;
    // 埋蔵を持つカードは、開拓に使うために置いてある
    return abilitiesOf(o.card).some((a) => a.a === "buried") ? base * 0.5 : base;
  }
  if (o.token && !isCreatureCard(o.card)) return 0.3;
  if (isCreatureCard(o.card)) return creatureValue(g, o);
  // エンチャント:オーラや全体強化など、場で働いているものは少し高く見る
  const statics = abilitiesOf(o.card).filter((a) => a.a === "static" || a.a === "trigger").length;
  return 0.6 + statics * 0.8 + (o.attachedTo != null ? 0.8 : 0);
}

/** 合計が min 以上になる、失う価値のできるだけ小さい組み合わせ */
function pickFodder(g: Game, p: PlayerId, items: { o: Obj; value: number }[], min: number, minCount = 0): { o: Obj; value: number }[] {
  // 価値1あたりの損が小さい順に入れ、最後に余分なものを外す
  const sorted = [...items].sort((a, b) => fodderWorth(g, p, a.o) / Math.max(1, a.value) - fodderWorth(g, p, b.o) / Math.max(1, b.value));
  const picked: { o: Obj; value: number }[] = [];
  let sum = 0;
  for (const x of sorted) {
    if (sum >= min) break;
    picked.push(x);
    sum += x.value;
  }
  for (const x of [...picked].sort((a, b) => fodderWorth(g, p, b.o) - fodderWorth(g, p, a.o)))
    if (sum - x.value >= min && picked.length > minCount) {
      picked.splice(picked.indexOf(x), 1);
      sum -= x.value;
    }
  return picked;
}

function chooseSum(g: Game, p: PlayerId, d: Extract<Decision, { kind: "chooseSum" }>): number[] {
  const items = d.options.map((uid, i) => ({ o: g.find(uid)!, value: d.values[i] })).filter((x) => x.o);
  const picked = pickFodder(g, p, items, d.min, d.minCount ?? 0);
  // 枚数が足りなければ、価値の低いものを足す
  for (const x of [...items].sort((a, b) => fodderWorth(g, p, a.o) - fodderWorth(g, p, b.o)))
    if (picked.length < (d.minCount ?? 0) && !picked.includes(x)) picked.push(x);
  return picked.map((x) => x.o.uid);
}

/** 開拓進化の評価:出てくる体 − 素材のクリーチャー − 墓地に置くカード */
function scorePioneer(g: Game, p: PlayerId, uid: number): number {
  const o = g.players[p].extra.find((x) => x.uid === uid);
  const pi = o ? (abilitiesOf(o.card).find((a) => a.a === "pioneer") as { n: number; grand?: boolean } | undefined) : undefined;
  if (!o || !pi || !(g.step === "main1" || g.step === "main2")) return -1;
  const bases = g.pioneerBases(p, o);
  if (!bases.length) return -1;
  const base = [...bases].sort((a, b) => creatureValue(g, a) - creatureValue(g, b))[0];
  const me = g.players[p];
  const gain = cardCreatureValue(o.card) + 2 + (pi.grand ? 6 : 0);
  // 加護があり、ライブラリーに余裕があれば、山札を削る(損はほぼない)
  if (me.blessings.includes(BLESSING_ELDORADO) && me.library.length >= 12) return gain - creatureValue(g, base);
  const fodder = g.pioneerFodder(p, base);
  const picked = pickFodder(g, p, fodder, pi.n, pi.grand ? 3 : 1);
  if (picked.reduce((s, x) => s + x.value, 0) < pi.n) return -1;
  const loss = picked.reduce((s, x) => s + fodderWorth(g, p, x.o), 0);
  return gain - creatureValue(g, base) - loss;
}

function scoreAssemble(g: Game, p: PlayerId, uid: number): number {
  if (!(g.step === "main1")) return -1;
  return g.players[p].extra.some((x) => x.uid === uid) ? 3 : -1;
}

function scoreEvolve(g: Game, p: PlayerId, uid: number): number {
  const inv = g.find(uid);
  if (!inv || inv.attachedTo == null) return -1;
  const holder = g.find(inv.attachedTo);
  const partnerId = (abilitiesOf(inv.card).find((a) => a.a === "assemble") as { partner: string } | undefined)?.partner;
  const partner = g.players[p].extra.find((x) => x.card.id === partnerId);
  if (!holder || !partner) return -1;
  return cardCreatureValue(partner.card) - creatureValue(g, holder) + 1;
}

/** 行動でその喝采がまだ溜まるか(デッキに関係があり、このターンの上限に達していない) */
function applauseRoom(g: Game, p: PlayerId, cat: Applause): boolean {
  const pl = g.players[p];
  return pl.applause[cat] !== undefined && (pl.applauseThisTurn[cat] ?? 0) < APPLAUSE_CAP[cat];
}

function scoreCurtain(g: Game, p: PlayerId, uid: number): number {
  const o = g.players[p].extra.find((x) => x.uid === uid);
  const cc = o ? (abilitiesOf(o.card).find((a) => a.a === "curtainCall") as { base: string } | undefined) : undefined;
  const base = cc ? g.players[p].battlefield.find((x) => x.card.id === cc.base) : undefined;
  if (!o || !base || !(g.step === "main1" || g.step === "main2")) return -1;
  return cardCreatureValue(o.card) - creatureValue(g, base) + 3;
}

function scoreEntrata(g: Game, p: PlayerId, uid: number): number {
  const o = g.players[p].extra.find((x) => x.uid === uid);
  if (!o || !(g.step === "main1" || g.step === "main2")) return -1;
  const en = abilitiesOf(o.card).find((a) => a.a === "entrata") as { n: number } | undefined;
  if (!en) return -1;
  // 座長(カーテンコール)の土台になる化身は、早めに出しておく
  const base = g.players[p].extra.some((x) => abilitiesOf(x.card).some((a) => a.a === "curtainCall" && a.base === o.card.id)) ? 3 : 0;
  return cardCreatureValue(o.card) + 1.5 - en.n * 0.1 + base;
}

function scoreSummon(g: Game, p: PlayerId, uid: number): number {
  const o = g.players[p].extra.find((x) => x.uid === uid);
  if (!o || !(g.step === "main1" || g.step === "main2")) return -1;
  const r = abilitiesOf(o.card).find((a) => a.a === "releaseSummon") as { n: number } | undefined;
  if (!r) return -1;
  const picked = pickFodder(g, p, g.releaseFodder(p, o), r.n);
  const loss = picked.reduce((s, x) => s + fodderWorth(g, p, x.o), 0);
  const gain = cardCreatureValue(o.card) + 1;
  return gain - loss;
}
