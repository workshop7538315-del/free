// カードの定義から cards/cards.json と cards/decks.json を作るスクリプト。
//   node cards/build.mjs
// 効果は abilities(app/src/game/schema.ts の形式)で書き、カードの文章はここで自動生成する。
// 文章を自分で書きたい能力には text を付ける。
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------- 書き方の補助
const R = { C: "コモン", U: "アンコモン", R: "レア", M: "神話レア" };

/** クリーチャー */
const cr = (id, name, cost, sub, p, t, rar, abilities = [], extra = {}) => ({
  id, name, cost, type: "クリーチャー", subtype: sub, power: p, toughness: t, rarity: R[rar],
  abilities: abilities.flat(), ...extra,
});
/** アーティファクト・クリーチャー */
const acr = (...args) => ({ ...cr(...args), type: "アーティファクト・クリーチャー" });
/** インスタント・ソーサリー */
const ins = (id, name, cost, rar, abilities, extra = {}) => ({ id, name, cost, type: "インスタント", rarity: R[rar], abilities: [abilities].flat(), ...extra });
const sor = (id, name, cost, rar, abilities, extra = {}) => ({ id, name, cost, type: "ソーサリー", rarity: R[rar], abilities: [abilities].flat(), ...extra });
const ench = (id, name, cost, rar, abilities, extra = {}) => ({ id, name, cost, type: "エンチャント", rarity: R[rar], abilities: [abilities].flat(), ...extra });
const art = (id, name, cost, rar, abilities, extra = {}) => ({ id, name, cost, type: "アーティファクト", rarity: R[rar], abilities: [abilities].flat(), ...extra });

const kw = (...k) => k.map((x) => ({ a: "kw", kw: x }));
const burn = (n) => ({ a: "burn", n });
const release = (cost) => ({ a: "release", cost });
const spell = (effects, targets, text) => ({ a: "spell", effects: [effects].flat(), ...(targets ? { targets: [targets].flat() } : {}), ...(text ? { text } : {}) });
const trig = (on) => (effects, targets, opts = {}) => ({ a: "trigger", on, effects: [effects].flat(), ...(targets ? { targets: [targets].flat() } : {}), ...opts });
const etb = trig("etb");
const dies = trig("dies");
const attacks = trig("attacks");
const charge = trig("charge");
const upkeep = trig("upkeep");
const endStep = trig("endStep");
const castSpell = trig("castSpell");
const allyDies = trig("allyDies");
const stat = (st, opts = {}) => ({ a: "static", st, ...opts });
const act = (cost, effects, targets, text) => ({ a: "activated", cost, effects: [effects].flat(), ...(targets ? { targets: [targets].flat() } : {}), ...(text ? { text } : {}) });
const mana = (...produce) => ({ a: "mana", produce });

// 対象
const T = {
  cre: { t: "creature" },
  opp: { t: "creature", who: "opp" },
  you: { t: "creature", who: "you" },
  any: { t: "any" },
  spell: { t: "spell" },
  gyCre: { t: "graveyard", cardType: "クリーチャー" },
  gy: { t: "graveyard" },
};

// 効果
const E = {
  dmg: (n, tg = 0) => ({ do: "damage", n, tg }),
  dmgOpp: (n) => ({ do: "damage", n, to: "opp" }),
  dmgAll: (n, players = false) => ({ do: "damageAll", n, ...(players ? { players } : {}) }),
  destroy: (tg = 0) => ({ do: "destroy", tg }),
  destroyAll: (maxPower) => ({ do: "destroyAll", ...(maxPower !== undefined ? { maxPower } : {}) }),
  exile: (tg = 0) => ({ do: "exile", tg }),
  bounce: (tg = 0) => ({ do: "bounce", tg }),
  bounceAll: () => ({ do: "bounceAll" }),
  tuck: (tg = 0) => ({ do: "tuck", tg }),
  tap: (tg = 0, freeze = false) => ({ do: "tap", tg, ...(freeze ? { freeze } : {}) }),
  tapAll: () => ({ do: "tapAll", who: "opp" }),
  pump: (p, t, kw, tg = 0) => ({ do: "pump", tg, p, t, ...(kw ? { kw } : {}) }),
  pumpSelf: (p, t, kw) => ({ do: "pump", self: true, p, t, ...(kw ? { kw } : {}) }),
  pumpAll: (p, t, kw, who = "you") => ({ do: "pumpAll", who, p, t, ...(kw ? { kw } : {}) }),
  buffSelf: (p, t, kw) => ({ do: "buffSelf", p, t, ...(kw ? { kw } : {}) }),
  counters: (n, tg = 0) => ({ do: "counters", tg, n }),
  countersSelf: (n) => ({ do: "counters", self: true, n }),
  countersAll: (n) => ({ do: "countersAll", n }),
  draw: (n) => ({ do: "draw", n }),
  discard: (n, who = "you") => ({ do: "discard", n, who }),
  gain: (n) => ({ do: "gainLife", n }),
  lose: (n, who = "opp") => ({ do: "loseLife", n, who }),
  token: (n, p, t, color, sub, kw) => ({ do: "token", n, p, t, color, sub, ...(kw ? { kw } : {}) }),
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
};
const iff = (cond, e) => ({ ...e, if: cond });
const unless = (cond, e) => ({ ...e, unless: cond });
const may = (e) => ({ ...e, may: true });

