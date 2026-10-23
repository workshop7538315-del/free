// カードの定義から cards/cards.json と cards/decks.json を作るスクリプト。
//   node cards/build.mjs
// カードの一覧は sets/ 以下、書き方の補助と文章生成は lib.mjs にある。
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { cardText } from "./lib.mjs";
import { PACKS } from "./packs.mjs";

const here = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------- パックとカードの所属
/** カードID → 収録パック(最初に収録したパックが先頭) */
const packsOf = new Map();
const CARDS = [];
for (const pack of PACKS) {
  for (const c of pack.sets.flat()) {
    if (packsOf.has(c.id)) throw new Error(`${c.id} が2つのパックに新規収録されています(再録は reprints に書く)`);
    packsOf.set(c.id, [pack.id]);
    CARDS.push({ ...c, pack: pack.id });
  }
}
for (const pack of PACKS) {
  for (const id of pack.reprints ?? []) {
    const list = packsOf.get(id);
    if (!list) throw new Error(`${pack.name}:再録するカード ${id} がありません`);
    if (list[0] === pack.id) throw new Error(`${pack.name}:${id} は同じパックの新規カードです`);
    if (!list.includes(pack.id)) list.push(pack.id);
  }
}
const PACK_IDS = new Set(PACKS.map((p) => p.id));
if (PACK_IDS.size !== PACKS.length) throw new Error("パックIDが重複しています");
PACKS.forEach((p, i) => {
  if (p.number !== i + 1) throw new Error(`${p.name}:第${p.number}弾の番号が順番になっていません`);
  if (!["新規展開", "既存カード強化"].includes(p.kind)) throw new Error(`${p.name}:種類は「新規展開」か「既存カード強化」`);
  if (!Array.isArray(p.words) || p.words.length !== 3) throw new Error(`${p.name}:テーマの単語は3つ`);
});

// ---------------------------------------------------------------- 共通の計算
const COLORS = ["W", "U", "B", "R", "G"];
function colorsOf(cost) {
  const set = new Set();
  for (const m of cost.matchAll(/\{([^}]+)\}/g)) for (const ch of m[1].split("/")) if (COLORS.includes(ch)) set.add(ch);
  return COLORS.filter((c) => set.has(c));
}
function mv(cost) {
  let n = 0;
  for (const m of cost.matchAll(/\{([^}]+)\}/g)) {
    const s = m[1];
    if (/^\d+$/.test(s)) n += Number(s);
    else if (s === "X") n += 0;
    else if (s.startsWith("2/")) n += 2;
    else n += 1;
  }
  return n;
}

// ---------------------------------------------------------------- 検証
const ids = new Set();
const names = new Set();
for (const c of CARDS) {
  if (ids.has(c.id)) throw new Error(`IDが重複しています: ${c.id}`);
  ids.add(c.id);
  if (names.has(c.name)) throw new Error(`カード名が重複しています: ${c.name}(${c.id})`);
  names.add(c.name);
  for (const m of c.cost.matchAll(/\{([^}]+)\}/g)) {
    if (!/^(\d+|X|C|[WUBRG]|[WUBRG]\/[WUBRG]|2\/[WUBRG])$/.test(m[1])) throw new Error(`${c.id}: 不明なマナ記号 {${m[1]}}`);
  }
  const isCreature = c.type.includes("クリーチャー");
  if (isCreature !== (c.power !== undefined)) throw new Error(`${c.id}: クリーチャーとP/Tが一致しません`);
  const isSpell = c.type === "インスタント" || c.type === "ソーサリー";
  if (isSpell && !c.abilities.some((a) => a.a === "spell")) throw new Error(`${c.id}: 呪文の効果がありません`);
  for (const a of c.abilities) {
    const effects = [...(a.effects ?? [])];
    for (const e of effects) {
      if (e.tg !== undefined) {
        const need = Array.isArray(e.tg) ? Math.max(...e.tg) : e.tg;
        if (!a.targets || a.targets.length <= need) throw new Error(`${c.id}: 対象の指定がありません`);
      }
      if (e.then) effects.push(...e.then);
    }
  }
  // 強化パックの新規カードは元のカードとの関係を持つ
  if (c.basedOn) {
    if (!["強化版", "リメイク", "サポート"].includes(c.basedOn.kind)) throw new Error(`${c.id}: basedOn の種類が不正です`);
    if (!CARDS.some((x) => x.id === c.basedOn.id)) throw new Error(`${c.id}: 元のカード ${c.basedOn.id} がありません`);
  }
  const pack = PACKS.find((p) => p.id === c.pack);
  if (pack.kind === "既存カード強化" && !c.basedOn) throw new Error(`${c.id}: 強化パックのカードには basedOn で元のカードを書いてください`);
  // 名前を参照するテーマは2つまで
  if (/星詠み/.test(c.name) && !c.tags?.includes("星詠み")) throw new Error(`${c.id}: 「星詠み」のカードは星詠みのセットに入れてください`);
  if (/鉄機/.test(c.name) && !c.tags?.includes("鉄機")) throw new Error(`${c.id}: 「鉄機」のカードは鉄機のセットに入れてください`);
}

