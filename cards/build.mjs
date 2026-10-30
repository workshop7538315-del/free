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
  // 番号は昇順(9.5弾のような小数や、同じ番号の複数パックも可)
  if (i > 0 && p.number < PACKS[i - 1].number) throw new Error(`${p.name}:第${p.number}弾の番号が順番になっていません`);
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
  for (const a of [...c.abilities, ...c.abilities.flatMap((x) => x.modes ?? [])]) {
    const effects = [...(a.effects ?? [])];
    for (const e of effects) {
      if (e.tg !== undefined) {
        const need = Array.isArray(e.tg) ? Math.max(...e.tg) : e.tg;
        if (!a.targets || a.targets.length <= need) throw new Error(`${c.id}: 対象の指定がありません`);
      }
      if (e.then) effects.push(...e.then);
      if (e.win) effects.push(...e.win);
    }
  }
  // 秘蔵庫のカードはクリーチャーで、リリース召喚の数値を持つ
  if (c.abilities.some((a) => a.a === "releaseSummon" || a.a === "entrata" || a.a === "pioneer" || a.a === "evolveOnly" || a.a === "gem" || a.a === "curtainCall") && !isCreature) throw new Error(`${c.id}: 秘蔵庫のカードはクリーチャーにしてください`);
  if (c.abilities.some((a) => a.a === "spell" && a.modes && a.modes.length < 2)) throw new Error(`${c.id}: モード呪文は2つ以上の選択肢が要ります`);
  // 強化パックの新規カードは元のカードとの関係を持つ
  if (c.basedOn) {
    if (!["強化版", "リメイク", "サポート"].includes(c.basedOn.kind)) throw new Error(`${c.id}: basedOn の種類が不正です`);
    if (!CARDS.some((x) => x.id === c.basedOn.id)) throw new Error(`${c.id}: 元のカード ${c.basedOn.id} がありません`);
  }
  const pack = PACKS.find((p) => p.id === c.pack);
  if (pack.kind === "既存カード強化" && !c.basedOn) throw new Error(`${c.id}: 強化パックのカードには basedOn で元のカードを書いてください`);
  // 名前を参照するテーマは2つまで
  // 虚無は欠色マナでなければ唱えられない:コストに {C} を持ち、色マナ記号を持たない
  if ((c.subtype ?? "").split("・").includes("虚無") && (!c.cost.includes("{C}") || /[WUBRG]/.test(c.cost)))
    throw new Error(`${c.id}: 虚無のカードはコストに {C} を持ち、色マナ記号を持たない`);
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

function buildDeck({ colors, theme, set, generic = false, allowColorless = false, highlander = false, themeSpells = 8, themeCreatures = 16, core = {}, restNonTheme = false, extra = {}, pure = false }) {
  const fits = (c) => {
    if (c.cost.includes("{C}") && !allowColorless) return false;
    // pure:単色デッキ。マナゾーンを純色に保つため、欠色・多色・混成のカードは自動では入れない
    if (pure && (colorsOf(c.cost).length !== 1 || c.cost.includes("/"))) return false;
    if (generic && c.tags?.length) return false;
    const cs = colorsOf(c.cost);
    return cs.every((x) => colors.includes(x));
  };
  // 秘蔵庫のカードはメインには入れない
  // 第11弾の英雄と関連カード(hr)は、core で指定したデッキにだけ入れる(自動では足さない)
  const pool = out.filter((c) => fits(c) && !c.id.startsWith("hr") && !c.abilities.some((a) => ["releaseSummon", "entrata", "pioneer", "assemble", "evolveOnly", "gem", "curtainCall"].includes(a.a)));
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
  // 必ず入れるカード(デッキの軸)
  for (const [id, n] of Object.entries(core)) {
    // 検証用:NOHERO=1 なら第11弾の英雄を入れない
    if (process.env.NOHERO && id.startsWith("hr")) continue;
    const c = out.find((x) => x.id === id);
    if (!c) throw new Error(`core のカード ${id} がありません`);
    add(c, n, true);
  }
  if (theme) {
    fill((c) => themed(c) && isCre(c), themeCreatures, false);
    fill((c) => themed(c) && !isCre(c), themeSpells, false);
  }
  // restNonTheme:テーマの枠を埋めたら、残りはテーマ以外のカード(色のカード)で組む
  const rest = (f) => (c) => (!restNonTheme || !themed(c)) && f(c);
  fill(rest((c) => !isCre(c) && isInteraction(c)), 8, false);
  fill(rest(isCre), Math.max(0, 22 - Object.entries(deck).filter(([id]) => isCre(out.find((x) => x.id === id))).reduce((s, [, n]) => s + n, 0)), false);
  fill(rest((c) => !isCre(c)), 40 - total, false);
  if (restNonTheme) fill(rest(() => true), 40 - total, false);
  fill(() => true, 40 - total, true);
  if (total !== 40) throw new Error(`デッキ ${colors.join("")} が40枚になりません(${total})`);
  // 秘蔵庫(メインの40枚とは別。8枚まで・同名2枚まで)
  let ex = 0;
  for (const [id, n] of Object.entries(extra)) {
    const c = out.find((x) => x.id === id);
    if (!c || !c.abilities.some((a) => ["releaseSummon", "entrata", "pioneer", "assemble", "evolveOnly", "gem", "curtainCall"].includes(a.a))) throw new Error(`秘蔵庫のカード ${id} がありません`);
    if (n > 2) throw new Error(`秘蔵庫の ${id} は2枚まで`);
    deck[id] = n;
    ex += n;
  }
  if (ex > 8) throw new Error("秘蔵庫は8枚まで");
  return deck;
}

