import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Card, DeckCards } from "../../types";
import { Game, type PlayerId } from "../../game/engine";
import { HumanAgent } from "../../game/human";
import { NetLocalAgent, NetRemoteAgent, Sync, type NetMsg, type Seat } from "../../game/net";
import { newRoomCode, normalizeCode, openRoom, useLocalNet, type Room } from "../../lib/room";
import { BattleBoard } from "./BattleBoard";
import type { Choice } from "./Battle";

type Props = {
  byId: Map<string, Card>;
  choices: Choice[];
  /** URL の ?room= で開いたときの部屋コード */
  initialCode?: string;
  /** 部屋の外・部屋の中の画面の上に出す切り替え */
  header?: ReactNode;
};

type Hello = Extract<NetMsg, { t: "hello" }>;
type Running = { seq: number; gameNo: number; game: Game; human: HumanAgent; sync: Sync; me: PlayerId; seats: [Seat, Seat]; result: PlayerId | null | undefined };

const NAME_KEY = "tcg-online-name";
const loadName = () => {
  try {
    return localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
};
const saveName = (n: string) => {
  try {
    localStorage.setItem(NAME_KEY, n);
  } catch {
    /* 保存できなくても遊べる */
  }
};

const expand = (cards: DeckCards, byId: Map<string, Card>): Card[] =>
  Object.entries(cards).flatMap(([id, n]) => {
    const c = byId.get(id);
    return c ? Array.from({ length: n }, () => c) : [];
  });

/** カードの内容が同じかどうかを確かめる指紋(版が違う相手とは対戦しない) */
function fingerprint(byId: Map<string, Card>): string {
  const s = JSON.stringify([...byId.values()]);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return `${byId.size}-${(h >>> 0).toString(36)}`;
}

let battleSeq = 0;

export function Online({ byId, choices, initialCode, header }: Props) {
  const ver = useMemo(() => fingerprint(byId), [byId]);
  const clientId = useMemo(() => (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2)), []);
  const [name, setName] = useState(loadName);
  const [deckKey, setDeckKey] = useState<string>(() => choices[0]?.key ?? "");
  const [codeInput, setCodeInput] = useState(initialCode ?? "");
  const [room, setRoom] = useState<{ code: string; host: boolean; conn: Room } | null>(null);
  const [peer, setPeer] = useState<Hello | null>(null);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("");
  const [running, setRunning] = useState<Running | null>(null);
  const [rematch, setRematch] = useState({ mine: false, theirs: false });
  const [peerGone, setPeerGone] = useState(false);
  const [, setTick] = useState(0);
  const frame = useRef(0);
  const gameNo = useRef(0);

  const deck = choices.find((c) => c.key === deckKey);
  const myName = name.trim() || "名無しのプレイヤー";

  // 最新の値をメッセージの処理から読む
  const live = useRef({ room, peer, ready, running, rematch, deck, myName });
  live.current = { room, peer, ready, running, rematch, deck, myName };

  useEffect(() => {
    if (!choices.some((c) => c.key === deckKey) && choices[0]) setDeckKey(choices[0].key);
  }, [choices, deckKey]);

  const rerender = () => {
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      setTick((t) => t + 1);
    });
  };

  const hello = (): Hello => {
    const { room, peer, ready, deck, myName } = live.current;
    return { t: "hello", id: clientId, name: myName, deckName: deck?.name ?? "", deck: deck?.cards ?? null, ready, host: !!room?.host, ver, ...(room?.host ? { with: peer?.id ?? null } : {}) };
  };

  // 自分の状態が変わったら知らせる
  useEffect(() => {
    if (room && !running) room.conn.send(hello());
  }, [room, deckKey, ready, myName, running]);

  const startGame = (m: Extract<NetMsg, { t: "start" }>, me: PlayerId) => {
    const r0 = live.current.room;
    if (!r0) return;
    live.current.running?.game.abort();
    live.current.running?.sync.stopAsking();
    const sync = new Sync(m.game, (x) => r0.conn.send(x));
    const human = new HumanAgent();
    const local = new NetLocalAgent(human, sync);
    const remote = new NetRemoteAgent(sync);
    const names: [string, string] = me === 0 ? ["あなた", m.seats[1].name] : [m.seats[0].name, "あなた"];
    const game = new Game({
      decks: [expand(m.seats[0].deck, byId), expand(m.seats[1].deck, byId)],
      names,
      agents: me === 0 ? [local, remote] : [remote, local],
      seed: m.seed,
      first: m.first,
      onUpdate: rerender,
    });
    human.subscribe(rerender);
    const r: Running = { seq: ++battleSeq, gameNo: m.game, game, human, sync, me, seats: m.seats, result: undefined };
    setRematch({ mine: false, theirs: false });
    setPeerGone(false);
    setNotice("");
    setRunning(r);
    game.run().then((w) => {
      r.result = w;
      sync.stopAsking();
      rerender();
    });
  };

  /** 部屋を作った側が対戦を始める(シードと先攻を決めて送る) */
  const hostStart = () => {
    const { room, peer, deck, myName, running } = live.current;
    if (!room?.host || !peer?.deck || !deck) return;
    const seats: [Seat, Seat] = running
      ? running.seats
      : [
          { name: myName, deckName: deck.name, deck: deck.cards },
          { name: peer.name, deckName: peer.deckName, deck: peer.deck },
        ];
    const m: Extract<NetMsg, { t: "start" }> = { t: "start", game: ++gameNo.current, seed: Math.floor(Math.random() * 2 ** 31), first: (Math.random() < 0.5 ? 0 : 1) as PlayerId, seats };
    room.conn.send(m);
    startGame(m, 0);
  };

  const backToLobby = (text = "") => {
    live.current.running?.game.abort();
    live.current.running?.sync.stopAsking();
    setRunning(null);
    setReady(false);
    setNotice(text);
  };

  // 部屋のメッセージ
  useEffect(() => {
    if (!room) return;
    const offMsg = room.conn.onMessage((m) => {
      const cur = live.current;
      switch (m.t) {
        case "hello": {
          if (m.id === clientId) return;
          if (m.ver !== ver) {
            setNotice("相手とカードの版が違います。両方ともページを再読み込みしてください。");
            return;
          }
          if (!room.host && m.host && m.with && m.with !== clientId) {
            setNotice("この部屋はもう2人そろっています。");
            return;
          }
          if (room.host && m.host) return;
          if (room.host && cur.peer && cur.peer.id !== m.id) return; // 3人目は相手にしない
          const isNew = cur.peer?.id !== m.id;
          setPeer(m);
          if (isNew) {
            setNotice("");
            room.conn.send({ ...hello(), ...(room.host ? { with: m.id } : {}) });
          }
          return;
        }
        case "start":
          if (room.host || cur.peer?.host !== true) return;
          gameNo.current = m.game;
          startGame(m, 1);
          return;
        case "act":
          if (cur.running?.gameNo === m.game) cur.running.sync.receive(m.seq, m.a);
          return;
        case "need":
          if (cur.running?.gameNo === m.game) cur.running.sync.resend(m.from);
          return;
        case "rematch":
          if (cur.running?.gameNo !== m.game) return;
          setRematch((r) => ({ ...r, theirs: true }));
          if (room.host && cur.rematch.mine) hostStart();
          return;
        case "end":
          if (cur.running?.gameNo === m.game) backToLobby("相手が対戦を終了しました。");
          return;
      }
    });
    const offPeers = room.conn.onPeers((ids) => {
      const p = live.current.peer;
      if (p && !ids.includes(p.id)) {
        if (live.current.running) setPeerGone(true);
        else {
          setPeer(null);
          setNotice("相手が部屋を出ました。");
        }
      } else if (p && ids.includes(p.id)) setPeerGone(false);
    });
    room.conn.send(hello());
    return () => {
      offMsg();
      offPeers();
    };
  }, [room]);

  useEffect(
    () => () => {
      live.current.running?.game.abort();
      live.current.running?.sync.stopAsking();
      live.current.room?.conn.close();
    },
    [],
  );

  const enter = (code: string, host: boolean) => {
    if (!code) return;
    saveName(name.trim());
    room?.conn.close();
    setPeer(null);
    setReady(false);
    setNotice(host ? "" : "相手を探しています…");
    setRoom({ code, host, conn: openRoom(code, clientId) });
  };

  const leave = () => {
    backToLobby();
    room?.conn.close();
    setRoom(null);
    setPeer(null);
  };

  const inviteUrl = room ? `${location.origin}${location.pathname}?room=${room.code}${useLocalNet() && new URLSearchParams(location.search).get("net") === "local" ? "&net=local" : ""}` : "";

  // ---------------------------------------------------------------- 対戦中
  if (running) {
    const { mine, theirs } = rematch;
    const done = running.result !== undefined;
    return (
      <BattleBoard
        key={running.seq}
        game={running.game}
        human={running.human}
        result={running.result}
        me={running.me}
        notice={peerGone ? "相手との接続が切れています。通信が戻れば、続きから再開します。" : !done ? undefined : theirs && !mine ? "相手が再戦を希望しています。" : undefined}
        decks={{
          mine: { name: running.seats[running.me].deckName, cards: running.seats[running.me].deck },
          cpu: { name: running.seats[1 - running.me].deckName, cards: running.seats[1 - running.me].deck },
        }}
        rematchLabel={peerGone ? null : mine ? "相手の返事を待っています" : theirs ? "再戦を受ける" : "再戦を申し込む"}
        rematchDisabled={mine}
        onRematch={() => {
          setRematch((r) => ({ ...r, mine: true }));
          room?.conn.send({ t: "rematch", game: running.gameNo });
          if (room?.host && theirs) hostStart();
        }}
        exitConfirm="対戦をやめて部屋に戻りますか?(相手の対戦も終わります)"
        exitLabel="部屋に戻る"
        onExit={() => {
          room?.conn.send({ t: "end", game: running.gameNo });
          backToLobby();
        }}
      />
    );
  }

  // ---------------------------------------------------------------- 部屋の外
  const deckList = (
    <fieldset className="setup-col">
      <legend>使うデッキ</legend>
      <ul className="deck-choices">
        {choices.map((c) => (
          <li key={c.key}>
            <label className={`deck-choice ${deckKey === c.key ? "is-on" : ""}`}>
              <input type="radio" name="online-deck" value={c.key} checked={deckKey === c.key} disabled={ready} onChange={() => setDeckKey(c.key)} />
              <span className="deck-choice-name">{c.name}</span>
              {c.kind !== "starter" && <span className="deck-choice-kind">{c.kind === "legacy" ? "旧スターター" : c.kind === "saved" ? "保存済み" : "作成中"}</span>}
            </label>
          </li>
        ))}
      </ul>
    </fieldset>
  );

  if (!room) {
    return (
      <section className="battle-setup online" aria-labelledby="online-title">
        {header}
        <h2 id="online-title" className="setup-title">
          友達とオンライン対戦
        </h2>
        <p className="setup-lead">部屋を作って、表示される部屋コードか招待リンクを相手に送ってください。ログインは要りません。</p>
        <div className="setup-grid">
          {deckList}
          <div className="online-side">
            <label className="online-field">
              <span>あなたの名前</span>
              <input type="text" value={name} maxLength={16} placeholder="名無しのプレイヤー" onChange={(e) => setName(e.target.value)} />
            </label>
            <div className="online-block">
              <button type="button" className="btn btn-primary" disabled={!deck} onClick={() => enter(newRoomCode(), true)}>
                部屋を作る
              </button>
            </div>
            <div className="online-block">
              <label className="online-field">
                <span>部屋コード</span>
                <input type="text" inputMode="text" autoCapitalize="characters" value={codeInput} placeholder="例:K7M2Q" onChange={(e) => setCodeInput(normalizeCode(e.target.value))} />
              </label>
              <button type="button" className="btn" disabled={!deck || codeInput.length !== 5} onClick={() => enter(codeInput, false)}>
                部屋に入る
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // ---------------------------------------------------------------- 部屋の中
  const canStart = room.host && !!peer?.deck && peer.ready && !!deck;
  return (
    <section className="battle-setup online" aria-labelledby="online-title">
      {header}
      <h2 id="online-title" className="setup-title">
        友達とオンライン対戦
      </h2>
      <div className="online-room">
        <div className="online-code">
          <span className="online-code-label">部屋コード</span>
          <strong className="online-code-value">{room.code}</strong>
          <button type="button" className="btn" onClick={() => void navigator.clipboard?.writeText(inviteUrl)}>
            招待リンクをコピー
          </button>
        </div>
        <ul className="online-seats">
          <li>
            <span className="online-seat-who">あなた{room.host ? "(部屋を作った人)" : ""}</span>
            <span className="online-seat-deck">{deck?.name ?? "デッキ未選択"}</span>
            <span className="online-seat-state">{room.host ? (canStart ? "準備完了" : "") : ready ? "準備完了" : "準備中"}</span>
          </li>
          <li>
            <span className="online-seat-who">{peer ? peer.name : "相手"}</span>
            <span className="online-seat-deck">{peer ? peer.deckName || "デッキ未選択" : "まだ来ていません"}</span>
            <span className="online-seat-state">{peer ? (peer.host ? "" : peer.ready ? "準備完了" : "準備中") : ""}</span>
          </li>
        </ul>
        {notice && (
          <p className="online-notice" role="status">
            {notice}
          </p>
        )}
        <div className="online-actions">
          {room.host ? (
            <button type="button" className="btn btn-primary" disabled={!canStart} onClick={hostStart}>
              {canStart ? "対戦を始める" : peer ? "相手の準備を待っています" : "相手を待っています"}
            </button>
          ) : (
            <button type="button" className={`btn ${ready ? "" : "btn-primary"}`} disabled={!deck || !peer} onClick={() => setReady(!ready)}>
              {ready ? "準備を取り消す" : "準備完了"}
            </button>
          )}
          <button type="button" className="btn btn-quiet" onClick={leave}>
            部屋を出る
          </button>
        </div>
      </div>
      {deckList}
    </section>
  );
}