// ---------------------------------------------------------------- 出力
/** セットのタグに加えて、種族やタイプから分かるタグも付ける */
function autoTags(c) {
  const tags = new Set(c.tags ?? []);
  if ((c.subtype ?? "").split("・").includes("人間")) tags.add("人間");
  if (c.type.includes("エンチャント")) tags.add("エンチャント");
  if (c.subtype === "装備品") tags.add("装備");
  if (c.abilities.some((a) => a.a === "flashback")) tags.add("墓地");
  if (c.abilities.some((a) => a.a === "kw" && a.kw === "不屈")) tags.add("カウンター");
  return [...tags];
}

const out = CARDS.map((c) => {
  const { abilities, tags, pack, basedOn, ...rest } = c;
  const allTags = autoTags(c);
  return {
    ...rest,
    text: cardText(c),
    ...(allTags.length ? { tags: allTags } : {}),
    pack,
    packs: packsOf.get(c.id),
    ...(basedOn ? { basedOn } : {}),
    abilities,
  };
});
writeFileSync(join(here, "cards.json"), JSON.stringify(out, null, 2) + "\n");

// パックの一覧(アプリの絞り込みと表示に使う)
const packsJson = PACKS.map(({ sets, reprints, ...p }) => {
  const newCards = out.filter((c) => c.pack === p.id).map((c) => c.id);
  return { ...p, newCards: newCards.length, reprints: reprints ?? [], total: newCards.length + (reprints?.length ?? 0) };
});
writeFileSync(join(here, "packs.json"), JSON.stringify(packsJson, null, 2) + "\n");

// ---------------------------------------------------------------- スターターデッキ
const INTERACTION = new Set(["damage", "destroy", "exile", "bounce", "tuck", "counter", "sacrifice", "fight", "bite", "destroyAll", "damageAll", "tap"]);
function isInteraction(c) {
  for (const a of c.abilities) {
    for (const e of a.effects ?? []) {
      if (INTERACTION.has(e.do) && e.to !== "opp") return true;
      if (e.do === "pump" && typeof e.p === "number" && e.p < 0) return true;
    }
    if (a.a === "static" && (a.st.s === "pacify" || (a.st.s === "auraBuff" && a.st.p + a.st.t < 0))) return true;
  }
  return false;
}
const isCre = (c) => c.type.includes("クリーチャー");
const copiesFor = (c, themed, highlander) =>
  highlander ? 1 : themed ? { コモン: 4, アンコモン: 4, レア: 3, 神話レア: 2 }[c.rarity] : { コモン: 4, アンコモン: 3, レア: 2, 神話レア: 1 }[c.rarity];

/**
 * デッキを自動で組む。
 * colors:使う色 / theme:テーマに合うカードか / generic:テーマのない汎用デッキか
 * allowColorless:{C}を要求するカードを使うか / highlander:同名1枚まで
 */
/** 自分のクリーチャーも巻き込む全体除去 */
function isSymmetricWipe(c) {
  return c.abilities.some((a) =>
    (a.effects ?? []).some(
      (e) =>
        e.do === "destroyAll" ||
        e.do === "bounceAll" ||
        (e.do === "damageAll" && e.who !== "opp") ||
        (e.do === "pumpAll" && e.who === "all" && e.t < 0),
    ),
  );
}

