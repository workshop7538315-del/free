// カード定義の書き方の補助と、効果データから日本語のカード文章を作る処理。
// 効果データの形式は app/src/game/schema.ts を参照。

// ---------------------------------------------------------------- カードの種類
export const RARITY = { C: "コモン", U: "アンコモン", R: "レア", M: "神話レア" };

const base = (id, name, cost, type, rar, abilities, extra) => ({
  id,
  name,
  cost,
  type,
  rarity: RARITY[rar],
  abilities: [abilities ?? []].flat(2),
  ...extra,
});

/** クリーチャー */
export const cr = (id, name, cost, sub, p, t, rar, abilities = [], extra = {}) => ({
  ...base(id, name, cost, "クリーチャー", rar, abilities, extra),
  subtype: sub,
  power: p,
  toughness: t,
});
/** アーティファクト・クリーチャー */
export const acr = (...args) => ({ ...cr(...args), type: "アーティファクト・クリーチャー" });
/** エンチャント・クリーチャー */
export const ecr = (...args) => ({ ...cr(...args), type: "エンチャント・クリーチャー" });
export const ins = (id, name, cost, rar, abilities, extra = {}) => base(id, name, cost, "インスタント", rar, abilities, extra);
export const sor = (id, name, cost, rar, abilities, extra = {}) => base(id, name, cost, "ソーサリー", rar, abilities, extra);
export const ench = (id, name, cost, rar, abilities, extra = {}) => base(id, name, cost, "エンチャント", rar, abilities, extra);
export const art = (id, name, cost, rar, abilities, extra = {}) => base(id, name, cost, "アーティファクト", rar, abilities, extra);
/** オーラ(クリーチャーにつける) */
export const aura = (id, name, cost, rar, abilities, extra = {}) => ({
  ...base(id, name, cost, "エンチャント", rar, [{ a: "enchant" }, abilities].flat(2), extra),
  subtype: "オーラ",
});
/** 装備品:装備コストと、装備したクリーチャーへの修整 */
export const equipment = (id, name, cost, rar, equipCost, buff, abilities = [], extra = {}) => ({
  ...base(id, name, cost, "アーティファクト", rar, [stat({ s: "auraBuff", p: buff.p, t: buff.t, ...(buff.kw ? { kw: buff.kw } : {}) }), abilities, { a: "equip", cost: equipCost }].flat(2), extra),
  subtype: "装備品",
});

/** カードの一覧にまとめてタグを付ける */
export const tagAll = (tag, cards) => cards.map((c) => ({ ...c, tags: [...new Set([...(c.tags ?? []), tag])] }));

// ---------------------------------------------------------------- 能力
export const kw = (...k) => k.map((x) => ({ a: "kw", kw: x }));
export const burn = (n) => ({ a: "burn", n });
/** 烈燃 N:0〜N枚の好きな枚数を燃焼できる */
export const fierceBurn = (n) => ({ a: "burn", n, upTo: true });
/** 疾駆 {コスト} */
export const dash = (cost) => ({ a: "dash", cost });
export const release = (cost) => ({ a: "release", cost });
export const kicker = (cost) => ({ a: "kicker", cost });
export const flashback = (cost) => ({ a: "flashback", cost });
export const cycling = (cost) => ({ a: "cycling", cost });
export const affinity = (filter) => ({ a: "affinity", filter });
export const free = (cond) => ({ a: "free", if: cond });
export const spell = (effects, targets, text) => ({
  a: "spell",
  effects: [effects].flat(),
  ...(targets ? { targets: [targets].flat() } : {}),
  ...(text ? { text } : {}),
});
const trig =
  (on, filter) =>
  (effects, targets, opts = {}) => ({
    a: "trigger",
    on,
    effects: [effects].flat(),
    ...(targets ? { targets: [targets].flat() } : {}),
    ...(filter ? { filter } : {}),
    ...opts,
  });