// ---------------------------------------------------------------- カード
const W = [
  cr("w001", "草原の見張り番", "{W}", "人間・兵士", 1, 2, "C", [kw("警戒"), charge(E.gain(2))]),
  cr("w002", "白銀の騎士", "{1}{W}{W}", "人間・騎士", 2, 2, "U", [kw("先制攻撃", "絆魂")]),
  ins("w003", "盾の誓い", "{1}{W}", "C", spell(E.pump(1, 3), T.cre)),
  sor("w004", "謙虚な祈り", "{2}{W}", "C", spell(
    [unless("fewerMana", E.token(2, 1, 1, "W", "兵士")), iff("fewerMana", E.token(3, 1, 1, "W", "兵士"))], undefined,
    "1/1の白の兵士クリーチャー・トークンを2体生成する。あなたのマナゾーンのカードが対戦相手より少ないなら、代わりに3体生成する。")),
  sor("w005", "天秤の裁き", "{3}{W}{W}", "R", spell(E.destroyAll())),
  cr("w006", "誓いの従者", "{W}", "人間・兵士", 2, 1, "C", [stat({ s: "self", p: 1, t: 1 }, { if: "fewerMana" })]),
  cr("w007", "癒し手の見習い", "{1}{W}", "人間・クレリック", 1, 3, "C", [etb(E.gain(3))]),
  cr("w008", "城壁の守護者", "{1}{W}", "壁", 0, 5, "C", [kw("防衛")]),
  cr("w009", "鷹匠", "{2}{W}", "人間・兵士", 2, 2, "C", [etb(E.token(1, 1, 1, "W", "鳥", ["飛行"]))]),
  cr("w010", "天馬の騎兵", "{2}{W}", "人間・騎士", 2, 2, "C", [kw("飛行")]),
  ench("w011", "光の拘束", "{1}{W}", "U", [{ a: "enchant" }, stat({ s: "pacify" })], { subtype: "オーラ" }),
  ins("w012", "聖域の宣告", "{W}", "C", spell(E.pump(1, 1, ["呪禁"]), T.you)),
  cr("w013", "隊列の指揮官", "{2}{W}{W}", "人間・騎士", 3, 3, "U", [stat({ s: "anthem", p: 1, t: 1, others: true })]),
  ins("w014", "白昼の追放", "{2}{W}", "U", spell(E.exile(), { t: "creature", tapped: true })),
  sor("w015", "祝福の雨", "{2}{W}", "C", spell([E.gain(4), E.draw(1)])),
  cr("w016", "白翼の天使", "{3}{W}{W}", "天使", 4, 4, "R", [kw("飛行", "警戒")]),
  sor("w017", "旗手の行進", "{3}{W}", "U", spell([E.token(2, 1, 1, "W", "兵士"), E.pumpAll(1, 1)])),
  ench("w018", "慈悲の灯台", "{2}{W}", "R", [
    upkeep([E.gain(1), iff("fewerMana", E.token(1, 1, 1, "W", "兵士"))], undefined, {
      text: "あなたのアップキープの開始時に、あなたは1点のライフを得る。あなたのマナゾーンのカードが対戦相手より少ないなら、さらに1/1の白の兵士クリーチャー・トークンを1体生成する。",
    }),
  ]),
  cr("w019", "清貧の修道士", "{W}", "人間・モンク", 1, 1, "U", [charge(E.token(1, 1, 1, "W", "兵士"))]),
  cr("w020", "審判の剣士", "{1}{W}{W}", "人間・騎士", 2, 3, "U", [kw("先制攻撃", "警戒")]),
  ins("w021", "夜明けの一斉射撃", "{2}{W}", "C", spell(E.destroy(), { t: "creature", minPower: 4 })),
  ins("w022", "列を組む", "{1}{W}", "C", spell(E.pumpAll(1, 1))),
  cr("w023", "聖堂の大天使", "{4}{W}{W}", "天使", 5, 5, "M", [kw("飛行", "絆魂"), etb(E.token(2, 1, 1, "W", "兵士"))]),
  cr("w024", "若き鷲の騎手", "{1}{W}", "人間・騎士", 1, 2, "C", [kw("飛行")]),
];

const U = [
  cr("u001", "霧の書記", "{1}{U}", "人間・ウィザード", 1, 3, "C", [charge([E.draw(1), E.discard(1)])]),
  cr("u002", "潮読みの賢者", "{2}{U}{U}", "マーフォーク・ウィザード", 2, 4, "U", [kw("飛行"), etb(E.reclaim([E.draw(2)]))]),
  ins("u003", "否認の言葉", "{U}{U}", "C", spell(E.counter(), T.spell)),
  ins("u004", "引き潮", "{1}{U}", "C", spell(E.bounce(), T.cre)),
  cr("u005", "空翔ける幻影", "{3}{U}", "イリュージョン", 3, 3, "C", [kw("瞬速", "飛行")]),
  cr("u006", "小さな潮霊", "{U}", "エレメンタル", 1, 1, "C", [kw("飛行")]),
  ins("u007", "知識の探求", "{2}{U}", "C", spell(E.draw(2))),
  ins("u008", "熟考", "{U}", "C", spell([E.lookTop(), E.draw(1)])),
  ins("u009", "霧の帳", "{1}{U}", "C", spell([E.tap(), E.draw(1)], T.cre)),
  cr("u010", "本の虫の学者", "{2}{U}", "人間・ウィザード", 1, 3, "C", [etb(E.draw(1))]),
  ins("u011", "渦巻く否認", "{1}{U}", "U", spell(E.counter(), { t: "spell", noncreature: true })),
  ins("u012", "呪文砕き", "{2}{U}{U}", "U", spell([E.counter(), E.draw(1)], T.spell)),
  cr("u013", "潮の守り手", "{3}{U}", "マーフォーク・兵士", 2, 5, "C", [kw("瞬速")]),
  cr("u014", "雲間の大鷲", "{2}{U}", "鳥", 2, 2, "C", [kw("飛行")]),
  sor("u015", "記憶の逆流", "{1}{U}", "U", spell([E.reclaim(), E.draw(1)])),
  cr("u016", "深海の巨大魚", "{5}{U}{U}", "リバイアサン", 6, 6, "R", [kw("呪禁"), etb(E.bounce(), T.opp)]),
  sor("u017", "幻惑の霧", "{3}{U}", "U", spell([E.tapAll(), E.draw(1)])),
  sor("u018", "時の巻き戻し", "{3}{U}{U}", "R", spell(E.bounceAll())),
  cr("u019", "水晶の幻術師", "{1}{U}", "人間・ウィザード", 2, 1, "C", [release("{1}{U}")]),
  cr("u020", "波の使い", "{2}{U}", "マーフォーク・ウィザード", 2, 3, "U", [act({ mana: "{1}", tap: true }, E.tap(), T.cre)]),
  cr("u021", "鏡の精", "{3}{U}{U}", "スフィンクス", 4, 4, "R", [kw("飛行"), etb(E.draw(1))]),
  cr("u022", "潮流の操者", "{U}{U}", "マーフォーク・ウィザード", 2, 2, "U", [castSpell(E.pumpSelf(1, 1))]),
  ins("u023", "知恵の泉", "{3}{U}", "R", spell(E.draw(3))),
  ins("u024", "引き込む渦", "{2}{U}", "C", spell(E.tuck(), T.cre)),
];

