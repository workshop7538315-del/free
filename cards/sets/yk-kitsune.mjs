// 第14弾 ― 狐火の社と百鬼夜行
//
//   狐火(欠色・紋章・墓地):狐火のインスタントで稲荷の紋章を持つ狐火をマナゾーンに重ね、ライブラリーに狐火を生成する。
//     稲荷の紋章が重なるほど狐火が軽くなり、コストが0になれば開顕で裏面の妖狐を出せる。
//     《純白の妖狐 ミナモ》はライブラリーを狐火だけにして、狐火を連鎖させる。決まれば勝ち、失敗すればライブラリー切れで負ける大技。
//   百鬼(黒緑+マナ総量100・クリーチャーだけ・セルフランデス・手札なし・紋章):
//     マナ総量100の百鬼は唱えられない。手札がないときに百鬼顕現で呼び、支払ったマナゾーンのカードを墓地に置く。
//     墓地に落ちた百鬼は、金剛羅刹が呼ぶ百鬼夜行で、ターンの終わりに戻ってくる。
import { cr, acr, ins, sor, art, kw, spell, etb, dies, toGraveyard, may, attacks, charge, stat, crest, act, T, E, E13, E14, iff, kaiken, hyakki, withBack, genCard, legend } from "../lib.mjs";

const tag = (t) => (c) => ({ ...c, tags: [...new Set([...(c.tags ?? []), t])] });
const FOXT = tag("狐火");
const HK = tag("百鬼");

// ---------------------------------------------------------------- 生成専用のカード
/** 狐火 / 走る焔(生成専用。デッキには入れられない) */
export const FOX = genCard({
  id: "ykg1",
  name: "狐火",
  short: "狐火 / 走る焔",
  cost: "{6}",
  type: "インスタント",
  subtype: "狐火",
  rarity: "生成",
  abilities: [spell([E.dmg(1), E.draw(1), iff("pureColor", E14.topIfSub("狐火"))], T.player)],
  back: cr("ykg1b", "走る焔", "{6}", "狐火", 2, 1, "生成", [kw("飛行")]),
});

/** 加護《ミナモの加護》から出る《銀白の巫女 ミナモ》 */
const SILVER_GEN = genCard(legend(cr("ykg2", "銀白の巫女 ミナモ", "{8}", "妖狐", 3, 5, "生成", [kw("速攻")], { rarity: "生成" })));

// ---------------------------------------------------------------- 狐火
const foxIns = (id, name, cost, rar, abilities, back, flavor) => FOXT(withBack(ins(id, name, cost, rar, [kaiken(), abilities].flat(), { subtype: "狐火", flavor }), back));
const yoko = (id, name, p, t, abilities, flavor) => legend(cr(id, name, "{0}", "妖狐", p, t, "M", abilities, { flavor }));