export const etb = trig("etb");
export const dies = trig("dies");
export const attacks = trig("attacks");
export const charge = trig("charge");
export const upkeep = trig("upkeep");
export const endStep = trig("endStep");
export const castSpell = trig("castSpell");
export const allyDies = trig("allyDies");
export const manaEnter = trig("manaEnter");
export const lifeGain = trig("lifeGain");
/** あなたが決闘に勝つたび */
export const duelWin = trig("duelWin");
/** この呪文を唱えたとき(打ち消されても誘発する) */
export const onCastSelf = trig("castSelf");
/** どこからでも墓地に置かれたとき */
export const toGraveyard = trig("toGraveyard");
/** 虚食:マナゾーンの裏向きのカード1枚につきコストが{1}少なくなる */
export const voidAffinity = () => ({ a: "voidAffinity" });
/** あなたが(filter に合う)パーマネントを生け贄に捧げるたび */
export const onSacrifice = (filter) => trig("sacrifice", filter);
/** 誘発を「1ターンに1回」にする */
export const once = (ability) => ({ ...ability, oncePerTurn: true });
/** リリース召喚 N(秘蔵庫のクリーチャー) */
/** リリース召喚 N:from は素材にできるパーマネントの条件の一覧(省略するとエンチャント)。{} はトークン以外のすべて */
export const releaseSummon = (n, from) => ({ a: "releaseSummon", n, ...(from ? { from } : {}) });
/** エントラータ N【cat】:喝采【cat】をN消費して秘蔵庫から出す */
export const entrata = (n, cat) => ({ a: "entrata", n, cat });
/** 開拓進化【color】N(grand なら大開拓進化) */
export const pioneer = (n, color, grand = false) => ({ a: "pioneer", n, color, ...(grand ? { grand } : {}) });
/** 組み立て【color】:秘蔵庫の発明品。partner(ID と名前)に武装進化する */
export const assemble = (color, partner, partnerName, cond = "attacked") => ({ a: "assemble", color, partner, partnerName, cond });
/** 秘蔵 ―:秘蔵庫に入れ、そこから唱えられる */
export const vaultCast = () => ({ a: "vaultCast" });
/** 留まる:次の対戦相手のターンの終了時まで戦場を離れず、その終了時にマナゾーンに置かれる */
export const anchor = () => ({ a: "anchor" });
/** 元のパワー(と、指定があればタフネス)が n 以下のクリーチャーしかブロックできない */
export const blockOnly = (maxPower, maxToughness) => ({ a: "blockOnly", maxPower, ...(maxToughness !== undefined ? { maxToughness } : {}) });
/** 開拓進化の素材に相手のクリーチャーも使える */
export const pioneerOppBase = (maxSum, minOpp) => ({ a: "pioneerOppBase", maxSum, minOpp });
/** 対戦相手のクリーチャーが攻撃するたび */
export const oppAttack = trig("oppAttack");
/** 原色 ―:マナゾーンの color の単色カード1枚につきコスト{1}軽減(第11.5弾) */
export const primaryDown = (color, mult = 1) => ({ a: "costDown", per: { count: "primary", color }, mult, label: "原色" });
/** そのほかのコスト軽減。per があれば「per 1つにつき{mult}」、なければ{n}。if があればその条件のときだけ */
export const costDown = (opts) => ({ a: "costDown", ...opts });
/** 染色 ―:このカードをチャージしたとき、マナゾーンが純色なら */
export const dye = (effects, targets) => ({ ...trig("charge")(effects, targets), if: "pureColor", dye: true });
/** あなたが各ターンに2枚目のカードを引くたび */
export const secondDraw = trig("secondDraw");
/** 原色の数(効果の量に使う) */
export const primaryCount = (color) => ({ count: "primary", color });
/** 純色払い */
export const pureCost = () => ({ a: "pureCost" });
/** 陶酔 ―:このカードが手札から捨てられたとき */
export const onDiscarded = trig("discarded");
/** あなたがカードを捨てるたび */
export const onDiscard = (filter) => trig("discard", filter);
/** 宝石獣:秘蔵庫に入り、強盗でマナに置かれ、マナ解放で唱える */
export const gem = () => ({ a: "gem" });
/** 金庫破り ― 秘蔵庫が空ならマナ解放のコスト{n}軽減 */
export const vaultCrack = (n) => ({ a: "vaultCrack", n });
/** 依存:アップキープに手札を1枚捨てる。捨てられないならNを失う */
export const addiction = (n = 2) => ({ a: "trigger", on: "upkeep", effects: [{ do: "addiction", n }], text: `依存(あなたのアップキープの開始時に、手札を1枚捨てる。捨てられないなら、あなたは${n}点のライフを失う)` });
/** 紋章 ― 埋蔵 N:マナゾーンから開拓進化で墓地に置くとき、マナ総量に+N */
export const buried = (n) => ({ a: "buried", n, from: "mana" });
/** 武装進化でのみ戦場に出る */
export const evolveOnly = () => ({ a: "evolveOnly" });
/** カーテンコール N【cat】:戦場の base の上に重ねて出す */
export const curtainCall = (n, cat, base, baseName, ovation, cut = 4) => ({ a: "curtainCall", n, cat, base, baseName, ...(ovation ? { ovation, cut } : {}) });
/** ウシータ(退場):秘蔵庫に戻るとき */
export const uscita = trig("uscita");
/** 喝采 */
export const applause = (cat, n) => ({ applause: cat, n });
/** 奉納 N(sub) */
export const offering = (n, sub) => ({ a: "offering", n, ...(sub ? { sub } : {}) });
/** モード呪文:modes は [ラベル, 効果, 対象] の配列 */
export const modal = (modes) => ({
  a: "spell",
  effects: [],
  modes: modes.map(([label, effects, targets, pay]) => ({ label, effects: [effects].flat(), ...(targets ? { targets: [targets].flat() } : {}), ...(pay ? { pay } : {}) })),
});
/** 生成されるカード(カードリストには入らない) */
export const gen = (id, name, cost, type, abilities, extra = {}) => {
  const c = { id, name, cost, type, rarity: "生成", abilities: [abilities ?? []].flat(2), ...extra };
  return { ...c, text: cardText(c) };
};
/** filter に合う呪文を唱えるたび */
export const onCast = (filter) => trig("cast", filter);
/** filter に合う他のパーマネントがあなたのコントロールで戦場に出るたび */
export const allyEnter = (filter) => trig("allyEnter", filter);
export const stat = (st, opts = {}) => ({ a: "static", st, ...opts });
export const act = (cost, effects, targets, text) => ({
  a: "activated",
  cost,
  effects: [effects].flat(),
  ...(targets ? { targets: [targets].flat() } : {}),
  ...(text ? { text } : {}),
});
export const mana = (...produce) => ({ a: "mana", produce });
/** 紋章:このカードがマナゾーンにあるあいだだけ働く常在・誘発能力にする */
export const crest = (ability) => ({ ...ability, from: "mana" });
/** 元になったカードとの関係(強化パック用):kind は 強化版 / リメイク / サポート */
export const basedOn = (card, id, kind) => ({ ...card, basedOn: { id, kind } });

// 常在能力の略記
export const anthem = (p, t, opts = {}) => stat({ s: "anthem", p, t, ...opts });
export const lord = (filter, p, t, kw, others = true) => stat({ s: "anthem", p, t, filter, others, ...(kw ? { kw } : {}) });
export const scale = (per, p, t) => stat({ s: "scale", per, p, t });
export const discount = (filter, n = 1) => stat({ s: "discount", filter, n });
export const selfIf = (cond, p, t, kw) => stat({ s: "self", p, t, ...(kw ? { kw } : {}) }, { if: cond });

// ---------------------------------------------------------------- 絞り込み・数・条件
export const F = {
  human: { sub: "人間" },
  goblin: { sub: "ゴブリン" },
  elf: { sub: "エルフ" },
  zombie: { sub: "ゾンビ" },
  knight: { sub: "騎士" },
  wizard: { sub: "ウィザード" },
  creature: { type: "クリーチャー" },
  enchant: { type: "エンチャント" },
  artifact: { type: "アーティファクト" },
  spell: { spell: true },
  mv3: { mv: 3 },
  hoshi: { name: "星詠み" },
  tekki: { name: "鉄機" },
};
export const count = (kind) => ({ count: kind });
export const countPerm = (filter) => ({ count: "perm", filter });
export const armed = (color, n) => ({ armed: color, n });
export const control = (filter, n) => ({ control: filter, n });

// 対象
export const T = {
  cre: { t: "creature" },
  opp: { t: "creature", who: "opp" },
  you: { t: "creature", who: "you" },
  any: { t: "any" },
  player: { t: "player" },
  spell: { t: "spell" },
  gyCre: { t: "graveyard", cardType: "クリーチャー" },
  gy: { t: "graveyard" },
  gyF: (filter) => ({ t: "graveyard", filter }),
  creF: (filter, who) => ({ t: "creature", filter, ...(who ? { who } : {}) }),
  perm: (types, who) => ({ t: "permanent", types, ...(who ? { who } : {}) }),
};

