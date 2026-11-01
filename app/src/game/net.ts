/**
 * オンライン対戦。
 * 両方の端末で同じ対戦(同じシード・同じデッキ)を同時に計算し、自分の選択だけを送り合う。
 * 自動でパスする場面は両方の端末で同じように判定できるので、送らない。
 */
import type { Action, Agent, Decision, Game, PlayerId } from "./engine";
import { autoPass, type HumanAgent } from "./human";
import type { DeckCards } from "../types";

export type Seat = { name: string; deckName: string; deck: DeckCards };

export type NetMsg =
  /** with:部屋を作った側が、いま組んでいる相手の id(3人目を断るため) */
  | { t: "hello"; id: string; name: string; deckName: string; deck: DeckCards | null; ready: boolean; host: boolean; ver: string; with?: string | null }
  | { t: "start"; game: number; seed: number; first: PlayerId; seats: [Seat, Seat] }
  | { t: "act"; game: number; seq: number; a: unknown }
  | { t: "need"; game: number; from: number }
  | { t: "rematch"; game: number }
  | { t: "end"; game: number };

/** 1つの対戦の選択の通し番号と、受け取った相手の選択 */
export class Sync {
  private n = 0;
  private mine = new Map<number, unknown>();
  private theirs = new Map<number, unknown>();
  private waiters = new Map<number, (a: unknown) => void>();
  private timer: ReturnType<typeof setInterval> | 0 = 0;

  constructor(
    readonly game: number,
    private send: (m: NetMsg) => void,
  ) {}

  next() {
    return this.n++;
  }

  sent(seq: number, a: unknown) {
    this.mine.set(seq, a);
    this.send({ t: "act", game: this.game, seq, a });
  }

  receive(seq: number, a: unknown) {
    if (this.theirs.has(seq)) return;
    this.theirs.set(seq, a);
    const w = this.waiters.get(seq);
    if (w) {
      this.waiters.delete(seq);
      if (!this.waiters.size) this.stopAsking();
      w(a);
    }
  }

  wait(seq: number): Promise<unknown> {
    if (this.theirs.has(seq)) return Promise.resolve(this.theirs.get(seq));
    return new Promise((resolve) => {
      this.waiters.set(seq, resolve);
      // 届かなかったとき(一時的な切断など)のために、待っている番号から送り直してもらう
      this.stopAsking();
      this.timer = globalThis.setInterval(() => this.send({ t: "need", game: this.game, from: seq }), 4000);
    });
  }

  /** 相手が取りこぼした分を送り直す */
  resend(from: number) {
    for (const [seq, a] of this.mine) if (seq >= from) this.send({ t: "act", game: this.game, seq, a });
  }

  stopAsking() {
    if (this.timer) globalThis.clearInterval(this.timer);
    this.timer = 0;
  }
}

const PASS: Action = { type: "pass" };
const skip = (g: Game, p: PlayerId, d: Decision) => d.kind === "action" && autoPass(g, p, d.options);

/** この端末のプレイヤー:画面で選んだ答えを相手に送る */
export class NetLocalAgent implements Agent {
  constructor(
    private human: HumanAgent,
    private sync: Sync,
  ) {}

  async decide(g: Game, p: PlayerId, d: Decision): Promise<unknown> {
    if (skip(g, p, d)) return PASS;
    const seq = this.sync.next();
    const a = await this.human.decide(g, p, d);
    this.sync.sent(seq, a);
    return a;
  }
}

/** 相手のプレイヤー:相手から届いた答えを使う */
export class NetRemoteAgent implements Agent {
  constructor(private sync: Sync) {}

  decide(g: Game, p: PlayerId, d: Decision): Promise<unknown> {
    if (skip(g, p, d)) return Promise.resolve(PASS);
    return this.sync.wait(this.sync.next());
  }
}