function buildDeck({ colors, theme, set, generic = false, allowColorless = false, highlander = false, themeSpells = 8 }) {
  const fits = (c) => {
    if (c.cost.includes("{C}") && !allowColorless) return false;
    if (generic && c.tags?.length) return false;
    const cs = colorsOf(c.cost);
    return cs.every((x) => colors.includes(x));
  };
  const pool = out.filter(fits);
  const inSet = (c) => !!set && c.id.startsWith(set);
  const themed = (c) => inSet(c) || (!!theme && theme(c));
  const score = (c) => {
    const cs = colorsOf(c.cost);
    const rarity = { コモン: 1, アンコモン: 2, レア: 3, 神話レア: 3.5 }[c.rarity];
    // テーマのカードはレアリティより「テーマに合うか」を優先する
    // 既存カード強化パックのカード(basedOn)は、テーマに合えば元のセットのカードより優先する
    if (themed(c)) return (c.basedOn ? 15 : inSet(c) ? 14 : 10) + rarity * 0.5 + (isInteraction(c) ? 1 : 0) + (mv(c.cost) <= 3 ? 0.5 : 0);
    let s = rarity;
    if (cs.length >= 2) s += 1.5;
    if (cs.length === 0) s -= 1.5;
    if (isInteraction(c)) s += 2;
    if (c.abilities.some((a) => a.a === "kw" && a.kw === "防衛")) s -= 2;
    // テーマデッキ(クリーチャーで戦う)には全体除去を入れない
    if ((theme || set) && isSymmetricWipe(c)) s -= 8;
    return s;
  };
  const sorted = [...pool].sort((a, b) => score(b) - score(a) || a.id.localeCompare(b.id));
  const deck = {};
  const curve = {};
  let total = 0;
  const curveCap = { 0: 3, 1: 8, 2: 10, 3: 10, 4: 7, 5: 5, 6: 3, 7: 2, 8: 2 };
  const add = (c, limit, relaxCurve) => {
    const v = Math.min(8, mv(c.cost));
    let added = 0;
    const max = copiesFor(c, themed(c), highlander);
    while ((deck[c.id] ?? 0) < max && total < 40 && added < limit && (relaxCurve || (curve[v] ?? 0) < curveCap[v])) {
      deck[c.id] = (deck[c.id] ?? 0) + 1;
      curve[v] = (curve[v] ?? 0) + 1;
      total++;
      added++;
    }
    return added;
  };
  const fill = (filter, target, relaxCurve) => {
    let got = 0;
    for (const c of sorted) {
      if (got >= target || total >= 40) break;
      if (filter(c)) got += add(c, target - got, relaxCurve);
    }
    return got;
  };
  if (theme) {
    fill((c) => themed(c) && isCre(c), 16, false);
    fill((c) => themed(c) && !isCre(c), themeSpells, false);
  }
  fill((c) => !isCre(c) && isInteraction(c), 8, false);
  fill(isCre, Math.max(0, 22 - Object.entries(deck).filter(([id]) => isCre(out.find((x) => x.id === id))).reduce((s, [, n]) => s + n, 0)), false);
  fill((c) => !isCre(c), 40 - total, false);
  fill(() => true, 40 - total, true);
  if (total !== 40) throw new Error(`デッキ ${colors.join("")} が40枚になりません(${total})`);
  return deck;
}

const tag = (t) => (c) => c.tags?.includes(t);
const sub = (s) => (c) => (c.subtype ?? "").split("・").includes(s);