// 効果
export const E = {
  dmg: (n, tg = 0) => ({ do: "damage", n, tg }),
  dmgOpp: (n) => ({ do: "damage", n, to: "opp" }),
  dmgAll: (n, players = false) => ({ do: "damageAll", n, ...(players ? { players } : {}) }),
  dmgAllOpp: (n, players = false) => ({ do: "damageAll", n, who: "opp", ...(players ? { players } : {}) }),
  destroy: (tg = 0) => ({ do: "destroy", tg }),
  destroyAll: (maxPower, filter) => ({ do: "destroyAll", ...(maxPower !== undefined ? { maxPower } : {}), ...(filter ? { filter } : {}) }),
  exile: (tg = 0) => ({ do: "exile", tg }),
  bounce: (tg = 0) => ({ do: "bounce", tg }),
  bounceAll: (who) => ({ do: "bounceAll", ...(who ? { who } : {}) }),
  tuck: (tg = 0) => ({ do: "tuck", tg }),
  tap: (tg = 0, freeze = false) => ({ do: "tap", tg, ...(freeze ? { freeze } : {}) }),
  untap: (tg = 0) => ({ do: "untap", tg }),
  untapAll: () => ({ do: "untap", all: true }),
  tapAll: () => ({ do: "tapAll", who: "opp" }),
  pump: (p, t, kw, tg = 0) => ({ do: "pump", tg, p, t, ...(kw ? { kw } : {}) }),
  pumpSelf: (p, t, kw) => ({ do: "pump", self: true, p, t, ...(kw ? { kw } : {}) }),
  pumpAll: (p, t, kw, who = "you", filter) => ({ do: "pumpAll", who, p, t, ...(kw ? { kw } : {}), ...(filter ? { filter } : {}) }),
  buffSelf: (p, t, kw) => ({ do: "buffSelf", p, t, ...(kw ? { kw } : {}) }),
  counters: (n, tg = 0) => ({ do: "counters", tg, n }),
  countersSelf: (n) => ({ do: "counters", self: true, n }),
  countersAll: (n, filter) => ({ do: "countersAll", n, ...(filter ? { filter } : {}) }),
  draw: (n) => ({ do: "draw", n }),
  discard: (n, who = "you") => ({ do: "discard", n, who }),
  gain: (n) => ({ do: "gainLife", n }),
  lose: (n, who = "opp") => ({ do: "loseLife", n, who }),
  token: (n, p, t, color, sub, kw, artifact = false) => ({ do: "token", n, p, t, color, sub, ...(kw ? { kw } : {}), ...(artifact ? { artifact } : {}) }),
  counter: (tg = 0) => ({ do: "counter", tg }),
  ret: (to, tg = 0) => ({ do: "returnCard", tg, to }),
  ramp: (n, tapped = false) => ({ do: "rampTop", n, ...(tapped ? { tapped } : {}) }),
  extraCharge: (n = 1) => ({ do: "extraCharge", n }),
  reclaim: (then) => ({ do: "reclaim", ...(then ? { then } : {}) }),
  erode: (n) => ({ do: "erode", n }),
  sac: (n = 1) => ({ do: "sacrifice", ...(n > 1 ? { n } : {}) }),
  fight: () => ({ do: "fight", tg: [0, 1] }),
  bite: () => ({ do: "bite", tg: [0, 1] }),
  lookTop: () => ({ do: "lookTop" }),
  addMana: (m) => ({ do: "addMana", mana: m }),
  tutor: (filter, to = "hand") => ({ do: "tutor", filter, to }),
  mill: (n, who = "opp") => ({ do: "mill", n, who }),
  plunder: (n) => ({ do: "plunder", n }),
  /** 虚化 N:自分のマナゾーンのカードをN枚裏向きにする */
  veil: (n) => ({ do: "veil", n }),
  /** 嚥下 N:相手のライブラリーの上からN枚を裏向きで自分のマナゾーンに置く */
  ingest: (n) => ({ do: "ingest", n }),
  /** 相手のマナゾーンのカードを裏向きにする */
  veilOpp: (n, opts = {}) => ({ do: "veilOpp", n, ...opts }),
  shuffleGy: () => ({ do: "shuffleGraveyard" }),
  /** 落とし子:生け贄に捧げると{C}を出す 0/1 */
  spawn: (n) => ({ do: "token", n, p: 0, t: 1, color: "C", sub: "虚無・落とし子", spawn: true }),
  manifest: (maxMV, haste = false) => ({ do: "manifest", maxMV, ...(haste ? { haste } : {}) }),
  /** 生成:card(gen で作る)をN枚手札に加える */
  create: (card, n = 1) => ({ do: "create", card, n }),
  /** 喝采【cat】を N 増やす */
  applause: (cat, n = 1) => ({ do: "applause", cat, n }),
  /** card を N 枚生成してマナゾーンに置く(ターン終了時に墓地に置かれる) */
  createMana: (card, n = 1) => ({ do: "createMana", card, n }),
  /** 強盗 N(fallback:秘蔵庫が空のときに手札に加える生成カード) */
  perApplause: (cat, div, effects) => ({ do: "perApplause", cat, div, effects: [effects].flat() }),
  callForest: (n, minMV) => ({ do: "callForest", n, minMV }),
  stomp: () => ({ do: "stomp" }),
  handBlast: (per) => ({ do: "handBlast", ...(per ? { per } : {}) }),
  heist: (n, fallback) => ({ do: "heist", n, ...(fallback ? { fallback } : {}) }),
  /** 純色払いの色に応じたキーワードを得る */
  paidColorKw: () => ({ do: "paidColorKw" }),
  /** このカードをマナゾーンに置く */
  selfToMana: () => ({ do: "selfToMana" }),
  /** 加護を得る */
  blessing: (id) => ({ do: "blessing", id }),
  /** 決闘:対象は [自分のクリーチャー, 相手のクリーチャー]。win は勝ったときの効果 */
  duel: (win) => ({ do: "duel", tg: [0, 1], ...(win ? { win: [win].flat() } : {}) }),
  /** このクリーチャー自身が決闘する。対象は [相手のクリーチャー] */
  duelSelf: (win) => ({ do: "duel", tg: [0], self: true, ...(win ? { win: [win].flat() } : {}) }),
};
export const iff = (cond, e) => ({ ...e, if: cond });
export const unless = (cond, e) => ({ ...e, unless: cond });
export const may = (e) => ({ ...e, may: true });

// ---------------------------------------------------------------- 文章生成
const COLOR_JA = { W: "白", U: "青", B: "黒", R: "赤", G: "緑", C: "無色" };

function signed(n) {
  return n >= 0 ? `+${n}` : `${n}`;
}
function ptText(p, t) {
  return `${signed(p)}/${signed(t)}`;
}
function kwList(kws) {
  return kws.join("と");
}

/** 絞り込みの言葉。ctx = creature / permanent / card / spell */
export function filterPhrase(f = {}, ctx = "creature") {
  const adj = [];
  if (f.name) adj.push(`「${f.name}」と名のついた`);
  if (f.color) adj.push(`${COLOR_JA[f.color]}の`);
  if (f.mv !== undefined) adj.push(`マナ総量が${f.mv}の`);
  if (f.minMV !== undefined) adj.push(`マナ総量が${f.minMV}以上の`);
  if (f.maxMV !== undefined) adj.push(`マナ総量が${f.maxMV}以下の`);
  if (f.maxPower !== undefined) adj.push(`パワーが${f.maxPower}以下の`);
  if (f.minPower !== undefined) adj.push(`パワーが${f.minPower}以上の`);
  let noun;
  if (f.sub) noun = ctx === "spell" ? `${f.sub}呪文` : ctx === "card" ? `${f.sub}・カード` : f.sub;
  else if (f.type) noun = ctx === "spell" ? `${f.type}呪文` : ctx === "card" ? `${f.type}・カード` : f.type;
  else if (f.spell) noun = ctx === "card" ? "インスタントかソーサリー・カード" : "インスタントかソーサリーである呪文";
  else noun = { creature: "クリーチャー", permanent: "パーマネント", card: "カード", spell: "呪文" }[ctx];
  return adj.join("") + noun;
}