const B = [
  cr("b001", "墓所あさり", "{B}", "ゾンビ・ネズミ", 1, 1, "C", [kw("接死")]),
  ins("b002", "魂喰らいの呪詛", "{1}{B}", "C", spell(E.destroy(), { t: "creature", nonColor: "B" })),
  cr("b003", "骨の収穫者", "{2}{B}{B}", "ゾンビ・ホラー", 3, 3, "U", [etb(may(E.ret("hand")), T.gyCre)]),
  sor("b004", "闇の取引", "{1}{B}", "C", [burn(1), spell(
    [unless("burned", E.draw(2)), iff("burned", E.draw(3)), E.lose(2, "you")], undefined,
    "カードを2枚引き、あなたは2点のライフを失う。燃焼したなら、代わりにカードを3枚引き、あなたは2点のライフを失う。")]),
  cr("b005", "冥府の王", "{3}{B}{B}{B}", "デーモン", 6, 6, "M", [kw("飛行", "絆魂"), etb(E.sac())]),
  cr("b006", "腐肉喰らい", "{1}{B}", "ゾンビ", 2, 1, "C", [dies([E.lose(1), E.gain(1)])]),
  sor("b007", "心砕き", "{B}", "C", spell(E.discard(1, "opp"))),
  ins("b008", "衰弱の呪い", "{1}{B}", "C", spell(E.pump(-2, -2), T.cre)),
  cr("b009", "墓穴掘り", "{2}{B}", "人間・ウォーロック", 2, 2, "C", [etb(may(E.ret("hand")), T.gyCre)]),
  cr("b010", "吸血の貴族", "{2}{B}", "吸血鬼", 2, 2, "U", [kw("飛行", "絆魂")]),
  sor("b011", "死者の行進", "{3}{B}", "U", spell(E.ret("battlefield"), T.gyCre)),
  ins("b012", "骨の取引", "{1}{B}", "U", [burn(1), spell(
    [unless("burned", E.pump(-2, -2)), iff("burned", E.pump(-4, -4))], T.cre,
    "クリーチャー1体を対象とする。それはターン終了時まで-2/-2の修整を受ける。燃焼したなら、代わりに-4/-4の修整を受ける。")]),
  cr("b013", "屍の巨人", "{4}{B}", "ゾンビ・巨人", 5, 4, "C", [kw("威迫")]),
  sor("b014", "疫病の霧", "{2}{B}{B}", "R", spell(E.pumpAll(-2, -2, undefined, "all"))),
  cr("b015", "闇の刺客", "{2}{B}", "人間・暗殺者", 2, 2, "U", [kw("接死", "威迫")]),
  sor("b016", "魂の吸収", "{3}{B}", "C", spell([E.lose(3), E.gain(3)])),
  cr("b017", "墓所の主", "{3}{B}{B}", "ゾンビ・ウィザード", 4, 5, "R", [upkeep(may(E.ret("hand")), T.gyCre)]),
  cr("b018", "呪われた鴉", "{1}{B}", "鳥", 1, 1, "C", [kw("飛行"), dies([E.draw(1), E.lose(1, "you")])]),
  sor("b019", "抹殺の指令", "{2}{B}", "U", spell(E.sac())),
  cr("b020", "影の怪物", "{B}{B}", "ホラー", 2, 2, "U", [burn(1), etb(iff("burned", E.countersSelf(2)), undefined, {
    text: "燃焼したなら、影の怪物は+1/+1カウンターが2個置かれた状態で戦場に出る。",
  })]),
  ins("b021", "腐敗の触手", "{3}{B}", "C", spell(E.destroy(), T.cre)),
  cr("b022", "悪夢の織り手", "{2}{B}", "人間・ウィザード", 1, 3, "C", [etb(E.discard(1, "opp"))]),
  ench("b023", "冥界の門", "{2}{B}", "R", [allyDies(E.lose(1))]),
  sor("b024", "血の取引", "{X}{B}{B}", "R", spell([E.lose("X"), E.gain("X")])),
];