const tag = (t) => (c) => c.tags?.includes(t);
const sub = (s) => (c) => (c.subtype ?? "").split("・").includes(s);

// 喝采デッキのテーマ:そのカテゴリーの喝采カードと、元になったアーキタイプのカード
const applauseTheme = (cat, base) => (c) => c.tags?.includes(base) || (c.tags?.includes("喝采") && JSON.stringify(c.abilities).includes(cat));
const DECKS = [
  // 2色の汎用デッキ(最初のセットのカード中心)
  { id: "wu", name: "白青:天空の審問", colors: ["W", "U"], generic: true, core: { hr01: 2, hr02: 2, hr03: 2 } },
  { id: "ub", name: "青黒:記憶の簒奪", colors: ["U", "B"], generic: true, core: { hr07: 2, hr08: 2, hr09: 2 } },
  { id: "wb", name: "白黒:命の天秤", colors: ["W", "B"], generic: true, core: { hr13: 2, hr14: 2, hr15: 2 } },
  { id: "bg", name: "黒緑:輪廻の園", colors: ["B", "G"], generic: true, core: { hr04: 2, hr05: 2, hr06: 2 } },
  { id: "gu", name: "緑青:大海と森", colors: ["G", "U"], generic: true, core: { hr10: 1, hr11: 1, hr12: 1 } },
  // テーマデッキ
  { id: "t-human", set: "hum", name: "人間:民衆の蜂起(白赤)", colors: ["W", "R"], theme: tag("人間"), archetype: "人間", core: { hr16: 2, hr17: 2, hr18: 2 }, extra: { cm09: 2, cm10: 2, cm11: 2, cm12: 2 } },
  { id: "t-enchant", set: "enc", name: "エンチャント:星座の祝福(緑白)", colors: ["G", "W"], theme: tag("エンチャント"), archetype: "エンチャント", core: { hr19: 2, hr20: 2, hr21: 2 } },
  { id: "t-three", set: "thr", name: "マナ総量3:三刻の盟約(白青)", colors: ["W", "U"], allowColorless: true, theme: (c) => tag("マナ総量3")(c) || mv(c.cost) === 3, archetype: "マナ総量3", core: { hr22: 2, hr23: 2, hr24: 2 } },
  { id: "t-highlander", set: "hig", name: "孤高:三色の独唱(黒赤緑)", colors: ["B", "R", "G"], highlander: true, theme: tag("孤高"), archetype: "孤高", core: { hr25: 1, hr26: 1, hr27: 1 } },
  { id: "t-hoshiyomi", set: "hsy", name: "星詠み:天球の導き(白青)", colors: ["W", "U"], theme: tag("星詠み"), archetype: "星詠み", core: { hr28: 2, hr29: 2, hr30: 2 } },
  { id: "t-tekki", set: "tek", name: "鉄機:鋼の軍団(赤+欠色)", colors: ["R"], allowColorless: true, theme: tag("鉄機"), archetype: "鉄機", core: { hr31: 2, hr32: 2, hr33: 2 }, extra: { eld08: 2, eld09: 2, eld12: 2, eld13: 2 } },
  { id: "t-graveyard", set: "grv", name: "墓地:深淵の書庫(青黒)", colors: ["U", "B"], theme: tag("墓地"), archetype: "墓地", core: { hr34: 1, hr35: 1, hr36: 1 } },
  { id: "t-sacrifice", set: "ari", name: "生け贄:血の宴(黒赤)", colors: ["B", "R"], theme: tag("生け贄"), archetype: "生け贄", core: { hr37: 1, hr38: 1, hr39: 1 }, extra: { cm05: 2, cm06: 2, cm07: 2, cm08: 2 } },
  { id: "t-life", set: "lif", name: "ライフ:命の循環(白黒)", colors: ["W", "B"], theme: tag("ライフ"), archetype: "ライフ", core: { hr40: 2, hr41: 2, hr42: 2 } },
  { id: "t-counters", set: "ctr", name: "カウンター:不屈の大地(黒緑)", colors: ["B", "G"], theme: tag("カウンター"), archetype: "カウンター", core: { hr43: 1, hr44: 1, hr45: 1 } },
  { id: "t-spells", set: "spl", name: "呪文:嵐の詠唱(青赤)", colors: ["U", "R"], theme: tag("呪文"), archetype: "呪文", core: { hr46: 2, hr47: 2, hr48: 2 }, extra: { cm01: 2, cm02: 2, cm03: 2, cm04: 2 } },
  { id: "t-equip", set: "eqp", themeSpells: 11, name: "装備:武具の行進(赤白)", colors: ["R", "W"], theme: tag("装備"), archetype: "装備", core: { hr49: 2, hr50: 2, hr51: 2 }, extra: { cm09: 2, cm10: 2, cm11: 2, cm12: 2 } },
  { id: "t-heartbeat", set: "hrt", name: "鼓動:大地の脈動(赤緑)", colors: ["R", "G"], theme: tag("鼓動"), archetype: "鼓動", core: { hr52: 2, hr53: 2, hr54: 2 }, extra: { eld01: 2, eld02: 2, eld03: 2, eld05: 2 } },
  { id: "t-armed-r", set: "arm", name: "マナ武装:赤単の烈火", colors: ["R"], theme: tag("マナ武装"), archetype: "マナ武装", core: { hr55: 2, hr56: 2, hr57: 2, hr87: 1, hr88: 2 } },
  // 第11.5弾で作り直し:マナ総量11以上の巨体を、原色と黄金郷のランプ・開拓進化で出す
  { id: "t-armed-g", name: "原色:緑単の巨獣", colors: ["G"], pure: true, theme: tag("原色"), archetype: "原色",
    core: { pc31: 2, pc32: 2, pc33: 3, pc34: 2, pc35: 2, pc36: 1, pc37: 3, pc38: 3, pc39: 2, pc40: 1, pc41: 4, pc42: 2, pc43: 3, pc44: 1, pc45: 1, eld14: 3, eld15: 3, hr58: 1, hr60: 1 },
    extra: { eld01: 2, eld02: 2, eld03: 2, eld05: 2 } },
  // 第11.5弾:白単(回復)と青単(ドロー)
  { id: "t-mono-w", name: "原色:白単の癒しの聖堂", colors: ["W"], pure: true, theme: tag("原色"), archetype: "原色",
    core: { pc01: 2, pc02: 2, pc03: 3, pc04: 4, pc06: 2, pc07: 2, pc08: 4, pc09: 2, pc10: 3, pc12: 2, pc13: 3, pc15: 2, lif01: 3, lif05: 2, lif13: 2 } },
  { id: "t-mono-u", name: "原色:青単の知識の塔", colors: ["U"], pure: true, theme: tag("原色"), archetype: "原色",
    core: { pc16: 2, pc17: 2, pc18: 2, pc19: 3, pc20: 3, pc21: 3, pc22: 2, pc23: 3, pc24: 3, pc25: 2, pc26: 3, pc27: 2, pc28: 2, pc29: 2, u021: 2, u012: 2 } },
  { id: "t-goblin", name: "部族:ゴブリンの大群(赤単)", colors: ["R"], theme: (c) => sub("ゴブリン")(c), archetype: "部族", core: { hr61: 2, hr62: 2, hr63: 2, hr88: 2 }, extra: { cm09: 2, cm10: 2, cm11: 2, cm12: 2 } },
  { id: "t-elf", name: "部族:エルフの森(緑単)", colors: ["G"], theme: (c) => sub("エルフ")(c), archetype: "部族", core: { hr64: 2, hr65: 2, hr66: 2, hr88: 2 }, extra: { eld01: 2, eld02: 2, eld03: 2, eld05: 2 } },
  { id: "t-zombie", name: "部族:ゾンビの行進(黒単)", colors: ["B"], theme: (c) => sub("ゾンビ")(c), archetype: "部族", core: { hr67: 2, hr68: 2, hr69: 2, hr87: 1, hr88: 2 } },
  // 第4弾
  { id: "t-crest", set: "aw", name: "紋章:大地の目覚め(緑白)", colors: ["G", "W"], allowColorless: true, theme: tag("紋章"), archetype: "紋章", core: { hr70: 2, hr71: 2, hr72: 2 }, extra: { cm09: 2, cm10: 2, cm11: 2, cm12: 2 } },
  { id: "t-manifest", set: "aw", name: "紋章:顕現の潮(緑青)", colors: ["G", "U"], allowColorless: true, theme: tag("紋章"), archetype: "紋章", core: { hr73: 1, hr74: 1, hr75: 1, bm35: 3, bm32: 2, bm60: 3, bm40: 2 }, extra: { cm01: 2, cm02: 2, cm03: 2, cm04: 2 } },
  { id: "t-duel", set: "ct", name: "決闘:剣と薔薇の作法(赤白)", colors: ["R", "W"], allowColorless: true, theme: tag("決闘"), archetype: "決闘", core: { hr76: 2, hr77: 2, hr78: 2, hr85: 2, hr86: 2 }, extra: { eld06: 2, eld07: 2, eld08: 2, eld09: 2 } },
  { id: "t-intrigue", set: "ct", name: "陰謀:影の宮廷(青黒)", colors: ["U", "B"], theme: tag("陰謀"), archetype: "陰謀", core: { hr79: 2, hr80: 2, hr81: 2, hr85: 2, hr86: 2 } },
  { id: "t-gate-beast", set: "hz", name: "秘蔵:神獣の森(緑白)", colors: ["G", "W"], theme: tag("秘蔵"), archetype: "秘蔵", core: { hz18: 4, hz21: 4, hz19: 3, hz20: 3, hz24: 3, hz42: 3, hz55: 2, hz23: 2 }, extra: { hz01: 2, hz02: 2, hz03: 2, hz04: 2 } },
  { id: "t-gate-spirit", set: "hz", name: "秘蔵:灯る祖霊(白黒)", colors: ["W", "B"], theme: tag("秘蔵"), archetype: "秘蔵", core: { hz25: 4, hz28: 4, hz26: 3, hz27: 3, hz31: 3, hz53: 2, hz75: 2, hz30: 2 }, extra: { hz05: 2, hz06: 2, hz07: 2, hz08: 2 } },
  { id: "t-gate-machine", set: "hz", name: "秘蔵:目覚める機神(青赤)", colors: ["U", "R"], theme: tag("秘蔵"), archetype: "秘蔵", core: { hz32: 4, hz35: 4, hz34: 3, hz33: 3, hz38: 3, hz47: 3, hz76: 2, hz61: 2 }, extra: { hz09: 2, hz10: 2, hz11: 2, hz12: 2 } },
  { id: "t-cm-madness", set: "cm", name: "喝采:狂気の道化芝居(青赤)", colors: ["U", "R"], theme: applauseTheme("狂気", "呪文"), archetype: "喝采", core: { cm46: 2, cm47: 2, cm14: 4, cm15: 4, cm17: 4, cm16: 3, cm43: 3, cm18: 3, cm19: 3, cm20: 2, cm40: 2, cm35: 2 }, extra: { cm01: 2, cm02: 2, cm04: 2, cm52: 2 } },
  { id: "t-cm-tragedy", set: "cm", name: "喝采:血の悲劇(黒赤)", colors: ["B", "R"], theme: applauseTheme("悲劇", "生け贄"), archetype: "喝采", core: { cm48: 2, cm49: 2, cm27: 4, cm29: 3, cm37: 3, cm25: 3, cm41: 2, cm24: 2, cm38: 2 }, extra: { cm05: 2, cm06: 2, cm08: 2, cm53: 2 } },
  { id: "t-cm-comedy", set: "cm", name: "喝采:喜劇の一座(赤白)", colors: ["R", "W"], theme: applauseTheme("喜劇", "人間"), archetype: "喝采", core: { cm50: 2, cm51: 2, cm45: 4, cm31: 4, cm19: 2, cm30: 3, cm32: 3, cm34: 3, cm33: 2, cm42: 2 }, extra: { cm09: 2, cm10: 2, cm12: 2, cm54: 2 } },
  { id: "t-eld-pioneer", set: "eld", name: "黄金郷:開拓者の進軍(緑単)", colors: ["G"], theme: tag("黄金郷"), archetype: "黄金郷", core: { eld15: 4, eld50: 3, eld46: 3, eld48: 3, eld53: 3, eld18: 3, eld44: 3, eld47: 2, eld54: 2, eld49: 2, eld40: 2, eld19: 2 }, extra: { eld01: 2, eld02: 2, eld03: 2, eld05: 2 } },
  { id: "t-eld-invent", set: "eld", name: "黄金郷:発明家の工房(赤白)", colors: ["R", "W"], theme: tag("黄金郷"), archetype: "黄金郷", core: { eld24: 4, eld25: 3, eld29: 3, eld33: 3, eld34: 3, eld35: 2, eld31: 2, eld28: 2, eld26: 2 }, extra: { eld06: 2, eld07: 2, eld08: 2, eld09: 2 } },
  { id: "t-bm-heist", set: "bm", name: "闇市:鉄爪団の強盗(赤緑)", colors: ["R", "G"], theme: tag("闇市"), archetype: "闇市", core: { bm12: 4, bm17: 3, bm22: 3, bm10: 3, bm11: 3, bm13: 3, bm16: 2, bm20: 2, bm21: 2, bm23: 2, bm66: 3 }, extra: { bm05: 2, bm06: 2, bm01: 2, bm04: 2 } },
  { id: "t-bm-dream", set: "bm", name: "闇市:夢花会の密売(青赤)", colors: ["U", "R"], theme: tag("闇市"), archetype: "闇市", core: { bm50: 3, bm53: 3, bm54: 3, bm56: 3, bm57: 2, bm58: 2, bm30: 3, bm31: 3, bm34: 2, bm36: 2, bm45: 3, bm60: 2, bm69: 2 }, extra: { cm01: 2, cm02: 2, cm03: 2, cm04: 2 } },
  { id: "t-void", legacy: true, set: "vd", name: "虚無:色喰らいの深淵(欠色)", colors: [], allowColorless: true, theme: tag("虚無"), archetype: "虚無" },
  { id: "t-void-swarm", legacy: true, set: "vd", name: "虚無:群れなす虚無(欠色)", colors: [], allowColorless: true, theme: tag("虚無"), archetype: "虚無", core: { vd08: 4, vd09: 4, vd36: 4, vd13: 4, vd18: 3, vd33: 3, vd37: 3, vd38: 2, vd22: 2 } },
  { id: "t-void-titan", set: "vd", name: "虚無:始祖の目覚め(欠色)", colors: [], allowColorless: true, theme: tag("虚無"), archetype: "虚無", core: { hr82: 2, hr83: 2, hr84: 2, vd06: 4, adv27: 3, vd10: 4, vd28: 3, vd14: 2, vd18: 3, vd01: 3, vd04: 2, vd41: 2, vd42: 2, vd43: 1 } },
];

const decks = DECKS.map(({ theme, set, generic, allowColorless, highlander, themeSpells, themeCreatures, core, restNonTheme, extra, pure, ...d }) => ({
  ...d,
  cards: buildDeck({ colors: d.colors, theme, set, generic, allowColorless, highlander, themeSpells, themeCreatures, core, restNonTheme, extra, pure }),
}));
writeFileSync(join(here, process.env.NOHERO ? "decks-nohero.json" : "decks.json"), JSON.stringify(decks, null, 2) + "\n");

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
