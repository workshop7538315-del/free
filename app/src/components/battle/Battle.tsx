import { useEffect, useMemo, useRef, useState } from "react";
import type { Card, DeckCards, SavedDeck } from "../../types";
import { DECK_SIZE, validateDeck } from "../../lib/deck";
import { Game, type PlayerId } from "../../game/engine";
import { CpuAgent } from "../../game/ai";
import { HumanAgent } from "../../game/human";
import { BattleBoard } from "./BattleBoard";

export type StarterDeck = { id: string; name: string; colors: string[]; cards: DeckCards };

type Props = {
  byId: Map<string, Card>;
  starters: StarterDeck[];
  saved: SavedDeck[];
  draft: { name: string; cards: DeckCards };
};

type Choice = { key: string; name: string; cards: DeckCards; kind: "starter" | "saved" | "draft" };

const expand = (cards: DeckCards, byId: Map<string, Card>): Card[] =>
  Object.entries(cards).flatMap(([id, n]) => {
    const c = byId.get(id);
    return c ? Array.from({ length: n }, () => c) : [];
  });

type Running = { game: Game; human: HumanAgent; myDeck: Choice; cpuDeck: Choice; result: PlayerId | null | undefined };

export function Battle({ byId, starters, saved, draft }: Props) {
  const choices = useMemo<Choice[]>(() => {
    const out: Choice[] = [];
    if (validateDeck(draft.cards, byId).length === 0) out.push({ key: "draft", name: `作成中:${draft.name}`, cards: draft.cards, kind: "draft" });
    for (const d of saved) if (validateDeck(d.cards, byId).length === 0) out.push({ key: `saved-${d.id}`, name: d.name, cards: d.cards, kind: "saved" });
    for (const d of starters) out.push({ key: `starter-${d.id}`, name: d.name, cards: d.cards, kind: "starter" });
    return out;
  }, [draft, saved, starters, byId]);

  const [mine, setMine] = useState<string>(() => choices[0]?.key ?? "");
  const [cpu, setCpu] = useState<string>("random");
  const [running, setRunning] = useState<Running | null>(null);
  const [, setTick] = useState(0);
  const frame = useRef(0);

  useEffect(() => {
    if (!choices.some((c) => c.key === mine) && choices[0]) setMine(choices[0].key);
  }, [choices, mine]);

  useEffect(() => () => running?.game.abort(), [running]);

  const start = (myKey = mine, cpuKey = cpu) => {
    const myDeck = choices.find((c) => c.key === myKey);
    const starterChoices = choices.filter((c) => c.kind === "starter");
    const cpuDeck =
      cpuKey === "random" ? starterChoices[Math.floor(Math.random() * starterChoices.length)] : choices.find((c) => c.key === cpuKey);
    if (!myDeck || !cpuDeck) return;
    running?.game.abort();
    const human = new HumanAgent();
    const rerender = () => {
      if (frame.current) return;
      frame.current = requestAnimationFrame(() => {
        frame.current = 0;
        setTick((t) => t + 1);
      });
    };
    const game = new Game({
      decks: [expand(myDeck.cards, byId), expand(cpuDeck.cards, byId)],
      names: ["あなた", `CPU(${cpuDeck.name})`],
      agents: [human, new CpuAgent(550)],
      onUpdate: rerender,
    });
    human.subscribe(rerender);
    const r: Running = { game, human, myDeck, cpuDeck, result: undefined };
    setRunning(r);
    game.run().then((w) => {
      r.result = w;
      rerender();
    });
  };

  if (running) {
    return (
      <BattleBoard
        game={running.game}
        human={running.human}
        result={running.result}
        onRematch={() => start(running.myDeck.key, cpu === "random" ? running.cpuDeck.key : cpu)}
        onExit={() => {
          running.game.abort();
          setRunning(null);
        }}
      />
    );
  }

  return (
    <section className="battle-setup" aria-labelledby="setup-title">
      <h2 id="setup-title" className="setup-title">
        CPUと対戦する
      </h2>
      <p className="setup-lead">
        使うデッキを選んでください。自分で組んだデッキは、{DECK_SIZE}枚ちょうどで保存すると選べるようになります。
      </p>
      <div className="setup-grid">
        <fieldset className="setup-col">
          <legend>あなたのデッキ</legend>
          <ul className="deck-choices">
            {choices.map((c) => (
              <li key={c.key}>
                <label className={`deck-choice ${mine === c.key ? "is-on" : ""}`}>
                  <input type="radio" name="mine" value={c.key} checked={mine === c.key} onChange={() => setMine(c.key)} />
                  <span className="deck-choice-name">{c.name}</span>
                  <span className="deck-choice-kind">{c.kind === "starter" ? "スターター" : c.kind === "saved" ? "保存済み" : "作成中"}</span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
        <fieldset className="setup-col">
          <legend>CPUのデッキ</legend>
          <ul className="deck-choices">
            <li>
              <label className={`deck-choice ${cpu === "random" ? "is-on" : ""}`}>
                <input type="radio" name="cpu" value="random" checked={cpu === "random"} onChange={() => setCpu("random")} />
                <span className="deck-choice-name">おまかせ(スターターからランダム)</span>
              </label>
            </li>
            {choices
              .filter((c) => c.kind === "starter")
              .map((c) => (
                <li key={c.key}>
                  <label className={`deck-choice ${cpu === c.key ? "is-on" : ""}`}>
                    <input type="radio" name="cpu" value={c.key} checked={cpu === c.key} onChange={() => setCpu(c.key)} />
                    <span className="deck-choice-name">{c.name}</span>
                  </label>
                </li>
              ))}
          </ul>
        </fieldset>
      </div>
      <button type="button" className="btn btn-primary btn-start" onClick={() => start()} disabled={!mine}>
        対戦を始める
      </button>
      <details className="howto">
        <summary>遊び方</summary>
        <ul>
          <li>毎ターン1回、手札のカードを1枚「チャージ」してマナゾーンに置けます。どのカードでもマナになります。</li>
          <li>マナゾーンのカードはそのカードの色のマナを1つ出します。多色カードはタップ状態で置かれ、欠色カードは無色マナを出します。</li>
          <li>カードを選ぶと、できること(唱える・チャージ・能力の起動)が中央に出ます。マナの支払いは自動です。</li>
          <li>メイン1で「戦闘へ進む」を押すと攻撃するクリーチャーを選べます。相手のライフを0にすれば勝ちです。</li>
        </ul>
      </details>
    </section>
  );
}