const Rd = [
  cr("r001", "火花の小鬼", "{R}", "ゴブリン", 1, 1, "C", [kw("速攻"), charge(E.dmgOpp(1))]),
  ins("r002", "稲妻の一閃", "{R}", "C", spell(E.dmg(3), T.any)),
  cr("r003", "炎牙の狼", "{1}{R}{R}", "狼", 3, 2, "U", [burn(2), etb(iff("burned", E.buffSelf(2, 0, ["速攻", "トランプル"])), undefined, {
    text: "燃焼したなら、炎牙の狼は+2/+0の修整と速攻とトランプルを得た状態で戦場に出る。",
  })]),
  sor("r004", "溶岩の噴出", "{3}{R}", "C", spell(E.dmg(5), T.cre)),
  cr("r005", "怒れる巨人", "{4}{R}{R}", "巨人・戦士", 5, 5, "R", [kw("速攻", "トランプル")]),
  cr("r006", "激昂した戦士", "{1}{R}", "人間・戦士", 2, 1, "C", [kw("速攻")]),
  sor("r007", "火の玉", "{X}{R}", "U", spell(E.dmg("X"), T.any)),
  ins("r008", "火花の礫", "{R}", "C", spell(E.dmg(2), T.any)),
  cr("r009", "ゴブリンの扇動者", "{2}{R}", "ゴブリン", 1, 1, "C", [etb(E.token(1, 1, 1, "R", "ゴブリン", ["速攻"]))]),
  ins("r010", "炎の儀式", "{R}", "U", spell(E.addMana("{R}{R}{R}"))),
  ins("r011", "燃え立つ激情", "{R}", "C", spell(E.pump(2, 0, ["先制攻撃"]), T.cre)),
  cr("r012", "溶鉄の狂戦士", "{2}{R}", "人間・狂戦士", 3, 2, "C", [burn(1), etb(iff("burned", E.buffSelf(1, 0, ["速攻"])), undefined, {
    text: "燃焼したなら、溶鉄の狂戦士は+1/+0の修整と速攻を得た状態で戦場に出る。",
  })]),
  cr("r013", "火山の竜", "{4}{R}{R}", "ドラゴン", 4, 4, "R", [kw("飛行", "速攻")]),
  sor("r014", "地割れ", "{3}{R}", "U", spell(E.dmgAll(2))),
  ins("r015", "鉄砕き", "{1}{R}", "C", spell(E.destroy(), { t: "permanent", types: ["アーティファクト"] })),
  sor("r016", "焦土の雄叫び", "{2}{R}", "C", spell(E.pumpAll(1, 0, ["速攻"]))),
  ins("r017", "激情の火炎", "{1}{R}{R}", "U", [burn(2), spell(
    [unless("burned", E.dmg(3)), iff("burned", E.dmg(5))], T.cre,
    "クリーチャー1体を対象とする。激情の火炎はそれに3点のダメージを与える。燃焼したなら、代わりに5点のダメージを与える。")]),
  cr("r018", "熔岩の精霊", "{3}{R}", "エレメンタル", 4, 2, "C", [kw("速攻")]),
  cr("r019", "狂乱の小鬼長", "{1}{R}{R}", "ゴブリン", 2, 2, "R", [stat({ s: "anthem", p: 1, t: 0, kw: ["速攻"], others: true })]),
  ench("r020", "破滅の火口", "{2}{R}", "U", [upkeep(E.dmgOpp(1))]),
  cr("r021", "火吹きの射手", "{2}{R}", "ゴブリン・射手", 2, 1, "U", [act({ mana: "{1}", tap: true }, E.dmg(1), T.any)]),
  sor("r022", "最後の焚き火", "{R}", "U", [burn(2), spell(
    [unless("burned", E.dmgOpp(2)), iff("burned", E.dmgOpp(5))], undefined,
    "最後の焚き火は対戦相手に2点のダメージを与える。燃焼したなら、代わりに5点のダメージを与える。")]),
  cr("r023", "赤熱の巨人", "{3}{R}{R}", "巨人", 5, 4, "U", [burn(1), etb(iff("burned", E.buffSelf(0, 0, ["速攻", "トランプル"])), undefined, {
    text: "燃焼したなら、赤熱の巨人は速攻とトランプルを得た状態で戦場に出る。",
  })]),
  sor("r024", "混沌の嵐", "{2}{R}{R}", "R", spell(E.dmgAll(3, true))),
];