const COUNT_TEXT = {
  mana: "あなたのマナゾーンにあるカードの枚数",
  creatures: "あなたがコントロールするクリーチャーの数",
  oppCreatures: "対戦相手がコントロールするクリーチャーの数",
  graveyard: "あなたの墓地にあるカードの枚数",
  hand: "あなたの手札の枚数",
  colorsInMana: "あなたのマナゾーンにあるカードの色の数",
  burned: "燃焼した枚数",
  crests: "あなたのマナゾーンにある紋章を持つカードの枚数",
  colorlessMana: "あなたのマナゾーンにある欠色のカード(裏向きを含む)の枚数",
  graveyardCreatures: "あなたの墓地にあるクリーチャー・カードの枚数",
};
const PER_TEXT = {
  mana: "あなたのマナゾーンにあるカード1枚につき",
  creatures: "あなたがコントロールするクリーチャー1体につき",
  oppCreatures: "対戦相手がコントロールするクリーチャー1体につき",
  graveyard: "あなたの墓地にあるカード1枚につき",
  hand: "あなたの手札1枚につき",
  colorsInMana: "あなたのマナゾーンにあるカードの色1色につき",
  crests: "あなたのマナゾーンにある紋章を持つカード1枚につき",
  colorlessMana: "あなたのマナゾーンにある欠色のカード1枚につき",
  graveyardCreatures: "あなたの墓地にあるクリーチャー・カード1枚につき",
};
function countText(n) {
  if (n.count === "applause") return `あなたの喝采【${n.cat}】の数`;
  if (n.count === "primary") return `原色(あなたのマナゾーンにある${COLOR_JA[n.color]}の単色カードの枚数)`;
  if (n.count === "perm") return `あなたがコントロールする${filterPhrase(n.filter, "permanent")}の数`;
  return COUNT_TEXT[n.count];
}
function perText(n) {
  if (n.count === "applause") return `あなたの喝采【${n.cat}】1につき`;
  if (n.count === "primary") return `あなたのマナゾーンにある${COLOR_JA[n.color]}の単色カード1枚につき`;
  if (n.count === "perm") return `あなたがコントロールする${filterPhrase(n.filter, "permanent")}1${unitOf(n.filter)}につき`;
  return PER_TEXT[n.count];
}

/** 効果文の中の数。数えるものは X にして、文末に説明を足す */
function amountText(n, notes) {
  if (n === "X") return "X";
  if (typeof n === "number") return String(n);
  const note = `Xは${countText(n)}に等しい。`;
  if (!notes.includes(note)) notes.push(note);
  return "X";
}

export function condLabel(c) {
  if (typeof c === "object") {
    if ("armed" in c) return `マナ武装 ${c.n}(${COLOR_JA[c.armed]})`;
    if ("applause" in c) return `喝采【${c.applause}】${c.n}`;
    if ("primary" in c) return `原色 ${c.n}(${COLOR_JA[c.primary]})`;
    return null;
  }
  return (
    {
      bloom: "開花",
      fullBloom: "満開",
      threshold: "深淵",
      abyss: "奈落",
      hellbent: "背水",
      highlander: "孤高",
      metalcraft: "機巧",
      ferocious: "獰猛",
      oppTurn: "伏兵",
      intrigue: "陰謀",
      void: "虚空",
      raid: "強襲",
      chain: "連唱",
      vaultEmpty: "金庫破り",
      pureColor: "純色",
      vacuum: "真空",
    }[c] ?? null
  );
}

/** 条件の前置き(効果に付けるとき) */
/** 数える単位(クリーチャーは「体」) */
function unitOf(f = {}) {
  const creatureSub = f.sub && !["装備品", "オーラ"].includes(f.sub);
  return creatureSub || (f.type && f.type.includes("クリーチャー")) ? "体" : "つ";
}

function condPrefix(c) {
  const label = condLabel(c);
  if (label) return `${label} ― `;
  if (typeof c === "object" && "manaMV" in c) return `あなたのマナゾーンにあるカードのマナ総量の合計が${c.manaMV}以上なら、`;
  if (typeof c === "object") return `あなたが${filterPhrase(c.control, "permanent")}を${c.n}${unitOf(c.control)}以上コントロールしているなら、`;
  return { pioneeredGame: "このゲームであなたが開拓進化をしたなら、", buriedInMana: "あなたのマナゾーンに埋蔵を持つカードがあるなら、", burned: "燃焼したなら、", kicked: "追加払いしたなら、", fewerMana: "あなたのマナゾーンのカードが対戦相手より少ないなら、", notMoreMana: "あなたのマナゾーンのカードが対戦相手の枚数以下なら、" }[c];
}

/** 条件の前置き(常在能力に付けるとき) */
function condWhile(c) {
  const label = condLabel(c);
  if (label) return `${label} ― `;
  if (typeof c === "object") return `あなたが${filterPhrase(c.control, "permanent")}を${c.n}${unitOf(c.control)}以上コントロールしているかぎり、`;
  return { fewerMana: "あなたのマナゾーンのカードが対戦相手より少ないかぎり、", kicked: "追加払いしたなら、" }[c] ?? "";
}