export const KITSUNE = [
  foxIns("yk01", "揺蕩う狐火", "{5}", "M", [spell([E14.look3(), E14.foxInari(FOX), E14.genLib(FOX, 1)])],
    yoko("yk01b", "純白の妖狐 ミナモ", 3, 2, [etb(E14.millExceptSub("狐火")), stat({ s: "foxBack" })], "潮の巫女は、狐の姿で還ってきた。"),
    "水面に映る火は、どちらが本物か分からない。"),
  foxIns("yk02", "煌めく狐火", "{8}", "M", [spell(E14.foxWipe(FOX, 5))],
    yoko("yk02b", "銀白の巫女 ミナモ", 3, 5, [etb([E14.genLib(FOX, 2), E14.minamoBlessing(SILVER_GEN, 5)], undefined, { if: "kaiken" })], "銀の尾が九つに分かれるとき、社の火はすべて彼女に従う。"),
    "千の火が一度に灯り、夜が昼になった。"),
  foxIns("yk03", "囁く狐火", "{5}", "R", [spell([E14.foxInari(FOX), E.draw(2)])],
    yoko("yk03b", "宵闇の妖狐 シグレ", 2, 3, [kw("飛行"), etb(E14.foxInari(FOX))], "雨の夜にだけ、社の石段に座っている。"),
    "耳元で、誰かが名前を呼んだ。"),
  foxIns("yk04", "弾ける狐火", "{6}", "R", [spell([E.dmg(5), E14.genLib(FOX, 1)], T.any)],
    yoko("yk04b", "焔尾の妖狐 アカネ", 4, 3, [kw("速攻"), etb(E.dmg(2), T.any)], "尾を振るたび、火の粉が雨のように降る。"),
    "ぱちり、と鳴ったときには、もう燃えている。"),
  // 狐火を生成するカード
  FOXT(sor("yk05", "狐の嫁入り", "{3}", "U", spell([E14.foxInari(FOX), E14.genLib(FOX, 1), E.draw(1)]), { flavor: "晴れた空から雨が降る日、山の尾根を提灯の列がゆく。" })),
  FOXT(art("yk06", "稲荷の社", "{2}", "R", [etb([E14.genLib(FOX, 1), E.draw(1)]), stat({ s: "discount", filter: { sub: "狐火" }, n: 1 })], { flavor: "朱の鳥居をくぐるたび、狐火がひとつ増える。" })),
  FOXT(cr("yk07", "白狐の使い", "{2}", "狐", 2, 3, "C", [etb(E14.genLib(FOX, 1))], { flavor: "神の言葉は、白い狐が運んでくる。" })),
  // 支え
  FOXT(cr("yk08", "狐塚の巫女", "{2}", "人間・巫女", 1, 3, "C", [etb(E13.seek(4, { sub: "狐火" }, "graveyard"))], { flavor: "塚に油揚げを供え、火の行方を占う。" })),
  FOXT(acr("yk09", "稲荷の狛狐", "{3}", "狐", 3, 4, "U", [kw("警戒"), crest(stat({ s: "discount", filter: { sub: "狐火" }, n: 1 }))], { flavor: "口にくわえた鍵は、米蔵のものだという。" })),
  FOXT(art("yk10", "狐火の灯籠", "{2}", "C", [etb(E.draw(1)), crest(stat({ s: "discount", filter: { type: "インスタント", minMV: 5 }, n: 1 }))], { flavor: "火を入れなくても、夜になると灯る。" })),
  FOXT(sor("yk11", "狐塚参り", "{2}", "U", spell(E13.regrow(2, { sub: "狐火" })), { flavor: "消えた火は、塚に帰ってくる。" })),
  FOXT(ins("yk12", "化け狐の悪戯", "{1}", "C", spell(E.bounce(), T.cre), { flavor: "気づけば、落ち葉を握っていた。" })),
  FOXT(ins("yk13", "妖狐の幻術", "{3}", "U", spell(E.counter(), T.spell), { flavor: "唱えたはずの言葉は、狐の鳴き声だった。" })),
  FOXT(cr("yk14", "野狐の群れ", "{4}", "狐", 3, 4, "C", [etb(E14.foxInari(FOX))], { flavor: "人里の灯りにつられて、山から降りてくる。" })),
];

