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
  bounceAll: () => ({ do: "bounceAll" }),
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
  sac: () => ({ do: "sacrifice" }),
  fight: () => ({ do: "fight", tg: [0, 1] }),
  bite: () => ({ do: "bite", tg: [0, 1] }),
  lookTop: () => ({ do: "lookTop" }),
  addMana: (m) => ({ do: "addMana", mana: m }),
  tutor: (filter, to = "hand") => ({ do: "tutor", filter, to }),
  mill: (n, who = "opp") => ({ do: "mill", n, who }),
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
};
const PER_TEXT = {
  mana: "あなたのマナゾーンにあるカード1枚につき",
  creatures: "あなたがコントロールするクリーチャー1体につき",
  oppCreatures: "対戦相手がコントロールするクリーチャー1体につき",
  graveyard: "あなたの墓地にあるカード1枚につき",
  hand: "あなたの手札1枚につき",
  colorsInMana: "あなたのマナゾーンにあるカードの色1色につき",
};
function countText(n) {
  if (n.count === "perm") return `あなたがコントロールする${filterPhrase(n.filter, "permanent")}の数`;
  return COUNT_TEXT[n.count];
}
function perText(n) {
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
    return null;
  }
  return { bloom: "開花", threshold: "深淵", hellbent: "背水", highlander: "孤高", metalcraft: "機巧", ferocious: "獰猛" }[c] ?? null;
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
  if (typeof c === "object") return `あなたが${filterPhrase(c.control, "permanent")}を${c.n}${unitOf(c.control)}以上コントロールしているなら、`;
  return { burned: "燃焼したなら、", kicked: "追加払いしたなら、", fewerMana: "あなたのマナゾーンのカードが対戦相手より少ないなら、" }[c];
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
    return `あなたが${filterPhrase(c.control, "permanent")}を${c.n}${unitOf(c.control)}以上コントロールしている`;
  }
  return {
    bloom: "あなたのマナゾーンにカードが7枚以上ある",
    threshold: "あなたの墓地にカードが7枚以上ある",
    hellbent: "あなたの手札がない",
    highlander: "あなたのデッキに同じ名前のカードが2枚以上入っていない",
    metalcraft: "あなたがアーティファクトを3つ以上コントロールしている",
    ferocious: "あなたがパワー4以上のクリーチャーをコントロールしている",
    fewerMana: "あなたのマナゾーンのカードが対戦相手より少ない",
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
  return `${kws}${pt}の${COLOR_JA[e.color]}の${e.sub}・${kind}・トークンを${n}体生成する。`;
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
      return "すべてのクリーチャーを持ち主の手札に戻す。";
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
      const who = e.who === "all" ? `すべての${filterPhrase(e.filter, "creature")}` : `あなたがコントロールする${filterPhrase(e.filter, "creature")}`;
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
      return "対戦相手はクリーチャー1体を生け贄に捧げる。";
    case "fight":
      return "それらはそれぞれ、自身のパワーに等しいダメージを互いに与える。";
    case "bite":
      return "前者は後者に自身のパワーに等しいダメージを与える。";
    case "lookTop":
      return "あなたのライブラリーの一番上のカードを見る。そのカードをライブラリーの一番下に置いてもよい。";
    case "addMana":
      return `${e.mana}を加える。`;
    case "tutor": {
      const to = { hand: "公開して手札に加える", battlefield: "戦場に出す", mana: "あなたのマナゾーンに置く" }[e.to];
      return `あなたのライブラリーから${filterPhrase(e.filter, "card")}を1枚探し、${to}。その後ライブラリーを切り直す。`;
    }
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
  return parts.join(", ");
}

function abilityText(abil, card) {
  const name = card.name;
  if (abil.text) return abil.text;
  switch (abil.a) {
    case "burn":
      return `燃焼 ${abil.n}`;
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
    case "affinity":
      return `共鳴(${filterPhrase(abil.filter, "permanent")})(この呪文を唱えるためのコストは、あなたがコントロールする${filterPhrase(abil.filter, "permanent")}1つにつき{1}少なくなる)`;
    case "free":
      return `零式(${condPlain(abil.if)}なら、この呪文をマナを支払わずに唱えてもよい)`;
    case "spell":
      return bodyText(abil, name);
    case "trigger": {
      const pre = TRIGGER_PREFIX[abil.on](name, abil.filter);
      const shared = abil.if ? null : sharedCond(abil);
      const body = bodyText(abil, name, shared);
      const cond = abil.if ?? shared;
      if (!cond) return pre + body;
      // 「孤高 ―」のような見出しは前に、「〜なら、」は誘発の後に置く
      return condLabel(cond) ? condPrefix(cond) + pre + body : pre + condPrefix(cond) + body;
    }
    case "static":
      return staticText(abil, name, card);
    case "activated":
      return `${costSymbolsText(abil.cost, name)}:${bodyText(abil, name)}`;
    case "mana":
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