/** 零式の条件(〜なら) */
function condPlain(c) {
  if (typeof c === "object") {
    if ("armed" in c) return `あなたのマナゾーンに${COLOR_JA[c.armed]}のカードが${c.n}枚以上ある`;
    if ("applause" in c) return `あなたの喝采【${c.applause}】が${c.n}以上ある`;
    if ("primary" in c) return `あなたのマナゾーンに${COLOR_JA[c.primary]}の単色カードが${c.n}枚以上ある`;
    if ("manaMV" in c) return `あなたのマナゾーンにあるカードのマナ総量の合計が${c.manaMV}以上である`;
    return `あなたが${filterPhrase(c.control, "permanent")}を${c.n}${unitOf(c.control)}以上コントロールしている`;
  }
  return {
    bloom: "あなたのマナゾーンにカードが7枚以上ある",
    fullBloom: "あなたのマナゾーンにカードが10枚以上ある",
    abyss: "あなたの墓地にカードが12枚以上ある",
    oppTurn: "対戦相手のターンである",
    void: "あなたのマナゾーンのカードの半分以上が欠色である",
    raid: "このターン、あなたがクリーチャー2体以上で攻撃した",
    chain: "このターン、あなたがインスタントかソーサリーを2つ以上唱えた",
    vaultEmpty: "あなたの秘蔵庫にカードがない",
    pureColor: "あなたのマナゾーンのカードがすべて同じ1色である",
    pioneeredGame: "このゲームであなたが開拓進化をした",
    buriedInMana: "あなたのマナゾーンに埋蔵を持つカードがある",
    vacuum: "あなたのマナゾーンのカードがすべて欠色である",
    intrigue: "このターン、対戦相手がカードを捨てたか、対戦相手のクリーチャーが戦場を離れた",
    threshold: "あなたの墓地にカードが7枚以上ある",
    hellbent: "あなたの手札がない",
    highlander: "あなたのデッキに同じ名前のカードが2枚以上入っていない",
    metalcraft: "あなたがアーティファクトを3つ以上コントロールしている",
    ferocious: "あなたがパワー4以上のクリーチャーをコントロールしている",
    fewerMana: "あなたのマナゾーンのカードが対戦相手より少ない",
    notMoreMana: "あなたのマナゾーンのカードが対戦相手の枚数以下である",
  }[c];
}

function targetText(spec) {
  switch (spec.t) {
    case "creature": {
      const parts = [];
      if (spec.who === "opp") parts.push("対戦相手がコントロールする");
      if (spec.who === "you") parts.push("あなたがコントロールする");
      if (spec.tapped) parts.push("タップ状態の");
      if (spec.minPower !== undefined) parts.push(`パワーが${spec.minPower}以上の`);
      if (spec.maxPower !== undefined) parts.push(`パワーが${spec.maxPower}以下の`);
      if (spec.flying) parts.push("飛行を持つ");
      const noun = spec.filter ? filterPhrase(spec.filter, "creature") : "クリーチャー";
      if (spec.nonColor) return `${parts.join("")}${COLOR_JA[spec.nonColor]}でない${noun}1体`;
      return `${parts.join("")}${noun}1体`;
    }
    case "any":
      return "クリーチャー1体かプレイヤー1人";
    case "player":
      return "対戦相手1人";
    case "spell":
      if (spec.noncreature) return "クリーチャーでない呪文1つ";
      if (spec.maxMV !== undefined) return `マナ総量が${spec.maxMV}以下の呪文1つ`;
      return "呪文1つ";
    case "permanent": {
      const who = spec.who === "opp" ? "対戦相手がコントロールする" : spec.who === "you" ? "あなたがコントロールする" : "";
      return `${who}${spec.types.join("か")}1つ`;
    }
    case "graveyard":
      if (spec.filter) return `あなたの墓地にある${filterPhrase(spec.filter, "card")}1枚`;
      return spec.cardType ? `あなたの墓地にある${spec.cardType}・カード1枚` : "あなたの墓地にあるカード1枚";
  }
}

function tokenText(e, notes) {
  const kws = e.kw?.length ? `${e.kw.join("、")}を持つ` : "";
  const pt = typeof e.p === "object" ? "X/X" : `${e.p}/${e.t}`;
  if (typeof e.p === "object") amountText(e.p, notes);
  const n = amountText(e.n, notes);
  const kind = e.artifact ? "アーティファクト・クリーチャー" : "クリーチャー";
  const spawn = e.spawn ? "それは「このクリーチャーを生け贄に捧げる:{C}を加える。」を持つ。" : "";
  return `${kws}${pt}の${COLOR_JA[e.color]}の${e.sub}・${kind}・トークンを${n}体生成する。${spawn}`;
}