const G = [
  sor("g001", "森の芽吹き", "{G}", "C", spell(E.ramp(1))),
  cr("g002", "苔むした熊", "{1}{G}", "熊", 2, 3, "C", [charge(E.lookTop())]),
  cr("g003", "大樹の守り手", "{2}{G}", "エルフ・ドルイド", 1, 4, "U", [kw("到達"), etb(E.extraCharge(1))]),
  sor("g004", "野生の格闘", "{1}{G}", "C", spell(E.fight(), [T.you, T.opp])),
  cr("g005", "古森の巨獣", "{5}{G}{G}", "ビースト", 7, 7, "R", [kw("トランプル"), release("{5}{G}{G}"), stat({ s: "self", p: 0, t: 0, kw: ["呪禁"] }, { if: "bloom" })]),
  cr("g006", "森の小妖精", "{G}", "エルフ・ドルイド", 1, 1, "C", [mana("{G}")]),
  sor("g007", "成長の兆し", "{2}{G}", "C", spell(E.ramp(2, true))),
  cr("g008", "茨の猪", "{2}{G}", "猪", 3, 3, "C"),
  ins("g009", "巨大化", "{G}", "C", spell(E.pump(3, 3), T.cre)),
  cr("g010", "樹上の狩人", "{1}{G}", "エルフ・射手", 2, 2, "C", [kw("到達")]),
  ins("g011", "野生の咆哮", "{3}{G}", "U", spell(E.pumpAll(2, 2, ["トランプル"]))),
  cr("g012", "大地の巨像", "{4}{G}{G}", "エレメンタル", 6, 6, "U", [kw("トランプル"), stat({ s: "self", p: 2, t: 2 }, { if: "bloom" })]),
  sor("g013", "根の抱擁", "{1}{G}", "C", spell(E.counters(2), T.cre)),
  cr("g014", "古老の樹", "{3}{G}", "ツリーフォーク", 2, 5, "U", [kw("到達"), charge(E.ramp(1))]),
  ins("g015", "噛みつき", "{1}{G}", "C", spell(E.bite(), [T.you, T.opp])),
  ench("g016", "豊穣の祈り", "{G}{G}", "U", [stat({ s: "extraCharge", n: 1 })]),
  cr("g017", "森の長老", "{2}{G}{G}", "エルフ・シャーマン", 3, 3, "R", [etb(E.ramp(1))]),
  cr("g018", "原野の大猫", "{3}{G}", "猫", 4, 4, "C"),
  cr("g019", "巨木の守護獣", "{5}{G}", "ビースト", 5, 7, "U", [kw("到達")]),
  ins("g020", "自然の再生", "{1}{G}", "C", spell(E.destroy(), { t: "permanent", types: ["アーティファクト", "エンチャント"] })),
  cr("g021", "群れの導き手", "{2}{G}", "狼", 2, 2, "U", [etb(E.token(1, 2, 2, "G", "狼"))]),
  sor("g022", "大地の化身", "{3}{G}", "R", spell(E.token(1, { count: "mana" }, { count: "mana" }, "G", "エレメンタル"), undefined,
    "X/Xの緑のエレメンタル・クリーチャー・トークンを1体生成する。Xはあなたのマナゾーンにあるカードの枚数に等しい。")),
  cr("g023", "原初の巨竜", "{6}{G}{G}", "ワーム", 8, 8, "M", [kw("呪禁", "トランプル"), release("{6}{G}{G}")]),
  cr("g024", "芽吹きの精", "{G}", "エルフ・ドルイド", 1, 1, "C", [etb(E.extraCharge(1))]),
];

const Cl = [
  art("c001", "旅人のランタン", "{2}", "C", [mana("any")]),
  acr("c002", "鉄の歩兵", "{3}", "構築物", 2, 3, "C"),
  acr("c003", "虚ろなる番兵", "{4}{C}", "構築物", 4, 5, "U", [etb(E.erode(1))]),
  sor("c004", "虚空の裂け目", "{3}{C}{C}", "R", spell([E.erode(2), E.draw(1)])),
  art("c005", "予言者の水晶", "{3}", "U", [act({ mana: "{2}", tap: true }, E.draw(1))]),
  acr("c006", "歩く防壁", "{2}", "壁", 0, 4, "C", [kw("防衛")]),
  cr("c007", "空虚の喰らい手", "{3}{C}", "虚無・ドローン", 3, 3, "U", [etb(E.erode(1))]),
  acr("c008", "機械仕掛けの鷹", "{3}", "鳥", 2, 1, "C", [kw("飛行")]),
  acr("c009", "錆びた巨兵", "{6}", "構築物", 6, 6, "U", [kw("トランプル")]),
  art("c010", "戦旗", "{3}", "U", [stat({ s: "anthem", p: 1, t: 0 })]),
  ins("c011", "虚無の囁き", "{1}{C}", "U", spell(E.counter(), { t: "spell", maxMV: 2 })),
  cr("c012", "全てを喰らうもの", "{6}{C}{C}", "虚無", 8, 8, "M", [kw("トランプル"), etb(E.erode(2))]),
  art("c013", "万能の鍵", "{1}", "C", [mana("{C}")]),
  acr("c014", "境界の観測者", "{4}", "構築物", 3, 4, "C", [etb(E.draw(1))]),
  cr("c015", "虚空よりの使者", "{2}{C}", "虚無・ドローン", 3, 2, "C", [kw("威迫")]),
  art("c016", "原初の石碑", "{4}", "R", [mana("{C}{C}")]),
];