// ---------------------------------------------------------------- 百鬼
const IMPOSSIBLE = "{95}";
export const HYAKKI = [
  HK(legend(cr("yk21", "百鬼の魁 金剛羅刹", `${IMPOSSIBLE}{W}{U}{B}{R}{G}`, "鬼・百鬼", 0, 12, "M", [
    kw("速攻", "トランプル"),
    crest(stat({ s: "drawSort" })),
    hyakki(6, E14.awakenYakou()),
    attacks(E14.rasetsuTurn()),
  ], { flavor: "百鬼の列の先頭を歩く。その後ろに、夜が続く。" }))),
  HK(legend(cr("yk22", "百鬼の幽姫 百々目", `${IMPOSSIBLE}{B}{B}{B}{R}{G}`, "鬼・百鬼", 0, 8, "M", [
    kw("接死"),
    etb(E.destroy(), T.opp),
    { ...charge(E.tutor({ sub: "百鬼" }, "mana")), text: "チャージ時 ― あなたのライブラリーから百鬼のカードを1枚探し、マナゾーンに置く。その後ライブラリーを切り直す。" },
    hyakki(4),
    toGraveyard(E14.handToMana(may(E14.selfToMana()))),
  ], { flavor: "百の目が、百の闇を見ている。" }))),
  HK(legend(cr("yk23", "百鬼の一番槍", `${IMPOSSIBLE}{W}{W}{B}{B}{G}`, "鬼・百鬼", 0, 10, "M", [
    kw("警戒"),
    crest(stat({ s: "manaWard" })),
    hyakki(5),
    toGraveyard(E14.handToMana(may(E.destroy())), T.perm(["クリーチャー", "アーティファクト", "エンチャント"], "opp")),
  ], { flavor: "槍の穂先が月を貫くと、行列が動き出す。" }))),
  // 支え(黒緑・すべてクリーチャー)
  HK(cr("yk24", "百鬼の小鬼", "{B}", "鬼", 2, 2, "C", [etb(E14.handToMana())], { flavor: "持っているものは、何でも土に埋めたがる。" })),
  HK(cr("yk25", "山童", "{1}{G}", "鬼", 2, 3, "C", [etb(E.ramp(1))], { flavor: "夏は川に、冬は山に棲む。" })),
  HK(cr("yk26", "鬼火の案内人", "{2}{B}", "鬼火", 2, 2, "U", [{ ...etb(E.tutor({ sub: "百鬼" }, "mana")), text: "鬼火の案内人が戦場に出たとき、あなたのライブラリーから百鬼のカードを1枚探し、マナゾーンに置く。その後ライブラリーを切り直す。" }], { flavor: "ついていけば、行列の先頭に出る。" })),
  HK(cr("yk27", "土蜘蛛", "{2}{G}", "蜘蛛", 2, 3, "C", [kw("到達", "接死"), dies(E14.handToMana())], { flavor: "古い塚の穴の奥で、糸を張っている。" })),
  HK(cr("yk28", "付喪神の行列", "{3}{G}", "付喪神", 3, 4, "U", [etb(E14.handAllToMana())], { flavor: "捨てられた鍋も傘も、百年たてば歩き出す。" })),
  HK(cr("yk29", "ぬらりひょん", "{2}{B}{G}", "鬼", 3, 3, "R", [stat({ s: "hyakkiDiscount", n: 2 }), crest(stat({ s: "hyakkiDiscount", n: 1 }))], { flavor: "いつのまにか上座に座り、茶をすすっている。" })),
  HK(cr("yk30", "牛鬼", "{3}{B}{G}", "鬼", 5, 4, "U", [kw("トランプル"), dies(E14.selfToMana())], { flavor: "浜に現れ、影を舐めて人を殺す。" })),
  HK(cr("yk31", "山姥", "{2}{B}", "鬼", 2, 2, "C", [etb(E.shrink(2), T.opp)], { flavor: "宿を借りた旅人は、朝には骨になっている。" })),
  HK(cr("yk32", "鎌鼬", "{1}{B}", "獣", 3, 1, "C", [kw("速攻"), dies(E14.handToMana())], { flavor: "斬られたことに、血が出てから気づく。" })),
  HK(cr("yk33", "輪入道", "{4}{B}", "鬼", 5, 3, "U", [kw("速攻"), etb(E14.handToMana())], { flavor: "火の車輪が通ったあとには、魂がひとつ足りない。" })),
  HK(cr("yk34", "大百足", "{4}{G}{G}", "蟲", 6, 6, "U", [kw("トランプル"), etb(E.ramp(1))], { flavor: "山を七巻き半する。" })),
];

export const PACK14 = [...KITSUNE, ...HYAKKI];