/** 効果1つの文章 */
function effectText(e, name, abil, notes) {
  const it = (i = 0) => (abil.targets && abil.targets.length > 1 ? (i === 0 ? "前者" : "後者") : "それ");
  const a = (n) => amountText(n, notes);
  const m = e.may;
  switch (e.do) {
    case "damage":
      if (e.to === "opp") return `${name}は対戦相手に${a(e.n)}点のダメージを与える。`;
      return `${name}は${it(e.tg)}に${a(e.n)}点のダメージを与える。`;
    case "damageAll":
      if (e.who === "opp")
        return `${name}は対戦相手がコントロールする各クリーチャー${e.players ? "と対戦相手" : ""}にそれぞれ${a(e.n)}点のダメージを与える。`;
      return `${name}は各クリーチャー${e.players ? "と各プレイヤー" : ""}にそれぞれ${a(e.n)}点のダメージを与える。`;
    case "destroy":
      return `${it(e.tg)}を破壊する。`;
    case "destroyAll": {
      const f = { ...(e.filter ?? {}), ...(e.maxPower !== undefined ? { maxPower: e.maxPower } : {}) };
      if (!Object.keys(f).length) return "すべてのクリーチャーを破壊する。";
      return `${filterPhrase(f, "creature")}${f.sub || f.type ? "" : ""}をすべて破壊する。`;
    }
    case "exile":
      return `${it(e.tg)}を追放する。`;
    case "bounce":
      return `${it(e.tg)}を持ち主の手札に戻す。`;
    case "bounceAll":
      return e.who === "opp" ? "対戦相手のクリーチャーをすべて持ち主の手札に戻す。" : "すべてのクリーチャーを持ち主の手札に戻す。";
    case "tuck":
      return `${it(e.tg)}を持ち主のライブラリーの一番上に置く。`;
    case "tap":
      return `${it(e.tg)}をタップする。${e.freeze ? "それは、そのコントローラーの次のアンタップ・ステップにアンタップしない。" : ""}`;
    case "untap":
      return e.all ? "あなたがコントロールするクリーチャーをすべてアンタップする。" : `${it(e.tg)}をアンタップする。`;
    case "tapAll":
      return "対戦相手がコントロールするクリーチャーをすべてタップする。";
    case "pump": {
      const who = e.self ? name : it(e.tg);
      const kws = e.kw?.length ? `、${kwList(e.kw)}を得る` : "";
      if (e.p === 0 && e.t === 0) return `ターン終了時まで、${who}は${kwList(e.kw)}を得る。`;
      const pt = typeof e.p === "object" ? `+${a(e.p)}/+${a(e.t)}` : ptText(e.p, e.t);
      return `ターン終了時まで、${who}は${pt}の修整を受け${kws}${kws ? "。" : "る。"}`;
    }
    case "pumpAll": {
      const who = e.who === "all" ? `すべての${filterPhrase(e.filter, "creature")}` : e.who === "opp" ? `対戦相手がコントロールする${filterPhrase(e.filter, "creature")}` : `あなたがコントロールする${filterPhrase(e.filter, "creature")}`;
      const kws = e.kw?.length ? `、${kwList(e.kw)}を得る` : "";
      if (e.p === 0 && e.t === 0) return `ターン終了時まで、${who}は${kwList(e.kw)}を得る。`;
      return `ターン終了時まで、${who}は${ptText(e.p, e.t)}の修整を受け${kws}${kws ? "。" : "る。"}`;
    }
    case "buffSelf":
      return `${name}は${ptText(e.p, e.t)}の修整を受ける。`;
    case "counters":
      return `${e.self ? name : it(e.tg)}の上に+1/+1カウンターを${a(e.n)}個置く。`;
    case "countersAll":
      return `あなたがコントロールする各${filterPhrase(e.filter, "creature")}の上に+1/+1カウンターを${e.n}個置く。`;
    case "draw":
      return `カードを${a(e.n)}枚引く。`;
    case "discard":
      return e.who === "opp" ? `対戦相手は手札を${e.n}枚捨てる。` : `カードを${e.n}枚捨てる。`;
    case "gainLife":
      return `あなたは${a(e.n)}点のライフを得る。`;
    case "loseLife":
      return e.who === "opp" ? `対戦相手は${a(e.n)}点のライフを失う。` : `あなたは${a(e.n)}点のライフを失う。`;
    case "token":
      return tokenText(e, notes);
    case "counter":
      return `${it(e.tg)}を打ち消す。`;
    case "returnCard": {
      const to = { hand: "あなたの手札に戻", battlefield: "戦場に戻", mana: "あなたのマナゾーンに置" }[e.to];
      return m ? `${it(e.tg)}を${to}${e.to === "mana" ? "いてもよい" : "してもよい"}。` : `${it(e.tg)}を${to}${e.to === "mana" ? "く" : "す"}。`;
    }
    case "rampTop":
      return `あなたのライブラリーの一番上のカード${e.n > 1 ? `${e.n}枚` : ""}を${e.tapped ? "タップ状態で" : ""}あなたのマナゾーンに置く。`;
    case "extraCharge":
      return `このターン、あなたは追加で${e.n}回チャージを行ってもよい。`;
    case "reclaim":
      if (e.then?.length) return `還元を行ってもよい。そうしたなら、${e.then.map((x) => effectText(x, name, abil, notes)).join("")}`;
      return "還元を行う。";
    case "erode":
      return `侵食 ${e.n}。`;
    case "sacrifice":
      return `対戦相手はクリーチャー${e.n ?? 1}体を生け贄に捧げる。`;
    case "fight":
      return "それらはそれぞれ、自身のパワーに等しいダメージを互いに与える。";
    case "bite":
      return "前者は後者に自身のパワーに等しいダメージを与える。";
    case "duel": {
      const me = e.self ? name : it(e.tg[0]);
      const foe = e.self ? it(e.tg[0]) : it(e.tg[1]);
      const win = (e.win ?? []).map((x) => effectText(x, name, abil, notes)).join("");
      return `${me}は${foe}と決闘する。${win ? `${me}が勝ったなら、${win}` : ""}`;
    }
    case "lookTop":
      return "あなたのライブラリーの一番上のカードを見る。そのカードをライブラリーの一番下に置いてもよい。";
    case "addMana":
      return `${e.mana}を加える。`;
    case "tutor": {
      const to = { hand: "公開して手札に加える", battlefield: "戦場に出す", mana: "あなたのマナゾーンに置く" }[e.to];
      return `あなたのライブラリーから${filterPhrase(e.filter, "card")}を1枚探し、${to}。その後ライブラリーを切り直す。`;
    }
    case "plunder":
      return `略奪 ${e.n}。`;
    case "veil":
      return `虚化 ${e.n}。`;
    case "ingest":
      return `嚥下 ${e.n}。`;
    case "veilOpp":
      if (e.all) return "対戦相手のマナゾーンにある表向きのカードをすべて裏向きにする。";
      return `対戦相手のマナゾーンにある${e.crest ? "紋章を持つ" : "表向きの"}カードを${e.n}枚選び、裏向きにする。`;
    case "applause":
      return `あなたの喝采【${e.cat}】を${e.n}増やす。`;
    case "blessing":
      return `あなたは加護《${e.id}》を得る。`;
    case "paidColorKw":
      return `${name}は、純色払いで支払った色に応じて、白なら警戒、青なら飛行、黒なら接死、赤なら速攻、緑ならトランプルを得る。`;
    case "perApplause":
      return `このゲームで得た喝采【${e.cat}】の累計${e.div}につき1回、次を行う:「${e.effects.map((x) => effectText(x, name, abil, notes)).join("")}」`;
    case "callForest":
      return `あなたのライブラリーの一番上のカード${e.n}枚をあなたのマナゾーンに置く。その中からマナ総量${e.minMV}以上のクリーチャー・カード1枚を戦場に出してもよい。`;
    case "stomp":
      return "あなたがコントロールするクリーチャーのうちパワーが最も大きいもの1体は、対戦相手がコントロールするクリーチャーそれぞれに、そのパワーに等しいダメージを与える。";
    case "handBlast":
      return e.per
        ? `このゲームで得た喝采【${e.per.cat}】の累計${e.per.div}につき1回、次を行う(0回なら何もしない):あなたの手札をすべて捨て、捨てた枚数に等しい回数、対戦相手か対戦相手のクリーチャーをランダムに1つ選び、1点のダメージを与える。(2回目以降は最初に捨てた枚数を使う)`
        : "あなたの手札をすべて捨てる。捨てたカード1枚につき、対戦相手か対戦相手のクリーチャーをランダムに1つ選び、1点のダメージを与える。";
    case "heist":
      return `強盗 ${e.n}(あなたの秘蔵庫からカードを${e.n}枚選び、タップ状態でマナゾーンに置く${e.fallback ? `。秘蔵庫が空なら、代わりに《${e.fallback.name}》(${e.fallback.cost} ${e.fallback.type}:${(e.fallback.text ?? []).join(" ")})を手札に加える` : ""})。`;
    case "selfToMana":
      return `${name}をタップ状態であなたのマナゾーンに置く。`;
    case "addiction":
      return `手札を1枚捨てる。捨てられないなら、あなたは${e.n}点のライフを失う。`;
    case "createMana":
      return `《${e.card.name}》(${e.card.cost} ${e.card.type}:${(e.card.text ?? []).join(" ")})を${e.n}枚生成し、あなたのマナゾーンに置く。ターン終了時に、それらを墓地に置く。`;
    case "create": {
      const c = e.card;
      const pt = c.power !== undefined ? ` ${c.power}/${c.toughness}` : "";
      return `《${c.name}》(${c.cost} ${c.type}${pt}:${c.text.join(" ") || "能力なし"})を${a(e.n)}枚あなたの手札に加える。`;
    }
    case "shuffleGraveyard":
      return "あなたの墓地にあるカードをすべてライブラリーに加え、ライブラリーを切り直す。";
    case "manifest":
      return `顕現 ${e.maxMV}。${e.haste ? "ターン終了時まで、そのクリーチャーは速攻を得る。" : ""}`;
    case "mill":
      return e.who === "opp"
        ? `対戦相手は自分のライブラリーの一番上から${a(e.n)}枚を墓地に置く。`
        : `あなたのライブラリーの一番上から${a(e.n)}枚をあなたの墓地に置く。`;
  }
  throw new Error(`文章を作れない効果: ${JSON.stringify(e)}`);
}