const M = [
  cr("m001", "天空の審問官", "{1}{W}{U}", "スフィンクス", 2, 3, "U", [kw("飛行"), etb(E.tap(0, true), T.opp)]),
  cr("m002", "灰燼の狂戦士", "{B}{R}", "人間・狂戦士", 3, 2, "U", [kw("速攻"), burn(1), etb(iff("burned", E.lose(2)), undefined, {
    text: "燃焼したなら、灰燼の狂戦士が戦場に出たとき、対戦相手は2点のライフを失う。",
  })]),
  cr("m003", "根を張る長老", "{2}{B}{G}", "エルフ・シャーマン", 3, 4, "U", [etb(E.ret("mana"), T.gy)]),
  cr("m004", "大海と森の主", "{3}{G}{U}", "リバイアサン", 5, 5, "R", [etb(E.draw(3), undefined, { if: "bloom" })]),
  cr("m005", "曙光の伝令", "{R/W}{R/W}", "人間・兵士", 2, 2, "C", [kw("先制攻撃")]),
  ins("m006", "森霊の加護", "{G/W}", "C", spell(E.pump(2, 2), T.cre)),
  cr("m007", "静寂の番人", "{W}{U}", "スピリット", 2, 2, "U", [kw("瞬速", "飛行")]),
  cr("m008", "記憶喰らい", "{1}{U}{B}", "ホラー", 2, 3, "U", [etb([E.discard(1, "opp"), E.draw(1)])]),
  sor("m009", "思考の簒奪", "{3}{U}{B}", "U", spell([E.destroy(), E.draw(1)], T.cre)),
  cr("m010", "地獄の乗り手", "{2}{B}{R}", "デーモン", 4, 3, "U", [kw("速攻", "威迫")]),
  sor("m011", "血と灰", "{1}{B}{R}", "C", spell([E.dmg(3), E.lose(2)], T.cre)),
  cr("m012", "怒れる猛獣", "{R}{G}", "ビースト", 3, 3, "C", [kw("速攻")]),
  cr("m013", "大地揺らす竜", "{3}{R}{G}", "ドラゴン", 5, 5, "R", [kw("飛行", "トランプル")]),
  cr("m014", "森の聖騎士", "{1}{G}{W}", "人間・騎士", 3, 3, "U", [kw("警戒"), etb(E.token(1, 1, 1, "W", "兵士"))]),
  sor("m015", "群れの祝福", "{G}{W}", "U", spell(E.countersAll(1))),
  cr("m016", "秩序の処刑人", "{1}{W}{B}", "人間・クレリック", 2, 3, "U", [kw("絆魂"), etb([E.lose(2), E.gain(2)])]),
  sor("m017", "赦しと罰", "{2}{W}{B}", "U", spell([E.destroy(), E.gain(3)], T.cre)),
  cr("m018", "嵐呼びの術士", "{1}{U}{R}", "人間・ウィザード", 2, 3, "U", [castSpell(E.dmgOpp(1))]),
  ins("m019", "雷鳴の思索", "{U}{R}", "U", spell([E.dmg(2), E.draw(1)], T.any)),
  cr("m020", "毒の茨", "{B}{G}", "植物", 2, 3, "U", [kw("接死", "到達")]),
  sor("m021", "輪廻の園", "{3}{B}{G}", "U", spell([E.ret("battlefield"), E.ramp(1)], T.gyCre)),
  cr("m022", "戦場の伝令", "{1}{R}{W}", "人間・兵士", 3, 2, "U", [kw("速攻"), attacks(E.pumpAll(1, 0))]),
  cr("m023", "潮と森の魔導士", "{G}{U}", "マーフォーク・ドルイド", 1, 3, "C", [mana("{G}", "{U}")]),
  cr("m024", "影翼の蝙蝠", "{U/B}{U/B}", "コウモリ", 2, 1, "C", [kw("飛行")]),
  cr("m025", "沼地の徘徊者", "{B/G}{B/G}", "ゾンビ・ビースト", 2, 3, "C"),
  ins("m026", "撃ち落とし", "{R/G}", "C", spell(E.dmg(4), { t: "creature", flying: true })),
  cr("m027", "放浪の賢者", "{2/W}{2/W}", "人間・モンク", 2, 3, "C", [kw("警戒")]),
  cr("m028", "三位の審問官", "{W}{U}{B}", "スフィンクス", 3, 3, "R", [kw("飛行"), etb([E.draw(1), E.gain(2)])]),
  cr("m029", "原野の覇王", "{2}{R}{G}{W}", "人間・戦士", 6, 6, "M", [kw("警戒", "速攻", "トランプル")]),
  sor("m030", "混沌の簒奪", "{2}{U}{B}{R}", "R", spell([E.dmg(4), E.draw(2), E.discard(1, "opp")], T.cre)),
];

const CARDS = [...W, ...U, ...B, ...Rd, ...G, ...Cl, ...M];

// ---------------------------------------------------------------- 文章生成
const COLOR_JA = { W: "白", U: "青", B: "黒", R: "赤", G: "緑", C: "無色" };

function amountText(n) {
  if (n === "X") return "X";
  if (typeof n === "number") return String(n);
  return "X";
}
function signed(n) {
  return n >= 0 ? `+${n}` : `${n}`;
}
function ptText(p, t) {
  return `${signed(p)}/${signed(t)}`;
}
function kwList(kws) {
  return kws.join("と");
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
      if (spec.nonColor) return `${parts.join("")}${COLOR_JA[spec.nonColor]}でないクリーチャー1体`;
      return `${parts.join("")}クリーチャー1体`;
    }
    case "any":
      return "クリーチャー1体かプレイヤー1人";
    case "spell":
      if (spec.noncreature) return "クリーチャーでない呪文1つ";
      if (spec.maxMV !== undefined) return `マナ総量が${spec.maxMV}以下の呪文1つ`;
      return "呪文1つ";
    case "permanent":
      return `${spec.types.join("か")}1つ`;
    case "graveyard":
      return spec.cardType ? `あなたの墓地にある${spec.cardType}・カード1枚` : "あなたの墓地にあるカード1枚";
  }
}

function tokenText(e) {
  const kws = e.kw?.length ? `${e.kw.join("、")}を持つ` : "";
  const isX = typeof e.p === "object";
  const pt = isX ? "X/X" : `${e.p}/${e.t}`;
  return `${kws}${pt}の${COLOR_JA[e.color]}の${e.sub}・クリーチャー・トークンを${e.n}体生成する。${isX ? "Xはあなたのマナゾーンにあるカードの枚数に等しい。" : ""}`;
}