const DECKS = [
  // 2色の汎用デッキ(最初のセットのカード中心)
  { id: "wu", name: "白青:空の守り", colors: ["W", "U"], generic: true },
  { id: "ub", name: "青黒:記憶の簒奪", colors: ["U", "B"], generic: true },
  { id: "br", name: "黒赤:灰の代償", colors: ["B", "R"], generic: true },
  { id: "rg", name: "赤緑:大地の猛攻", colors: ["R", "G"], generic: true },
  { id: "gw", name: "緑白:群れの行進", colors: ["G", "W"], generic: true },
  { id: "wb", name: "白黒:命の天秤", colors: ["W", "B"], generic: true },
  { id: "ur", name: "青赤:嵐の術士", colors: ["U", "R"], generic: true },
  { id: "bg", name: "黒緑:輪廻の園", colors: ["B", "G"], generic: true },
  { id: "rw", name: "赤白:先陣の旗", colors: ["R", "W"], generic: true },
  { id: "gu", name: "緑青:満ちる大海", colors: ["G", "U"], generic: true },
  // テーマデッキ
  { id: "t-human", set: "hum", name: "人間:民衆の蜂起(白赤)", colors: ["W", "R"], theme: tag("人間"), archetype: "人間" },
  { id: "t-enchant", set: "enc", name: "エンチャント:星座の祝福(緑白)", colors: ["G", "W"], theme: tag("エンチャント"), archetype: "エンチャント" },
  { id: "t-three", set: "thr", name: "マナ総量3:三刻の盟約(白青)", colors: ["W", "U"], allowColorless: true, theme: (c) => tag("マナ総量3")(c) || mv(c.cost) === 3, archetype: "マナ総量3" },
  { id: "t-highlander", set: "hig", name: "孤高:三色の独唱(黒赤緑)", colors: ["B", "R", "G"], highlander: true, theme: tag("孤高"), archetype: "孤高" },
  { id: "t-hoshiyomi", set: "hsy", name: "星詠み:天球の導き(白青)", colors: ["W", "U"], theme: tag("星詠み"), archetype: "星詠み" },
  { id: "t-tekki", set: "tek", name: "鉄機:鋼の軍団(赤+欠色)", colors: ["R"], allowColorless: true, theme: tag("鉄機"), archetype: "鉄機" },
  { id: "t-graveyard", set: "grv", name: "墓地:深淵の書庫(青黒)", colors: ["U", "B"], theme: tag("墓地"), archetype: "墓地" },
  { id: "t-sacrifice", set: "ari", name: "生け贄:血の宴(黒赤)", colors: ["B", "R"], theme: tag("生け贄"), archetype: "生け贄" },
  { id: "t-life", set: "lif", name: "ライフ:命の循環(白黒)", colors: ["W", "B"], theme: tag("ライフ"), archetype: "ライフ" },
  { id: "t-counters", set: "ctr", name: "カウンター:不屈の大地(黒緑)", colors: ["B", "G"], theme: tag("カウンター"), archetype: "カウンター" },
  { id: "t-spells", set: "spl", name: "呪文:嵐の詠唱(青赤)", colors: ["U", "R"], theme: tag("呪文"), archetype: "呪文" },
  { id: "t-equip", set: "eqp", themeSpells: 11, name: "装備:武具の行進(赤白)", colors: ["R", "W"], theme: tag("装備"), archetype: "装備" },
  { id: "t-heartbeat", set: "hrt", name: "鼓動:大地の脈動(赤緑)", colors: ["R", "G"], theme: tag("鼓動"), archetype: "鼓動" },
  { id: "t-armed-r", set: "arm", name: "マナ武装:赤単の烈火", colors: ["R"], theme: tag("マナ武装"), archetype: "マナ武装" },
  { id: "t-armed-g", set: "arm", name: "マナ武装:緑単の巨獣", colors: ["G"], theme: tag("マナ武装"), archetype: "マナ武装" },
  { id: "t-goblin", name: "部族:ゴブリンの大群(赤単)", colors: ["R"], theme: (c) => sub("ゴブリン")(c), archetype: "部族" },
  { id: "t-elf", name: "部族:エルフの森(緑単)", colors: ["G"], theme: (c) => sub("エルフ")(c), archetype: "部族" },
  { id: "t-zombie", name: "部族:ゾンビの行進(黒単)", colors: ["B"], theme: (c) => sub("ゾンビ")(c), archetype: "部族" },
  // 第4弾
  { id: "t-crest", set: "aw", name: "紋章:大地の目覚め(緑白)", colors: ["G", "W"], allowColorless: true, theme: tag("紋章"), archetype: "紋章" },
  { id: "t-manifest", set: "aw", name: "紋章:顕現の潮(緑青)", colors: ["G", "U"], allowColorless: true, theme: tag("紋章"), archetype: "紋章" },
];

const decks = DECKS.map(({ theme, set, generic, allowColorless, highlander, themeSpells, ...d }) => ({
  ...d,
  cards: buildDeck({ colors: d.colors, theme, set, generic, allowColorless, highlander, themeSpells }),
}));
writeFileSync(join(here, "decks.json"), JSON.stringify(decks, null, 2) + "\n");

// ---------------------------------------------------------------- 集計
const counts = {};
for (const c of out) {
  const cs = colorsOf(c.cost);
  const k = cs.length === 0 ? "欠色" : cs.length === 1 ? cs[0] : "多色";
  counts[k] = (counts[k] ?? 0) + 1;
}
const tagCounts = {};
for (const c of out) for (const t of c.tags ?? []) tagCounts[t] = (tagCounts[t] ?? 0) + 1;
console.log(`カード ${out.length}種類`, counts);
console.log("アーキタイプ", tagCounts);
console.log(`スターターデッキ ${decks.length}個`);
for (const p of packsJson) console.log(`第${p.number}弾「${p.name}」(${p.kind}) 新規${p.newCards} 再録${p.reprints.length}`);
