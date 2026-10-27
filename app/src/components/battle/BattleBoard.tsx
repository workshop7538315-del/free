import { useEffect, useRef, useState } from "react";
import type { Action, BlockAnswer, Decision, Game, Obj, Player, PlayerId, TargetRef } from "../../game/engine";
import { STEP_NAMES, abilitiesOf, isCreatureCard, manaColors, releaseAbility } from "../../game/engine";
import type { HumanAgent } from "../../game/human";
import { cardColors } from "../../lib/mana";
import { ManaCost } from "../ManaCost";
import { RulesText } from "../CardTile";
import { copyText, deckText, logText, resultLine, type DeckInfo } from "../../lib/battleLog";

const ME: PlayerId = 0;
const CPU: PlayerId = 1;

type Props = {
  game: Game;
  human: HumanAgent;
  result: PlayerId | null | undefined;
  onRematch: () => void;
  onExit: () => void;
  /** ログと一緒にコピーするデッキ */
  decks?: { mine: DeckInfo; cpu: DeckInfo };
};

export function BattleBoard({ game: g, human, result, onRematch, onExit, decks }: Props) {
  // 結果の画面を閉じて、盤面とログを見られるようにする
  const [showResult, setShowResult] = useState(true);
  useEffect(() => {
    if (result !== undefined) setShowResult(true);
  }, [result]);
  const pending = human.pending;
  const d = pending?.decision ?? null;
  const [selected, setSelected] = useState<number | null>(null);
  const [detail, setDetail] = useState<Obj | null>(null);
  const [attackSel, setAttackSel] = useState<number[]>([]);
  const [blocks, setBlocks] = useState<BlockAnswer>({});
  const [blocker, setBlocker] = useState<number | null>(null);
  const [chosen, setChosen] = useState<number[]>([]);
  const [num, setNum] = useState(0);

  // 質問が変わったら選択状態を戻す
  useEffect(() => {
    setAttackSel(d?.kind === "attackers" ? [] : []);
    setBlocks({});
    setBlocker(null);
    setChosen([]);
    if (d?.kind === "number") setNum(d.max);
    if (d?.kind !== "action") setSelected(null);
  }, [d]);

  const answer = (a: unknown) => {
    setSelected(null);
    pending?.answer(a);
  };

  // ---------------------------------------------------------------- 盤面のクリック
  const actionsFor = (uid: number): Action[] => (d?.kind === "action" ? d.options.filter((a) => a.type !== "pass" && a.uid === uid) : []);
  const targetRefFor = (o: Obj): TargetRef | undefined =>
    d?.kind === "target" ? d.options.find((r) => r.kind === "obj" && r.uid === o.uid) : undefined;

  const onCard = (o: Obj) => {
    setDetail(o);
    if (!d) return;
    switch (d.kind) {
      case "action":
        setSelected(actionsFor(o.uid).length ? o.uid : null);
        break;
      case "target": {
        const r = targetRefFor(o);
        if (r) answer(r);
        break;
      }
      case "attackers":
        if (d.options.includes(o.uid)) setAttackSel((s) => (s.includes(o.uid) ? s.filter((x) => x !== o.uid) : [...s, o.uid]));
        break;
      case "blockers":
        if (d.blockers.includes(o.uid)) setBlocker((b) => (b === o.uid ? null : o.uid));
        else if (d.attackers.includes(o.uid) && blocker !== null) {
          const next: BlockAnswer = {};
          // 鉄壁を持つクリーチャーは何体でもブロックできる
          const wall = g.find(blocker) && g.hasKw(g.find(blocker)!, "鉄壁");
          for (const [a, bs] of Object.entries(blocks)) next[Number(a)] = wall ? bs : bs.filter((b) => b !== blocker);
          next[o.uid] = [...(next[o.uid] ?? []).filter((b) => b !== blocker), blocker];
          setBlocks(next);
          setBlocker(null);
        }
        break;
      case "chooseCards":
        if (d.options.includes(o.uid))
          setChosen((s) => (s.includes(o.uid) ? s.filter((x) => x !== o.uid) : s.length < d.count ? [...s, o.uid] : s));
        break;
      case "chooseSum":
        if (d.options.includes(o.uid)) setChosen((s) => (s.includes(o.uid) ? s.filter((x) => x !== o.uid) : [...s, o.uid]));
        break;
    }
  };

  const onPlayer = (id: PlayerId) => {
    if (d?.kind !== "target") return;
    const r = d.options.find((x) => x.kind === "player" && x.id === id);
    if (r) answer(r);
  };

  /** カードの強調表示 */
  const markOf = (o: Obj): string => {
    if (!d) return "";
    switch (d.kind) {
      case "action":
        return selected === o.uid ? "is-selected" : actionsFor(o.uid).length ? "is-actionable" : "";
      case "target":
        return targetRefFor(o) ? "is-targetable" : "";
      case "attackers":
        return attackSel.includes(o.uid) ? "is-selected" : d.options.includes(o.uid) ? "is-actionable" : "";
      case "blockers":
        if (blocker === o.uid) return "is-selected";
        if (d.blockers.includes(o.uid)) return Object.values(blocks).some((bs) => bs.includes(o.uid)) ? "is-assigned" : "is-actionable";
        if (d.attackers.includes(o.uid)) return blocker !== null ? "is-targetable" : "";
        return "";
      case "chooseCards":
      case "chooseSum":
        return chosen.includes(o.uid) ? "is-selected" : d.options.includes(o.uid) ? "is-actionable" : "";
      default:
        return "";
    }
  };

  const me = g.players[ME];
  const cpu = g.players[CPU];
  const playerTargetable = (id: PlayerId) => d?.kind === "target" && d.options.some((r) => r.kind === "player" && r.id === id);

  return (
    <div className="battle">
      <div className="battle-main">
        <PlayerBar g={g} p={cpu} targetable={playerTargetable(CPU)} onClick={() => onPlayer(CPU)} />
        <ManaRow p={cpu} markOf={markOf} onCard={onCard} hidden />
        <Field g={g} p={cpu} markOf={markOf} onCard={onCard} label="相手の場" />

        <Center
          g={g}
          d={d}
          selected={selected}
          attackSel={attackSel}
          blocks={blocks}
          blocker={blocker}
          chosen={chosen}
          num={num}
          setNum={setNum}
          setChosen={setChosen}
          answer={answer}
          onPickAll={() => d?.kind === "attackers" && setAttackSel(d.options)}
        />

        <Field g={g} p={me} markOf={markOf} onCard={onCard} label="あなたの場" />
        <ManaRow p={me} markOf={markOf} onCard={onCard} />
        <section className="hand" aria-label="あなたの手札">
          <h3 className="zone-label">手札 {me.hand.length}枚</h3>
          <div className="hand-cards">
            {me.hand.map((o) => (
              <MiniCard key={o.uid} g={g} o={o} mark={markOf(o)} onClick={() => onCard(o)} inHand />
            ))}
          </div>
        </section>
        {me.extra.length > 0 && (
          <section className="hand extra-zone" aria-label="あなたの秘蔵庫">
            <h3 className="zone-label">
              秘蔵庫 {me.extra.length}枚<span className="zone-hint">(リリース召喚・エントラータ・開拓進化・組み立てで出す)</span>
            </h3>
            <div className="hand-cards">
              {me.extra.map((o) => (
                <MiniCard key={o.uid} g={g} o={o} mark={markOf(o)} onClick={() => onCard(o)} inHand />
              ))}
            </div>
          </section>
        )}
        <PlayerBar g={g} p={me} targetable={playerTargetable(ME)} onClick={() => onPlayer(ME)} />
      </div>

      <aside className="battle-side">
        <CardDetail g={g} o={detail} />
        <Graveyards g={g} onCard={onCard} />
        <Log g={g} decks={decks} />
        {result === undefined ? (
          <button type="button" className="btn btn-quiet" onClick={() => window.confirm("対戦をやめてデッキ選択に戻りますか?") && onExit()}>
            対戦をやめる
          </button>
        ) : (
          <button type="button" className="btn btn-quiet" onClick={onExit}>
            デッキを選び直す
          </button>
        )}
      </aside>

      {result !== undefined && !showResult && (
        <div className="result-bar" role="status">
          <strong className={result === ME ? "is-win" : ""}>{result === ME ? "勝利" : result === CPU ? "敗北" : "引き分け"}</strong>
          <span>対戦後の盤面を表示しています。カードを選ぶと詳しい内容が出ます。</span>
          <span className="result-bar-actions">
            <button type="button" className="btn" onClick={() => setShowResult(true)}>
              結果を表示
            </button>
            <button type="button" className="btn btn-primary" onClick={onRematch}>
              もう一度対戦する
            </button>
          </span>
        </div>
      )}

      {result !== undefined && showResult && (
        <div className="result" role="dialog" aria-labelledby="result-title">
          <div className="result-box">
            <h2 id="result-title" className={`result-title ${result === ME ? "is-win" : ""}`}>
              {result === ME ? "勝利" : result === CPU ? "敗北" : "引き分け"}
            </h2>
            <p>
              {Math.ceil(g.turn / 2)}ターン目で決着しました。あなたのライフ {me.life}、相手のライフ {cpu.life}。
            </p>
            <div className="result-actions">
              <button type="button" className="btn btn-primary" onClick={onRematch}>
                もう一度対戦する
              </button>
              <button type="button" className="btn" onClick={() => setShowResult(false)}>
                盤面とログを見る
              </button>
              <button type="button" className="btn" onClick={onExit}>
                デッキを選び直す
              </button>
            </div>
            <CopyButtons g={g} decks={decks} />
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- プレイヤー情報
function PlayerBar({ g, p, targetable, onClick }: { g: Game; p: Player; targetable: boolean; onClick: () => void }) {
  const isTurn = g.active === p.id;
  return (
    <div className={`player-bar ${p.id === ME ? "is-me" : "is-cpu"} ${isTurn ? "is-turn" : ""}`}>
      <button type="button" className={`life ${targetable ? "is-targetable" : ""}`} onClick={onClick} disabled={!targetable} aria-label={`${p.name}のライフ ${p.life}`}>
        <span className="life-n">{p.life}</span>
        <span className="life-label">ライフ</span>
      </button>
      <span className="player-name">{p.name}</span>
      <span className="player-stats">
        {p.id === CPU && <span>手札 {p.hand.length}</span>}
        <span>山札 {p.library.length}</span>
        <span>墓地 {p.graveyard.length}</span>
        {p.extra.length > 0 && <span>秘蔵庫 {p.extra.length}</span>}
        {p.blessings.map((b) => (
          <span key={b} className="applause" title="加護:加護の枠を1つ使う">
            加護《{b}》
          </span>
        ))}
        {Object.entries(p.applause).map(([cat, n]) => (
          <span key={cat} className="applause" title={`喝采【${cat}】:加護の枠を1つ使う`}>
            喝采【{cat}】{n}
          </span>
        ))}
        {p.pool.length > 0 && <span>浮きマナ {p.pool.join("")}</span>}
      </span>
      {isTurn && <span className="turn-flag">{STEP_NAMES[g.step]}</span>}
    </div>
  );
}

// ---------------------------------------------------------------- マナゾーン
function ManaRow({ p, markOf, onCard, hidden = false }: { p: Player; markOf: (o: Obj) => string; onCard: (o: Obj) => void; hidden?: boolean }) {
  const untapped = p.mana.filter((o) => !o.tapped).length;
  return (
    <section className="mana-row" aria-label={`${p.name}のマナゾーン`}>
      <h3 className="zone-label">
        マナ {untapped}/{p.mana.length}
      </h3>
      <div className="mana-chips">
        {p.mana.length === 0 && <span className="zone-empty">まだありません</span>}
        {p.mana.map((o) => {
          const cs = manaColors(o);
          const bg = cs.length === 0 ? "var(--mana-C)" : cs.length === 1 ? `var(--mana-${cs[0]})` : `linear-gradient(90deg, ${cs.map((c) => `var(--mana-${c})`).join(",")})`;
          // 裏向きのカード:相手のものは名前を見せない
          const secret = o.faceDown && hidden;
          const secretNo = secret ? p.mana.filter((q) => q.faceDown).indexOf(o) + 1 : 0;
          const label = o.faceDown ? (secret ? `裏向き${secretNo}` : `裏:${o.card.name}`) : o.card.name;
          return (
            <button
              key={o.uid}
              type="button"
              className={`mana-chip ${o.tapped ? "is-tapped" : ""} ${o.faceDown ? "is-facedown" : ""} ${markOf(o)} ${!o.faceDown && releaseAbility(o.card) ? "has-release" : ""}`}
              onClick={() => onCard(o)}
              title={o.faceDown ? `${secret ? "裏向きのカード" : o.card.name}(裏向き:欠色のマナを出す。能力は働かない)` : o.card.name}
            >
              <span className="mana-chip-color" style={{ background: bg }} />
              <span className="mana-chip-name">{label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- 場
function Field({ g, p, markOf, onCard, label }: { g: Game; p: Player; markOf: (o: Obj) => string; onCard: (o: Obj) => void; label: string }) {
  const hosts = p.battlefield.filter((o) => o.attachedTo === null);
  return (
    <section className={`field ${p.id === ME ? "is-me" : "is-cpu"}`} aria-label={label}>
      {hosts.length === 0 && <span className="zone-empty">{label}にはまだ何もありません</span>}
      {hosts.map((o) => (
        <MiniCard key={o.uid} g={g} o={o} mark={markOf(o)} onClick={() => onCard(o)} />
      ))}
    </section>
  );
}

function MiniCard({ g, o, mark, onClick, inHand = false }: { g: Game; o: Obj; mark: string; onClick: () => void; inHand?: boolean }) {
  const cs = o.tokenColors ?? cardColors(o.card.cost);
  const frame = cs.length === 0 ? "var(--mana-C)" : cs.length === 1 ? `var(--mana-${cs[0]})` : `linear-gradient(135deg, ${cs.map((c) => `var(--mana-${c})`).join(",")})`;
  const creature = isCreatureCard(o.card);
  const onField = o.zone === "battlefield";
  const pw = onField ? g.power(o) : o.card.power;
  const tg = onField ? g.toughness(o) : o.card.toughness;
  const kws = onField ? [...g.keywords(o)] : [];
  const attacking = !!g.combat?.attackers.includes(o.uid);
  const blocking = g.combat ? Object.entries(g.combat.blocks).find(([, bs]) => bs.includes(o.uid)) : undefined;
  const auras = onField ? [...g.players[0].battlefield, ...g.players[1].battlefield].filter((a) => a.attachedTo === o.uid) : [];
  const buffed = onField && creature && (pw !== o.card.power || tg !== o.card.toughness);
  return (
    <button
      type="button"
      className={`mini ${o.tapped ? "is-tapped" : ""} ${mark} ${inHand ? "in-hand" : ""}`}
      style={{ "--frame": frame } as React.CSSProperties}
      onClick={onClick}
    >
      <span className="mini-head">
        <span className="mini-name">{o.card.name}</span>
        {o.card.cost && <ManaCost cost={o.card.cost} size="sm" />}
      </span>
      <span className="mini-type">{o.card.subtype ?? o.card.type}</span>
      {inHand && <span className="mini-text">{o.card.text.join(" / ")}</span>}
      {kws.length > 0 && <span className="mini-kws">{kws.join("・")}</span>}
      {auras.map((a) => (
        <span key={a.uid} className="mini-aura">
          {a.card.name}
        </span>
      ))}
      <span className="mini-foot">
        <span className="mini-flags">
          {onField && o.sick && creature && !g.hasKw(o, "速攻") && <span>召喚酔い</span>}
          {o.tapped && <span>タップ</span>}
          {attacking && <span className="flag-attack">攻撃中</span>}
          {blocking && <span className="flag-block">ブロック中</span>}
          {o.counters > 0 && <span>+1/+1×{o.counters}</span>}
          {o.token && <span>トークン</span>}
          {o.generated && <span className="flag-generated">生成</span>}
        </span>
        {creature && (
          <span className={`mini-pt ${buffed ? "is-buffed" : ""} ${o.damage > 0 ? "is-damaged" : ""}`}>
            {pw}/{onField && o.damage > 0 ? `${(tg ?? 0) - o.damage}` : tg}
          </span>
        )}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------- 中央(進行と操作)
type CenterProps = {
  g: Game;
  d: Decision | null;
  selected: number | null;
  attackSel: number[];
  blocks: BlockAnswer;
  blocker: number | null;
  chosen: number[];
  num: number;
  setNum: (n: number) => void;
  setChosen: (f: (s: number[]) => number[]) => void;
  answer: (a: unknown) => void;
  onPickAll: () => void;
};

function Center(props: CenterProps) {
  const { g } = props;
  return (
    <section className="center" aria-live="polite">
      <div className="center-status">
        <span className="center-turn">
          {g.turn > 0 ? `${g.active === ME ? "あなた" : "相手"}のターン${Math.ceil(g.turn / 2)}・${STEP_NAMES[g.step]}` : "対戦の準備"}
        </span>
        {g.active === ME && (g.step === "main1" || g.step === "main2") && (
          <span className="center-charge">
            チャージ 残り{Math.max(0, g.chargesAllowed(ME) - g.players[ME].chargesUsed)}回
          </span>
        )}
      </div>
      {g.stack.length > 0 && (
        <ol className="stack" aria-label="スタック(上から解決)">
          {[...g.stack].reverse().map((s) => (
            <li key={s.id} className={s.controller === ME ? "is-me" : "is-cpu"}>
              <strong>{s.obj.card.name}</strong>
              {s.kind !== "spell" && "の能力"}({s.controller === ME ? "あなた" : "相手"})
              {s.targets.length > 0 && ` → ${s.targets.map((t) => g.describeRef(t)).join("、")}`}
            </li>
          ))}
        </ol>
      )}
      <div className="prompt">
        <Prompt {...props} />
      </div>
    </section>
  );
}

function Prompt({ g, d, selected, attackSel, blocks, blocker, chosen, num, setNum, setChosen, answer, onPickAll }: CenterProps) {
  if (g.winner !== undefined) return <p className="prompt-text">対戦が終わりました。</p>;
  if (!d) {
    return <p className="prompt-text prompt-wait">{g.waitingFor === CPU ? "相手が考えています…" : "処理しています…"}</p>;
  }
  switch (d.kind) {
    case "action": {
      const o = selected !== null ? g.find(selected) : undefined;
      const acts = o ? d.options.filter((a) => a.type !== "pass" && a.uid === o.uid) : [];
      const mainOwn = (g.step === "main1" || g.step === "main2") && g.active === ME && g.stack.length === 0;
      const passLabel = mainOwn ? (g.step === "main1" ? "戦闘へ進む" : "ターンを終了する") : g.stack.length ? "対応しない" : "何もしない";
      const top = g.stack[g.stack.length - 1];
      return (
        <>
          <p className="prompt-text">
            {top && top.controller !== ME
              ? `相手が${top.obj.card.name}を使おうとしています。対応しますか?`
              : mainOwn
                ? "手札やマナゾーンのカードを選ぶと、できることが表示されます。"
                : "使えるカードがあります。使うならカードを選んでください。"}
          </p>
          {o && acts.length > 0 && (
            <div className="prompt-actions">
              <span className="prompt-card">{o.card.name}</span>
              {acts.map((a, i) => (
                <button key={i} type="button" className="btn btn-primary" onClick={() => answer(a)}>
                  {actionLabel(g, a)}
                </button>
              ))}
            </div>
          )}
          <div className="prompt-actions">
            <button type="button" className="btn" onClick={() => answer({ type: "pass" })}>
              {passLabel}
            </button>
          </div>
        </>
      );
    }
    case "target":
      return (
        <>
          <p className="prompt-text">{d.prompt}。光っているカードかプレイヤーを選んでください。</p>
          <div className="prompt-actions">
            {d.options.map((r, i) => (
              <button key={i} type="button" className="btn" onClick={() => answer(r)}>
                {refLabel(g, r)}
              </button>
            ))}
          </div>
        </>
      );
    case "yesno":
      if (d.reason === "mulligan")
        return (
          <>
            <p className="prompt-text">最初の手札です。この手札で始めますか?(引き直すと、その後1枚をライブラリーの一番下に置きます)</p>
            <div className="prompt-actions">
              <button type="button" className="btn btn-primary" onClick={() => answer(true)}>
                この手札で始める
              </button>
              <button type="button" className="btn" onClick={() => answer(false)}>
                引き直す
              </button>
            </div>
          </>
        );
      return (
        <>
          <p className="prompt-text">{d.prompt}</p>
          <div className="prompt-actions">
            <button type="button" className="btn btn-primary" onClick={() => answer(true)}>
              はい
            </button>
            <button type="button" className="btn" onClick={() => answer(false)}>
              いいえ
            </button>
          </div>
        </>
      );
    case "number":
      return (
        <>
          <p className="prompt-text">{d.prompt}</p>
          <div className="prompt-actions">
            <input type="range" min={d.min} max={d.max} value={num} onChange={(e) => setNum(Number(e.target.value))} aria-label="Xの値" />
            <strong className="prompt-num">X = {num}</strong>
            <button type="button" className="btn btn-primary" onClick={() => answer(num)}>
              決定
            </button>
          </div>
        </>
      );
    case "chooseCards":
      return (
        <>
          <p className="prompt-text">
            {d.prompt}({chosen.length}/{d.count})
          </p>
          <div className="prompt-actions">
            {d.options.map((u) => {
              const o = g.find(u);
              if (!o) return null;
              const on = chosen.includes(u);
              // 相手の裏向きのカードは名前が見えないので番号で区別する
              const hiddenNo =
                o.zone === "mana" && o.faceDown && o.controller !== ME
                  ? d.options.filter((x) => { const q = g.find(x); return q?.zone === "mana" && q.faceDown && q.controller !== ME; }).indexOf(u) + 1
                  : 0;
              return (
                <button
                  key={u}
                  type="button"
                  className={`btn ${on ? "btn-on" : ""}`}
                  aria-pressed={on}
                  onClick={() => setChosen((s) => (s.includes(u) ? s.filter((x) => x !== u) : s.length < d.count ? [...s, u] : s))}
                >
                  {o.zone === "mana" && o.faceDown ? (o.controller === ME ? `裏:${o.card.name}` : `裏向きのカード${hiddenNo}`) : o.card.name}
                  {o.zone === "mana" && o.tapped ? "(タップ)" : ""}
                </button>
              );
            })}
          </div>
          <div className="prompt-actions">
            <button type="button" className="btn btn-primary" disabled={chosen.length !== d.count} onClick={() => answer(chosen)}>
              決定
            </button>
          </div>
        </>
      );
    case "mode":
      return (
        <>
          <p className="prompt-text">{d.prompt}</p>
          <div className="prompt-actions">
            {d.options.map((label, i) => (
              <button key={i} type="button" className="btn btn-primary" onClick={() => answer(i)}>
                {label}
              </button>
            ))}
          </div>
        </>
      );
    case "color":
      return (
        <>
          <p className="prompt-text">{d.prompt}</p>
          <div className="prompt-actions">
            {d.options.map((c) => (
              <button key={c} type="button" className="btn btn-primary" onClick={() => answer(c)}>
                {({ W: "白", U: "青", B: "黒", R: "赤", G: "緑" } as Record<string, string>)[c]}で支払う
              </button>
            ))}
          </div>
        </>
      );
    case "chooseSum": {
      const sum = d.options.reduce((s, u, i) => s + (chosen.includes(u) ? d.values[i] : 0), 0);
      return (
        <>
          <p className="prompt-text">
            {d.prompt}(合計 {sum}/{d.min}{d.minCount ? `、${chosen.length}/${d.minCount}枚` : ""})
          </p>
          <div className="prompt-actions">
            {d.options.map((u, i) => {
              const o = g.find(u);
              if (!o) return null;
              const on = chosen.includes(u);
              return (
                <button
                  key={u}
                  type="button"
                  className={`btn ${on ? "btn-on" : ""}`}
                  aria-pressed={on}
                  onClick={() => setChosen((s) => (s.includes(u) ? s.filter((x) => x !== u) : [...s, u]))}
                >
                  {o.card.name}({d.values[i]})
                </button>
              );
            })}
          </div>
          <div className="prompt-actions">
            <button type="button" className="btn btn-primary" disabled={sum < d.min || chosen.length < (d.minCount ?? 0)} onClick={() => answer(chosen)}>
              {d.confirm ?? "リリースして召喚する"}
            </button>
          </div>
        </>
      );
    }
    case "attackers":
      return (
        <>
          <p className="prompt-text">攻撃するクリーチャーを場から選んでください。({attackSel.length}体選択中)</p>
          <div className="prompt-actions">
            <button type="button" className="btn btn-primary" onClick={() => answer(attackSel)} disabled={attackSel.length === 0}>
              {attackSel.length}体で攻撃する
            </button>
            <button type="button" className="btn" onClick={onPickAll}>
              全員を選ぶ
            </button>
            <button type="button" className="btn btn-quiet" onClick={() => answer([])}>
              攻撃しない
            </button>
          </div>
        </>
      );
    case "blockers": {
      const assigned = Object.entries(blocks).filter(([, bs]) => bs.length);
      return (
        <>
          <p className="prompt-text">
            {blocker === null
              ? "ブロックに使う自分のクリーチャーを選び、次にブロックする相手のクリーチャーを選んでください。"
              : `${g.find(blocker)?.card.name}でブロックする相手のクリーチャーを選んでください。`}
          </p>
          {assigned.length > 0 && (
            <ul className="block-list">
              {assigned.map(([a, bs]) => (
                <li key={a}>
                  {g.find(Number(a))?.card.name} ← {bs.map((b) => g.find(b)?.card.name).join("、")}
                  {g.find(Number(a)) && bs.length < g.minBlockers(g.find(Number(a))!) && `(${g.minBlockers(g.find(Number(a))!)}体以上必要)`}
                </li>
              ))}
            </ul>
          )}
          <div className="prompt-actions">
            <button type="button" className="btn btn-primary" onClick={() => answer(blocks)} disabled={assigned.length === 0}>
              ブロックを確定する
            </button>
            <button type="button" className="btn btn-quiet" onClick={() => answer({})}>
              ブロックしない
            </button>
          </div>
        </>
      );
    }
  }
}

function actionLabel(g: Game, a: Action): string {
  switch (a.type) {
    case "charge":
      return "チャージ(マナにする)";
    case "cast": {
      if (a.from === "mana") return "マナ解放で唱える";
      if (a.from === "graveyard") return "再演で唱える";
      if (a.from === "dash") return "疾駆で唱える(速攻、終了時に手札へ)";
      const o = g.find(a.uid);
      if (!o || o.card.cost === "" || g.effectiveCost(ME, o, "hand") !== "") return "唱える";
      // 零式を持ち、その条件を満たしているときだけ「零式」。コスト軽減で0になっただけなら「コスト0」
      const free = abilitiesOf(o.card).find((ab) => ab.a === "free");
      return free && free.a === "free" && g.cond(free.if, ME) ? "零式で唱える(コストなし)" : "唱える(コスト0)";
    }
    case "cycle":
      return "循環(捨てて1枚引く)";
    case "summon": {
      if (a.via === "pioneer") {
        const o = g.find(a.uid);
        const pi = o ? abilitiesOf(o.card).find((ab) => ab.a === "pioneer") : undefined;
        return pi && pi.a === "pioneer" ? `${pi.grand ? "大開拓進化" : "開拓進化"}【${({ W: "白", U: "青", B: "黒", R: "赤", G: "緑" } as Record<string, string>)[pi.color]}】(マナ総量${pi.n}を墓地へ)` : "開拓進化";
      }
      if (a.via === "assemble") return "組み立てる(コストを払い、クリーチャーをタップしてつける)";
      if (a.via === "evolve") return "武装進化する";
      if (a.via !== "entrata") return "リリース召喚する";
      const o = g.find(a.uid);
      const en = o ? abilitiesOf(o.card).find((ab) => ab.a === "entrata") : undefined;
      return en && en.a === "entrata" ? `エントラータ(喝采【${en.cat}】を${en.n}消費して登場)` : "エントラータ";
    }
    case "equip":
      return "装備する";
    case "activate": {
      const o = g.find(a.uid);
      const ab = o ? abilitiesOf(o.card)[a.index] : undefined;
      if (ab && ab.a === "activated")
        return `能力を起動(${[ab.cost.mana, ab.cost.tap ? "タップ" : "", ab.cost.sac ? "生け贄" : "", ab.cost.sacSelf ? "これを生け贄" : "", ab.cost.life ? `ライフ${ab.cost.life}` : "", ab.cost.applause ? `喝采【${ab.cost.applause.cat}】${ab.cost.applause.n}` : "", ab.cost.discard ? `手札${ab.cost.discard}枚を捨てる` : ""]
          .filter(Boolean)
          .join("、")})`;
      return "能力を起動";
    }
    default:
      return "パス";
  }
}

function refLabel(g: Game, r: TargetRef): string {
  if (r.kind === "player") return r.id === ME ? "あなた" : "相手";
  if (r.kind === "stack") return `呪文:${g.describeRef(r)}`;
  const o = g.find(r.uid);
  if (!o) return "?";
  const owner = o.controller === ME ? "自分" : "相手";
  if (o.zone === "graveyard") return `墓地:${o.card.name}`;
  return `${owner}の${o.card.name}${isCreatureCard(o.card) ? `(${g.power(o)}/${g.toughness(o) - o.damage})` : ""}`;
}

// ---------------------------------------------------------------- 横の欄
function CardDetail({ g, o }: { g: Game; o: Obj | null }) {
  if (!o) return <section className="detail detail-empty">カードを選ぶと、ここに詳しい内容が出ます。</section>;
  const c = o.card;
  const onField = o.zone === "battlefield";
  if (o.zone === "mana" && o.faceDown) {
    const mine = o.controller === 0;
    return (
      <section className="detail" aria-label="カードの詳細">
        <header className="detail-head">
          <h3 className="detail-name">裏向きのカード{mine ? `(${c.name})` : ""}</h3>
        </header>
        <p className="detail-text">マナゾーンで裏向きになっているカードです。名前・色・能力を持たない欠色のカードとして扱い、欠色マナを1つ出します。マナゾーンを離れると表向きに戻ります。</p>
      </section>
    );
  }
  return (
    <section className="detail" aria-label="カードの詳細">
      <header className="detail-head">
        <h3 className="detail-name">{c.name}</h3>
        {c.cost && <ManaCost cost={c.cost} />}
      </header>
      <p className="detail-type">
        {c.type}
        {c.subtype && ` ― ${c.subtype}`}
      </p>
      <div className="detail-text">
        {c.text.length === 0 ? <p className="card-vanilla">(能力なし)</p> : c.text.map((t, i) => <p key={i}><RulesText text={t} /></p>)}
      </div>
      {isCreatureCard(c) && (
        <p className="detail-pt">
          {onField ? `${g.power(o)}/${g.toughness(o)}` : `${c.power}/${c.toughness}`}
          {onField && o.damage > 0 && <span className="detail-damage">(ダメージ {o.damage})</span>}
        </p>
      )}
    </section>
  );
}

function Graveyards({ g, onCard }: { g: Game; onCard: (o: Obj) => void }) {
  return (
    <details className="graves">
      <summary>墓地を見る</summary>
      {[ME, CPU].map((id) => (
        <div key={id}>
          <h4>{id === ME ? "あなた" : "相手"}の墓地</h4>
          {g.players[id].graveyard.length === 0 ? (
            <p className="hint">なし</p>
          ) : (
            <ul>
              {g.players[id].graveyard.map((o) => (
                <li key={o.uid}>
                  <button type="button" className="link" onClick={() => onCard(o)}>
                    {o.card.name}
                    {id === ME && o.card.abilities?.some((a) => a.a === "flashback") && "(再演できる)"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </details>
  );
}

/** ログのコピー:ログのみ / ログと双方のデッキ */
function CopyButtons({ g, decks }: { g: Game; decks?: { mine: DeckInfo; cpu: DeckInfo } }) {
  const [done, setDone] = useState<string | null>(null);
  const copy = async (withDecks: boolean) => {
    const parts = [resultLine(g, ME)];
    if (withDecks && decks) parts.push(deckText("あなたのデッキ", decks.mine), deckText("CPUのデッキ", decks.cpu));
    parts.push(`# ログ(${g.log.length}行)\n${logText(g.log)}`);
    const ok = await copyText(parts.join("\n\n"));
    setDone(ok ? (withDecks ? "ログとデッキをコピーしました" : "ログをコピーしました") : "コピーできませんでした");
    window.setTimeout(() => setDone(null), 2500);
  };
  return (
    <div className="log-copy">
      <button type="button" className="btn btn-small" onClick={() => copy(false)}>
        ログをコピー
      </button>
      {decks && (
        <button type="button" className="btn btn-small" onClick={() => copy(true)}>
          ログとデッキをコピー
        </button>
      )}
      <span className="log-copy-status" aria-live="polite">
        {done}
      </span>
    </div>
  );
}

function Log({ g, decks }: { g: Game; decks?: { mine: DeckInfo; cpu: DeckInfo } }) {
  const ref = useRef<HTMLOListElement>(null);
  const last = g.log[g.log.length - 1]?.id;
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [last]);
  return (
    <section className="log" aria-label="ログ">
      <h3 className="zone-label">ログ</h3>
      <CopyButtons g={g} decks={decks} />
      <ol ref={ref}>
        {g.log.slice(-120).map((l) => (
          <li key={l.id} className={l.player === ME ? "is-me" : l.player === CPU ? "is-cpu" : "is-sys"}>
            {l.text}
          </li>
        ))}
      </ol>
    </section>
  );
}