/** 効果1つの文章。it = 対象を指す言葉 */
function effectText(e, name, abil) {
  const it = (i = 0) => (abil.targets && abil.targets.length > 1 ? (i === 0 ? "前者" : "後者") : "それ");
  const m = e.may;
  switch (e.do) {
    case "damage":
      if (e.to === "opp") return `${name}は対戦相手に${amountText(e.n)}点のダメージを与える。`;
      return `${name}は${it(e.tg)}に${amountText(e.n)}点のダメージを与える。`;
    case "damageAll":
      return `${name}は各クリーチャー${e.players ? "と各プレイヤー" : ""}にそれぞれ${amountText(e.n)}点のダメージを与える。`;
    case "destroy":
      return `${it(e.tg)}を破壊する。`;
    case "destroyAll":
      return e.maxPower !== undefined ? `パワーが${e.maxPower}以下のクリーチャーをすべて破壊する。` : "すべてのクリーチャーを破壊する。";
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
    case "tapAll":
      return "対戦相手がコントロールするクリーチャーをすべてタップする。";
    case "pump": {
      const who = e.self ? name : it(e.tg);
      const kws = e.kw?.length ? `、${kwList(e.kw)}を得る` : "";
      if (e.p === 0 && e.t === 0) return `ターン終了時まで、${who}は${kwList(e.kw)}を得る。`;
      return `ターン終了時まで、${who}は${ptText(e.p, e.t)}の修整を受け${kws}${kws ? "。" : "る。"}`;
    }
    case "pumpAll": {
      const who = e.who === "all" ? "すべてのクリーチャー" : "あなたがコントロールするクリーチャー";
      const kws = e.kw?.length ? `、${kwList(e.kw)}を得る` : "";
      return `ターン終了時まで、${who}は${ptText(e.p, e.t)}の修整を受け${kws}${kws ? "。" : "る。"}`;
    }
    case "buffSelf":
      return `${name}は${ptText(e.p, e.t)}の修整を受ける。`;
    case "counters":
      return `${e.self ? name : it(e.tg)}の上に+1/+1カウンターを${e.n}個置く。`;
    case "countersAll":
      return `あなたがコントロールする各クリーチャーの上に+1/+1カウンターを${e.n}個置く。`;
    case "draw":
      return `カードを${amountText(e.n)}枚引く。`;
    case "discard":
      return e.who === "opp" ? `対戦相手は手札を${e.n}枚捨てる。` : `カードを${e.n}枚捨てる。`;
    case "gainLife":
      return `あなたは${amountText(e.n)}点のライフを得る。`;
    case "loseLife":
      return e.who === "opp" ? `対戦相手は${amountText(e.n)}点のライフを失う。` : `あなたは${amountText(e.n)}点のライフを失う。`;
    case "token":
      return tokenText(e);
    case "counter":
      return `${it(e.tg)}を打ち消す。`;
    case "returnCard": {
      const to = { hand: "あなたの手札に戻す", battlefield: "戦場に戻す", mana: "あなたのマナゾーンに置く" }[e.to];
      return `${it(e.tg)}を${to}${m ? "てもよい" : ""}。`.replace("戻すてもよい", "戻してもよい").replace("置くてもよい", "置いてもよい");
    }
    case "rampTop":
      return `あなたのライブラリーの一番上のカード${e.n > 1 ? `${e.n}枚` : ""}を${e.tapped ? "タップ状態で" : ""}あなたのマナゾーンに置く。`;
    case "extraCharge":
      return `このターン、あなたは追加で${e.n}回チャージを行ってもよい。`;
    case "reclaim":
      if (e.then?.length) return `還元を行ってもよい。そうしたなら、${e.then.map((x) => effectText(x, name, abil)).join("")}`;
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
  }
  throw new Error(`文章を作れない効果: ${JSON.stringify(e)}`);
}

const COND_PREFIX = {
  bloom: "開花 ― ",
  burned: "燃焼したなら、",
  fewerMana: "あなたのマナゾーンのカードが対戦相手より少ないなら、",
};

function bodyText(abil, name) {
  const targets = abil.targets?.length
    ? abil.targets.length === 2
      ? `${targetText(abil.targets[0])}と、${targetText(abil.targets[1])}を対象とする。`
      : `${targetText(abil.targets[0])}を対象とする。`
    : "";
  return (
    targets +
    abil.effects
      .map((e) => {
        const t = effectText(e, name, abil);
        if (e.if) return COND_PREFIX[e.if] + t;
        return t;
      })
      .join("")
  );
}

const TRIGGER_PREFIX = {
  etb: (n) => `${n}が戦場に出たとき、`,
  dies: (n) => `${n}が死亡したとき、`,
  attacks: (n) => `${n}が攻撃するたび、`,
  charge: () => "チャージ時 ― ",
  upkeep: () => "あなたのアップキープの開始時に、",
  endStep: () => "あなたの終了ステップの開始時に、",
  castSpell: () => "あなたがインスタントかソーサリーである呪文を唱えるたび、",
  allyDies: () => "あなたがコントロールするクリーチャーが死亡するたび、",
};

function staticText(abil, name) {
  const st = abil.st;
  const kws = st.kw?.length ? kwList(st.kw) : "";
  let body;
  switch (st.s) {
    case "anthem": {
      const who = st.others ? "あなたがコントロールする他のクリーチャー" : "あなたがコントロールするクリーチャー";
      body = `${who}は${ptText(st.p, st.t)}の修整を受け${kws ? `、${kws}を持つ。` : "る。"}`;
      break;
    }
    case "self":
      if (st.p === 0 && st.t === 0) body = `${name}は${kws}を持つ。`;
      else body = `${name}は${ptText(st.p, st.t)}の修整を受け${kws ? `、${kws}を持つ。` : "る。"}`;
      break;
    case "extraCharge":
      return `あなたは各ターンに追加で${st.n}回チャージを行ってもよい。`;
    case "pacify":
      return "エンチャントしているクリーチャーは攻撃もブロックもできない。";
    case "auraBuff":
      return `エンチャントしているクリーチャーは${ptText(st.p, st.t)}の修整を受け${kws ? `、${kws}を持つ。` : "る。"}`;
  }
  if (abil.if === "bloom") return `開花 ― ${body}`;
  if (abil.if === "fewerMana") return `あなたのマナゾーンのカードが対戦相手より少ないかぎり、${body}`;
  return body;
}

function costSymbolsText(cost) {
  const parts = [];
  if (cost.mana) parts.push(cost.mana);
  if (cost.tap) parts.push("{T}");
  return parts.join(", ");
}

