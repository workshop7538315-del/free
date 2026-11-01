// オンライン対戦の同期テスト:2つの端末を模して、同じ結果・同じログになるかを確かめる
import cardsJson from "../../cards/cards.json";
import decksJson from "../../cards/decks.json";
import { Game, type PlayerId } from "../src/game/engine";
import { CpuAgent } from "../src/game/ai";
import { Sync, NetLocalAgent, NetRemoteAgent, type NetMsg } from "../src/game/net";
const byId = new Map((cardsJson as any[]).map((c) => [c.id, c]));
const decks = (decksJson as any[]).filter((d) => !d.legacy);
const expand = (l: Record<string, number>) => Object.entries(l).flatMap(([id, n]) => Array.from({ length: n }, () => byId.get(id)!));
const N = Number(process.env.N ?? 30);
let bad = 0, msgs = 0;
for (let i = 0; i < N; i++) {
  const pick = (id: string | undefined, k: number) => (id ? decks.find((d) => d.id === id)! : decks[k % decks.length]);
  const A = pick(process.env.A, i * 7), B = pick(process.env.B, i * 11 + 3);
  const seed = 1000 + i, first = (i % 2) as PlayerId;
  const inbox: ((m: NetMsg) => void)[] = [];
  const mk = (side: 0 | 1) => {
    const send = (m: NetMsg) => { msgs++; if (process.env.DBG && msgs < 12) console.log("side", side, "send", JSON.stringify(m)); const copy = JSON.parse(JSON.stringify(m)); setTimeout(() => inbox[1 - side](copy), Math.random() * 3); };
    const sync = new Sync(1, send);
    inbox[side] = (m) => { if (m.t === "act") sync.receive(m.seq, m.a); else if (m.t === "need") sync.resend(m.from); };
    const brain = new CpuAgent(0) as any;
    const local = new NetLocalAgent(brain, sync);
    const remote = new NetRemoteAgent(sync);
    const agents = side === 0 ? [local, remote] : [remote, local];
    return { sync, g: new Game({ decks: [expand(A.cards), expand(B.cards)], names: ["A", "B"], agents: agents as any, seed, first, maxTurns: 80 }) };
  };
  const s0 = mk(0), s1 = mk(1);
  const to = setTimeout(() => { const t0 = s0.g.log.map((l: any) => l.text), t1 = s1.g.log.map((l: any) => l.text); let k = 0; while (t0[k] === t1[k] && k < t0.length) k++; console.log("止まった", i, A.id, B.id, "len", t0.length, t1.length, "差", k, t0.slice(Math.max(0,k-4), k+2), "/", t1.slice(Math.max(0,k-4), k+2), s0.g.waitingFor, s1.g.waitingFor); process.exit(1); }, 20000);
  const [w0, w1] = await Promise.all([s0.g.run(), s1.g.run()]);
  clearTimeout(to);
  s0.sync.stopAsking(); s1.sync.stopAsking();
  const l0 = s0.g.log.map((l: any) => l.text).join("\n"), l1 = s1.g.log.map((l: any) => l.text).join("\n");
  if (w0 !== w1 || l0 !== l1) { bad++; console.log("ずれ", i, A.id, B.id, w0, w1); }
}
console.log(`${N}戦 ずれ${bad} 送信${msgs}`);
process.exit(0);
