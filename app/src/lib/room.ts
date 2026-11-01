/**
 * オンライン対戦の部屋。Supabase Realtime の broadcast(メッセージ)と presence(誰がいるか)を使う。
 * Supabase が未設定か、URL に ?net=local があるときは、同じブラウザの別タブ同士で通信する(試験用)。
 */
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { NetMsg } from "../game/net";

export interface Room {
  send(m: NetMsg): void;
  onMessage(fn: (m: NetMsg) => void): () => void;
  /** 部屋にいる人の id(自分を含む)が変わったとき */
  onPeers(fn: (ids: string[]) => void): () => void;
  close(): void;
}

const CODE_CHARS = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const newRoomCode = () => Array.from({ length: 5 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join("");
export const normalizeCode = (s: string) =>
  s
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, "")
    .slice(0, 5);

export function useLocalNet() {
  return !supabase || new URLSearchParams(location.search).get("net") === "local";
}

class Emitter<T> {
  private fns = new Set<(v: T) => void>();
  on(fn: (v: T) => void) {
    this.fns.add(fn);
    return () => {
      this.fns.delete(fn);
    };
  }
  emit(v: T) {
    for (const fn of this.fns) fn(v);
  }
}

export function openRoom(code: string, clientId: string): Room {
  return useLocalNet() ? localRoom(code, clientId) : supabaseRoom(code, clientId);
}

function supabaseRoom(code: string, clientId: string): Room {
  const msgs = new Emitter<NetMsg>();
  const peers = new Emitter<string[]>();
  const ch: RealtimeChannel = supabase!.channel(`tcg-room-${code}`, { config: { broadcast: { self: false, ack: false }, presence: { key: clientId } } });
  const queue: NetMsg[] = [];
  let ready = false;
  ch.on("broadcast", { event: "msg" }, ({ payload }) => msgs.emit(payload as NetMsg));
  ch.on("presence", { event: "sync" }, () => peers.emit(Object.keys(ch.presenceState())));
  ch.subscribe((status) => {
    if (status !== "SUBSCRIBED") return;
    ready = true;
    void ch.track({ at: Date.now() });
    for (const m of queue.splice(0)) void ch.send({ type: "broadcast", event: "msg", payload: m });
  });
  return {
    send(m) {
      if (!ready) queue.push(m);
      else void ch.send({ type: "broadcast", event: "msg", payload: m });
    },
    onMessage: (fn) => msgs.on(fn),
    onPeers: (fn) => peers.on(fn),
    close() {
      void ch.untrack();
      void supabase!.removeChannel(ch);
    },
  };
}

/** 試験用:同じブラウザのタブ同士 */
function localRoom(code: string, clientId: string): Room {
  const msgs = new Emitter<NetMsg>();
  const peers = new Emitter<string[]>();
  const bc = new BroadcastChannel(`tcg-room-${code}`);
  const seen = new Map<string, number>([[clientId, Infinity]]);
  let last = "";
  const report = () => {
    const now = Date.now();
    for (const [id, at] of seen) if (now - at > 5000) seen.delete(id);
    const ids = [...seen.keys()].sort();
    if (ids.join() !== last) {
      last = ids.join();
      peers.emit(ids);
    }
  };
  bc.onmessage = (e) => {
    const d = e.data as { here?: string; gone?: string; m?: NetMsg };
    if (d.here) seen.set(d.here, Date.now());
    if (d.gone) seen.delete(d.gone);
    if (d.m) msgs.emit(d.m);
    report();
  };
  const ping = () => bc.postMessage({ here: clientId });
  const timer = window.setInterval(() => {
    ping();
    report();
  }, 1500);
  ping();
  window.setTimeout(report, 0);
  return {
    send: (m) => bc.postMessage({ m }),
    onMessage: (fn) => msgs.on(fn),
    onPeers: (fn) => peers.on(fn),
    close() {
      window.clearInterval(timer);
      bc.postMessage({ gone: clientId });
      bc.close();
    },
  };
}