const sameCond = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** すべての効果に同じ条件が付いているなら、その条件(能力全体の前に出す) */
function sharedCond(abil) {
  const effs = abil.effects ?? [];
  if (!effs.length || effs.some((e) => !e.if || e.unless)) return null;
  return effs.every((e) => sameCond(e.if, effs[0].if)) ? effs[0].if : null;
}

function bodyText(abil, name, hoisted = null) {
  const notes = [];
  const targets = abil.targets?.length
    ? abil.targets.length === 2
      ? `${targetText(abil.targets[0])}と、${targetText(abil.targets[1])}を対象とする。`
      : `${targetText(abil.targets[0])}を対象とする。`
    : "";
  const effs = abil.effects;
  const body = effs
    .map((e, i) => {
      const t = effectText(e, name, abil, notes);
      if (e.if && !hoisted) {
        // 直前に「〜でないなら」の効果があれば、この効果はその代わり
        const prev = effs[i - 1];
        const instead = prev && prev.unless && sameCond(prev.unless, e.if) ? "代わりに、" : "";
        return condPrefix(e.if) + instead + t;
      }
      return t;
    })
    .join("");
  return targets + body + notes.join("");
}

const TRIGGER_PREFIX = {
  etb: (n) => `${n}が戦場に出たとき、`,
  dies: (n) => `${n}が死亡したとき、`,
  attacks: (n) => `${n}が攻撃するたび、`,
  charge: () => "チャージ時 ― ",
  upkeep: () => "あなたのアップキープの開始時に、",
  endStep: () => "あなたの終了ステップの開始時に、",
  castSpell: () => "あなたがインスタントかソーサリーである呪文を唱えるたび、",
  cast: (n, f) => `あなたが${filterPhrase(f, "spell")}を唱えるたび、`,
  allyDies: () => "あなたがコントロールするクリーチャーが死亡するたび、",
  allyEnter: (n, f) => `他の${filterPhrase(f, "permanent")}があなたのコントロールで戦場に出るたび、`,
  manaEnter: () => "鼓動 ― あなたのマナゾーンにカードが置かれるたび、",
  lifeGain: () => "あなたがライフを得るたび、",
  duelWin: () => "あなたが決闘に勝つたび、",
  castSelf: (n) => `あなたが${n}を唱えたとき、`,
  sacrifice: (n, f) => `あなたが${f ? filterPhrase(f, "permanent") : "パーマネント"}を生け贄に捧げるたび、`,
  discarded: () => "陶酔 ― ",
  discard: (n, f) => `あなたが${f ? filterPhrase(f, "card") : "カード"}を捨てるたび、`,
  toGraveyard: (n) => `${n}がどこからでも墓地に置かれたとき、`,
  uscita: () => "ウシータ ― ",
  secondDraw: () => "あなたが各ターンに2枚目のカードを引くたび、",
  oppAttack: () => "対戦相手がコントロールするクリーチャーが攻撃するたび、",
};

function staticText(abil, name, card) {
  const st = abil.st;
  const kws = st.kw?.length ? kwList(st.kw) : "";
  const tail = (pt) => `${pt}の修整を受け${kws ? `、${kws}を持つ。` : "る。"}`;
  let body;
  switch (st.s) {
    case "anthem": {
      const noun = filterPhrase(st.filter, "creature");
      const who = st.others ? `あなたがコントロールする他の${noun}` : `あなたがコントロールする${noun}`;
      body = st.p === 0 && st.t === 0 ? `${who}は${kws}を持つ。` : `${who}は${tail(ptText(st.p, st.t))}`;
      break;
    }
    case "self":
      if (st.p === 0 && st.t === 0) body = `${name}は${kws}を持つ。`;
      else body = `${name}は${tail(ptText(st.p, st.t))}`;
      break;
    case "scale":
      body = `${name}は、${perText(st.per)}${ptText(st.p, st.t)}の修整を受ける。`;
      break;
    case "extraCharge":
      body = `あなたは各ターンに追加で${st.n}回チャージを行ってもよい。`;
      break;
    case "pacify":
      body = "エンチャントしているクリーチャーは攻撃もブロックもできない。";
      break;
    case "auraBuff": {
      const who = card.abilities.some((x) => x.a === "equip") ? "装備しているクリーチャー" : "エンチャントしているクリーチャー";
      body = st.p === 0 && st.t === 0 ? `${who}は${kws}を持つ。` : `${who}は${tail(ptText(st.p, st.t))}`;
      break;
    }
    case "discount":
      body = `あなたが唱える${filterPhrase(st.filter, "spell")}を唱えるためのコストは{${st.n}}少なくなる。`;
      break;
  }
  if (abil.if) return condWhile(abil.if) + body;
  return body;
}

function costSymbolsText(cost, name) {
  const parts = [];
  if (cost.mana) parts.push(cost.mana);
  if (cost.tap) parts.push("{T}");
  if (cost.life) parts.push(`${cost.life}点のライフを支払う`);
  if (cost.sac) parts.push(`${filterPhrase(cost.sac, "creature")}を1体生け贄に捧げる`);
  if (cost.sacSelf) parts.push(`${name}を生け贄に捧げる`);
  if (cost.applause) parts.push(`喝采【${cost.applause.cat}】を${cost.applause.n}消費する`);
  if (cost.discard) parts.push(`手札を${cost.discard}枚捨てる`);
  return parts.join(", ");
}

function abilityText(abil, card) {
  const t = abilityTextBody(abil, card);
  return abil.from === "mana" && !abil.text ? `紋章 ― ${t}` : t;
}

