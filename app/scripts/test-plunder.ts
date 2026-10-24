/**
 * npm run test:plunder
 * 略奪のテスト:略奪を持つカードを1枚ずつ、相手のマナゾーンの状態(枚数・裏向き・タップ)を変えて唱え、
 * 選択肢の数・選べる枚数・実際に移った枚数が合っているかを確かめる。
 */
import cardsJson from "../../cards/cards.json";
import decksJson from "../../cards/decks.json";
import type { Card } from "../src/types";
import { Game, type Action, type Decision, type PlayerId, type Obj } from "../src/game/engine";
import { CpuAgent } from "../src/game/ai";

const cards = cardsJson as Card[];
const byId = new Map(cards.map((c) => [c.id, c]));
const decks = decksJson as { id: string; cards: Record<string, number> }[];
const expand = (l: Record<string, number>) => Object.entries(l).flatMap(([id, n]) => Array.from({ length: n }, () => byId.get(id)!));
const plunderCards = cards.filter((c) => JSON.stringify(c.abilities).includes('"plunder"'));
const nOf = (c: Card) => (JSON.stringify(c.abilities).match(/"do":"plunder","n":(\d)/) ?? [])[1];

type Rec = { card: string; scenario: string; problems: string[] };
const results: Rec[] = [];

class Tester extends CpuAgent {
  setupDone = false;
  rec: Rec;
  card: Card;
  sc: { up: number; down: number; tapped: number; extra: string };
  expectN: number;
  oppBefore: Obj[] = [];
  myBefore = 0;
  asked = false;
  cast = false;
  checked = false;
  answer: number[] = [];
  constructor(card: Card, sc: Tester["sc"], rec: Rec) {
    super();
    this.card = card;
    this.sc = sc;
    this.rec = rec;
    this.expectN = Number(nOf(card));
  }
  async decide(g: Game, p: PlayerId, d: Decision): Promise<unknown> {
    const me = g.players[p];
    const opp = g.players[g.other(p)];
    // 自分のメインフェイズの最初の行動で、盤面を用意して唱える
    if (this.setupDone && !this.cast && d.kind === "action" && g.active === p && g.step === "main1" && g.stack.length === 0) {
      this.cast = true;
      this.oppBefore = [...opp.mana];
      this.myBefore = me.mana.length;
      const target = me.hand.find((x) => x.card.id === this.card.id)!;
      const act = d.options.find((a) => a.type === "cast" && (a as any).uid === target.uid) as Action | undefined;
      if (!act) { this.rec.problems.push(`唱えられない(選択肢: ${d.options.map((a) => a.type).join(",")})`); this.checked = true; return { type: "pass" }; }
      return act;
    }
    if (!this.setupDone && d.kind === "action" && g.active === p && g.step === "main1" && g.stack.length === 0) {
      this.setupDone = true;
      const lib = me.library;
      // 自分:欠色マナ12枚(裏向き)と、テストするカード
      for (let i = 0; i < 12; i++) {
        const o = lib.find((x) => x.card.id !== this.card.id)!;
        lib.splice(lib.indexOf(o), 1);
        o.zone = "mana"; o.tapped = false; o.faceDown = true; me.mana.push(o);
      }
      // 色マナが要るカードのために、その色のカードも置く
      for (const col of ["B", "U", "R", "G", "W"]) if (this.card.cost.includes(`{${col}}`)) {
        const src = cards.find((c) => c.cost === `{${col}}` || c.cost === `{1}{${col}}`)!;
        for (let i = 0; i < 2; i++) { const o = (g as any).newObj(src, p, "mana"); o.tapped = false; me.mana.push(o); }
      }
      let target = me.hand.find((x) => x.card.id === this.card.id) ?? lib.find((x) => x.card.id === this.card.id)!;
      if (target.zone === "library") { lib.splice(lib.indexOf(target), 1); target.zone = "hand"; me.hand.push(target); }
      // 相手のマナゾーンを作り直す
      const olib = g.players[g.other(p)].library;
      for (const o of [...opp.mana]) { opp.mana.splice(opp.mana.indexOf(o), 1); o.zone = "library"; olib.push(o); }
      const mk = (fd: boolean, tapped: boolean) => { const o = olib.shift()!; o.zone = "mana"; o.faceDown = fd; o.tapped = tapped; opp.mana.push(o); };
      for (let i = 0; i < this.sc.up; i++) mk(false, false);
      for (let i = 0; i < this.sc.down; i++) mk(true, i % 2 === 0);
      for (let i = 0; i < this.sc.tapped; i++) mk(false, true);
      // 追加の状況:自分の場に鼓動・仲間が出たときの誘発を置く
      if (this.sc.extra === "triggers") {
        for (const id of ["hrt04", "aw28", "aw33"]) { const c = byId.get(id); if (c) { const o = (g as any).newObj(c, p, id === "hrt04" ? "battlefield" : "mana"); (id === "hrt04" ? me.battlefield : me.mana).push(o); } }
      }
      // 選択肢を作り直させるため、いったんパス以外の安全な行動をする(なければ次の判断で唱える)
      const charge = d.options.find((a) => a.type === "charge" && g.find((a as any).uid)?.card.id !== this.card.id);
      if (charge) return charge;
      return super.decide(g, p, d);
    }
    if (d.kind === "chooseCards" && d.prompt.startsWith("略奪") && this.cast && !this.asked) {
      this.asked = true;
      const expectCount = Math.min(this.expectN, opp.mana.length);
      if (d.count !== expectCount) this.rec.problems.push(`選ぶ枚数 ${d.count}(期待 ${expectCount}、相手のマナ ${opp.mana.length})`);
      if (d.options.length !== opp.mana.length) this.rec.problems.push(`選択肢 ${d.options.length} ≠ 相手のマナ ${opp.mana.length}`);
      // 裏向き・タップのカードを優先して選ぶ(おかしくなりやすいところ)
      const order = [...d.options].sort((a, b) => Number(!!g.find(b)?.faceDown) - Number(!!g.find(a)?.faceDown));
      this.answer = order.slice(0, d.count);
      return this.answer;
    }
    // 略奪が解決したあと、最初の判断で結果を確かめる
    if (this.cast && !this.checked && !(d.kind === "chooseCards" && d.prompt.startsWith("略奪"))) {
      const resolved = !g.stack.some((s) => s.obj.card.id === this.card.id || (s.kind === "trigger" && s.obj.card.id === this.card.id));
      if (resolved && g.players[p].battlefield.concat(g.players[p].graveyard).some((o) => o.card.id === this.card.id) || (resolved && this.asked)) {
        this.checked = true;
        const expected = Math.min(this.expectN, this.oppBefore.length);
        const moved = this.oppBefore.filter((o) => o.zone === "mana" && o.controller === p && me.mana.includes(o));
        // 相手に打ち消された・出る前に除去されたときは、略奪が起きないのが正しい
        if (g.log.some((l) => l.text === `${this.card.name}が打ち消された`)) { this.rec.problems = []; this.rec.scenario += "(打ち消されたので対象外)"; return super.decide(g, p, d); }
        if (!this.asked && this.oppBefore.length > this.expectN) this.rec.problems.push("略奪の質問が来なかった");
        if (moved.length !== expected) this.rec.problems.push(`移った枚数 ${moved.length}(期待 ${expected}) 選んだ ${this.answer.length}`);
        for (const u of this.answer) { const o = g.find(u); if (!o || o.zone !== "mana" || !me.mana.includes(o)) this.rec.problems.push(`選んだカード uid${u} が自分のマナにない(${o?.zone}, 持ち主${o?.owner})`); }
        for (const o of moved) if (!o.faceDown) this.rec.problems.push(`${o.card.name} が表向きのまま`);
        if (opp.mana.some((o) => moved.includes(o))) this.rec.problems.push("相手のマナにも残っている");
      }
    }
    return super.decide(g, p, d);
  }
}

