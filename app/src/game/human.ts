/**
 * 人間のプレイヤー。エンジンからの質問を画面に出し、クリックで答える。
 */
import type { Action, Agent, Decision, Game, PlayerId } from "./engine";
import { getBattleSettings } from "../lib/battleSettings";

export type Pending = { decision: Decision; answer: (a: unknown) => void };

export class HumanAgent implements Agent {
  pending: Pending | null = null;
  private listeners = new Set<() => void>();

  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private emit() {
    for (const fn of this.listeners) fn();
  }

  decide(g: Game, p: PlayerId, d: Decision): Promise<unknown> {
    if (d.kind === "action" && autoPass(g, p, d.options)) return Promise.resolve({ type: "pass" } satisfies Action);
    const set = getBattleSettings();
    // 相手のターンのインスタント確認をオフにしていれば、相手のターンは止まらない
    if (d.kind === "action" && !set.oppInstants && g.active !== p) return Promise.resolve({ type: "pass" } satisfies Action);
    // マナの支払い:完全オートなら、おまかせの払い方で払う
    if (d.kind === "payMana" && set.payMode === "auto") return Promise.resolve(d.suggested);
    return new Promise((resolve) => {
      this.pending = {
        decision: d,
        answer: (a) => {
          this.pending = null;
          this.emit();
          resolve(a);
        },
      };
      this.emit();
    });
  }
}

/**
 * 止まる必要のない場面では自動でパスする。
 * 止まるのは:自分のメイン、相手の呪文への対応、ブロック後(両者)、相手の攻撃宣言後、相手の終了ステップ。
 */
export function autoPass(g: Game, p: PlayerId, options: Action[]): boolean {
  const mainOwn = (g.step === "main1" || g.step === "main2") && g.active === p && g.stack.length === 0;
  if (mainOwn) return false;
  if (options.length <= 1) return true;
  const top = g.stack[g.stack.length - 1];
  if (top) return top.controller === p;
  if (g.step === "block") return false;
  if (g.active !== p && (g.step === "attack" || g.step === "end")) return false;
  return true;
}