function abilityTextBody(abil, card) {
  const name = card.name;
  if (abil.text) return abil.text;
  switch (abil.a) {
    case "burn":
      return abil.upTo ? `烈燃 ${abil.n}` : `燃焼 ${abil.n}`;
    case "dash":
      return `疾駆 ${abil.cost}`;
    case "release":
      return `マナ解放 ${abil.cost}`;
    case "kicker":
      return `追加払い ${abil.cost}`;
    case "flashback":
      return `再演 ${abil.cost}`;
    case "cycling":
      return `循環 ${abil.cost}`;
    case "equip":
      return `装備 ${abil.cost}`;
    case "entrata":
      return `エントラータ ${abil.n}【${abil.cat}】`;
    case "curtainCall":
      return `カーテンコール ${abil.n}【${abil.cat}】(あなたの《${abil.baseName}》の上に重ねる。喝采【${abil.cat}】を${abil.n}消費して、秘蔵庫からこのクリーチャーを出す。《${abil.baseName}》は秘蔵庫に戻る)${abil.ovation ? `\n大喝采 ${abil.ovation}(このゲームで得た喝采【${abil.cat}】が累計${abil.ovation}以上なら、あなたは秘蔵庫からこのクリーチャーを、コストを{${abil.cut}}少なくして唱えてもよい)` : ""}`;
    case "pioneer":
      return abil.grand ? `大開拓進化【${COLOR_JA[abil.color]}】${abil.n}(あなたの開拓者1体の上に重ねる。3枚以上)` : `開拓進化【${COLOR_JA[abil.color]}】${abil.n}`;
    case "assemble": {
      const cond = abil.cond === "attacked" ? "このターン、装備しているクリーチャーが攻撃したなら" : "装備しているクリーチャーに装備品が2つ以上ついているなら";
      return `組み立て【${COLOR_JA[abil.color]}】 / 武装進化 ― ${cond}、そのクリーチャーと${name}を《${abil.partnerName}》に武装進化してもよい。`;
    }
    case "pureCost":
      return "純色払い(このカードのコストは、すべて同じ1色のマナで支払わなければならない)";
    case "gem":
      return `宝石獣(秘蔵庫に入る。強盗でマナゾーンに置かれ、マナ解放で唱える。マナゾーンや戦場を離れると秘蔵庫に戻る)`;
    case "vaultCrack":
      return `金庫破り ― あなたの秘蔵庫にカードがないなら、マナ解放のコストは{${abil.n}}少なくなる。`;
    case "buried":
      return `埋蔵 ${abil.n}(マナゾーンにあるこのカードを開拓進化で墓地に置くとき、マナ総量に+${abil.n}して数える)`;
    case "evolveOnly":
      return `${name}は武装進化でのみ戦場に出る。`;
    case "releaseSummon":
      return `リリース召喚 ${abil.n}(${(abil.from ?? [{ type: "エンチャント" }]).map((f) => (Object.keys(f).length ? filterPhrase(f, "permanent") : "パーマネント")).join("か")})`;
    case "offering":
      return `奉納 ${abil.n}${abil.sub ? `(${abil.sub})` : ""}`;
    case "vaultCast":
      return "秘蔵 ―(このカードは秘蔵庫に入れる。あなたは秘蔵庫からこのカードを唱えてもよい。戦場を離れたら、秘蔵庫には戻らない)";
    case "oneShot":
      return `${name}は、一度秘蔵庫から出たら、秘蔵庫には戻らない(戦場やマナゾーンを離れると墓地などへ行く)。`;
    case "anchor":
      return `${name}が戦場に出たとき、次の対戦相手のターンの終了時まで、${name}は戦場を離れない。そのターンの終了時に、${name}と、その下に重なっているカードをすべて、持ち主のマナゾーンに置く。`;
    case "blockOnly":
      return abil.maxToughness !== undefined
        ? `${name}は、元のパワーが${abil.maxPower}以下で元のタフネスが${abil.maxToughness}以下のクリーチャーしかブロックできない(修整は数えない)。`
        : `${name}は、元のパワーが${abil.maxPower}以下のクリーチャーしかブロックできない(修整は数えない)。`;
    case "pioneerOppBase":
      return `対戦相手がコントロールするクリーチャーが${abil.minOpp}体以上いるなら、元のパワーとタフネスの合計が${abil.maxSum}以下の対戦相手のクリーチャー1体も、${name}の開拓進化の素材にできる。`;
    case "costDown": {
      const amount = abil.per !== undefined ? `${perText(abil.per)}{${abil.mult ?? 1}}` : `{${abil.n}}`;
      const body = `この呪文を唱えるためのコストは${amount}少なくなる。`;
      if (abil.label) return `${abil.label} ― ${body}`;
      return abil.if ? condPrefix(abil.if) + body : body;
    }
    case "voidAffinity":
      return "虚食(この呪文を唱えるためのコストは、あなたのマナゾーンにある裏向きのカード1枚につき{1}少なくなる)";
    case "affinity":
      return `共鳴(${filterPhrase(abil.filter, "permanent")})(この呪文を唱えるためのコストは、あなたがコントロールする${filterPhrase(abil.filter, "permanent")}1つにつき{1}少なくなる)`;
    case "free":
      return `零式(${condPlain(abil.if)}なら、この呪文をマナを支払わずに唱えてもよい)`;
    case "spell":
      // 払った色で効果が変わる(混成マナ)
      if (abil.modes?.every((m) => m.pay)) {
        const sym = (card.cost.match(/\{[WUBRG]\/[WUBRG]\}/) ?? [""])[0];
        return abil.modes.map((m) => `${sym}を${COLOR_JA[m.pay]}で支払ったなら、${bodyText(m, name)}`).join("");
      }
      if (abil.modes) return `次から1つを選ぶ。${abil.modes.map((m, i) => `${"①②③④"[i]}${bodyText(m, name)}`).join("")}`;
      return bodyText(abil, name);
    case "trigger": {
      // 染色 ―:チャージしたとき、マナゾーンが純色なら
      if (abil.dye) return "染色 ― " + bodyText(abil, name, null) + (abil.oncePerTurn ? "(この能力は1ターンに1回だけ誘発する)" : "");
      const pre = TRIGGER_PREFIX[abil.on](name, abil.filter);
      const shared = abil.if ? null : sharedCond(abil);
      const body = bodyText(abil, name, shared);
      const cond = abil.if ?? shared;
      const onceText = abil.oncePerTurn ? "(この能力は1ターンに1回だけ誘発する)" : "";
      if (!cond) return pre + body + onceText;
      // 「孤高 ―」のような見出しは前に、「〜なら、」は誘発の後に置く
      return (condLabel(cond) ? condPrefix(cond) + pre + body : pre + condPrefix(cond) + body) + onceText;
    }
    case "static":
      return staticText(abil, name, card);
    case "activated":
      return `${costSymbolsText(abil.cost, name)}:${bodyText(abil, name)}`;
    case "mana":
      if (abil.sacSelf) return `${name}を生け贄に捧げる:${abil.produce[0] === "any" ? "好きな色1色のマナ1つ" : abil.produce.join("か")}を加える。`;
      if (abil.produce[0] === "any") return "{T}:好きな色1色のマナ1つを加える。";
      return `{T}:${abil.produce.join("か")}を加える。`;
    case "enchant":
      return "エンチャント(クリーチャー)";
  }
  throw new Error(`文章を作れない能力: ${JSON.stringify(abil)}`);
}

export function cardText(card) {
  const lines = [];
  let kws = [];
  const flush = () => {
    if (kws.length) lines.push(kws.join("、"));
    kws = [];
  };
  for (const abil of card.abilities) {
    if (abil.a === "kw") {
      kws.push(abil.kw);
      continue;
    }
    flush();
    lines.push(abilityText(abil, card));
  }
  flush();
  return lines;
}