const scenarios = [
  { up: 5, down: 0, tapped: 0, extra: "" },
  { up: 2, down: 2, tapped: 1, extra: "" },
  { up: 0, down: 3, tapped: 0, extra: "" },
  { up: 1, down: 1, tapped: 0, extra: "" },
  { up: 0, down: 1, tapped: 0, extra: "" },
  { up: 0, down: 0, tapped: 1, extra: "" },
  { up: 3, down: 3, tapped: 3, extra: "triggers" },
  { up: 0, down: 2, tapped: 0, extra: "triggers" },
];
const oppDecks = ["gw", "ub", "t-void", "t-crest", "rw"];
for (const card of plunderCards) {
  for (const sc of scenarios) {
    for (let seed = 1; seed <= 4; seed++) {
      const rec: Rec = { card: `${card.id} ${card.name}`, scenario: `表${sc.up} 裏${sc.down} タップ${sc.tapped} ${sc.extra}`, problems: [] };
      const filler = expand(decks.find((x) => x.id === "t-void")!.cards).filter((c) => !JSON.stringify(c.abilities).includes("plunder")).slice(0, 36);
      const myDeck = [...filler, card, card, card, card];
      const tester = new Tester(card, sc, rec);
      const g = new Game({ decks: [myDeck, expand(decks.find((x) => x.id === oppDecks[seed % oppDecks.length])!.cards)], names: ["テスト", "相手"], agents: [tester, new CpuAgent()], seed: seed * 13 + card.id.length, first: 0, maxTurns: 6 });
      try { await g.run(); } catch (e) { rec.problems.push(`エラー: ${(e as Error).message}`); }
      if (!tester.setupDone) rec.problems.push("盤面を用意できなかった");
      else if (!tester.checked) rec.problems.push(`結果を確かめられなかった(質問 ${tester.asked}) ログ: ${g.log.slice(-5).map((l) => l.text).join(" | ")}`);
      results.push(rec);
    }
  }
}
const bad = results.filter((r) => r.problems.length);
const skipped = results.filter((r) => r.scenario.includes("対象外")).length;
if (skipped) console.log(`打ち消されたので対象外: ${skipped}回`);
console.log(`試した回数 ${results.length}(カード ${plunderCards.length}種類 × 盤面 ${scenarios.length}通り × 4) / 問題あり ${bad.length}`);
for (const r of bad.slice(0, 25)) console.log(`- ${r.card} [${r.scenario}] ${r.problems.join(" / ")}`);