function abilityText(abil, name) {
  if (abil.text) return abil.text;
  switch (abil.a) {
    case "burn":
      return `燃焼 ${abil.n}`;
    case "release":
      return `マナ解放 ${abil.cost}`;
    case "spell":
      return bodyText(abil, name);
    case "trigger": {
      const pre = TRIGGER_PREFIX[abil.on](name);
      const body = bodyText(abil, name);
      if (abil.if === "bloom") return `開花 ― ${pre}${body}`;
      return pre + body;
    }
    case "static":
      return staticText(abil, name);
    case "activated":
      return `${costSymbolsText(abil.cost)}:${bodyText(abil, name)}`;
    case "mana":
      if (abil.produce[0] === "any") return "{T}:好きな色1色のマナ1つを加える。";
      return `{T}:${abil.produce.join("か")}を加える。`;
    case "enchant":
      return "エンチャント(クリーチャー)";
  }
  throw new Error(`文章を作れない能力: ${JSON.stringify(abil)}`);
}

function cardText(card) {
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
    lines.push(abilityText(abil, card.name));
  }
  flush();
  return lines;
}

// ---------------------------------------------------------------- 検証
const ids = new Set();
for (const c of CARDS) {
  if (ids.has(c.id)) throw new Error(`IDが重複しています: ${c.id}`);
  ids.add(c.id);
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
}

// ---------------------------------------------------------------- 出力
const out = CARDS.map((c) => {
  const { abilities, ...rest } = c;
  return { ...rest, text: cardText(c), abilities };
});
writeFileSync(join(here, "cards.json"), JSON.stringify(out, null, 2) + "\n");

// ---------------------------------------------------------------- スターターデッキ
const COLORS = ["W", "U", "B", "R", "G"];
function colorsOf(cost) {
  const set = new Set();
  for (const m of cost.matchAll(/\{([^}]+)\}/g)) for (const ch of m[1].split("/")) if (COLORS.includes(ch)) set.add(ch);
  return [...set];
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

const DECKS = [
  { id: "wu", name: "白青:空の守り", colors: ["W", "U"] },
  { id: "ub", name: "青黒:記憶の簒奪", colors: ["U", "B"] },
  { id: "br", name: "黒赤:灰の代償", colors: ["B", "R"] },
  { id: "rg", name: "赤緑:大地の猛攻", colors: ["R", "G"] },
  { id: "gw", name: "緑白:群れの行進", colors: ["G", "W"] },
  { id: "wb", name: "白黒:命の天秤", colors: ["W", "B"] },
  { id: "ur", name: "青赤:嵐の術士", colors: ["U", "R"] },
  { id: "bg", name: "黒緑:輪廻の園", colors: ["B", "G"] },
  { id: "rw", name: "赤白:先陣の旗", colors: ["R", "W"] },
  { id: "gu", name: "緑青:満ちる大海", colors: ["G", "U"] },
];

const copiesFor = (card) => ({ コモン: 4, アンコモン: 3, レア: 2, 神話レア: 1 })[card.rarity];

const INTERACTION = new Set(["damage", "destroy", "exile", "bounce", "tuck", "counter", "sacrifice", "fight", "bite", "destroyAll", "damageAll", "tap"]);
function isInteraction(c) {
  for (const a of c.abilities) {
    for (const e of a.effects ?? []) {
      if (INTERACTION.has(e.do) && e.to !== "opp") return true;
      if (e.do === "pump" && typeof e.p === "number" && e.p < 0) return true;
    }
    if (a.a === "static" && a.st.s === "pacify") return true;
  }
  return false;
}

function buildDeck(colors) {
  const fits = (c) => {
    if (c.cost.includes("{C}")) return false; // {C}は欠色デッキ向け
    return colorsOf(c.cost).every((x) => colors.includes(x));
  };
  const pool = out.filter(fits);
  const score = (c) => {
    const cs = colorsOf(c.cost);
    let s = { コモン: 1, アンコモン: 2, レア: 3, 神話レア: 3.5 }[c.rarity];
    if (cs.length >= 2) s += 1.5;
    if (cs.length === 0) s -= 1.5;
    if (isInteraction(c)) s += 2;
    return s;
  };
  const sorted = [...pool].sort((a, b) => score(b) - score(a) || a.id.localeCompare(b.id));
  const deck = {};
  const curve = {};
  let total = 0;
  const curveCap = { 0: 3, 1: 7, 2: 10, 3: 9, 4: 7, 5: 5, 6: 3, 7: 2, 8: 2 };
  const add = (c, limit, relaxCurve) => {
    const v = Math.min(8, mv(c.cost));
    let added = 0;
    while ((deck[c.id] ?? 0) < copiesFor(c) && total < 40 && added < limit && (relaxCurve || (curve[v] ?? 0) < curveCap[v])) {
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
  const isCre = (c) => c.type.includes("クリーチャー");
  fill((c) => !isCre(c) && isInteraction(c), 10, false);
  fill(isCre, 22, false);
  fill((c) => !isCre(c), 40 - total, false);
  fill(() => true, 40 - total, true);
  if (total !== 40) throw new Error(`デッキ ${colors.join("")} が40枚になりません(${total})`);
  return deck;
}

const decks = DECKS.map((d) => ({ ...d, cards: buildDeck(d.colors) }));
writeFileSync(join(here, "decks.json"), JSON.stringify(decks, null, 2) + "\n");

const counts = {};
for (const c of out) {
  const cs = colorsOf(c.cost);
  const k = cs.length === 0 ? "欠色" : cs.length === 1 ? cs[0] : "多色";
  counts[k] = (counts[k] ?? 0) + 1;
}
console.log(`カード ${out.length}種類`, counts);
console.log(`スターターデッキ ${decks.length}個`);
