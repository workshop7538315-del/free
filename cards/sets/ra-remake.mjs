// 第16a弾 ― 英雄リメイク(1)「ずれた者たち」
//
//   第11弾の英雄の、別の時点・状態を描くリメイク。共通のテーマは「本来その色の得意なものとは少しずれたデッキ」。
//   青緑:1/1の物量(ステラ)/ 黒赤:長期戦コントロール(ロザリンドとヴィオレッタ)/ 白黒:ライフ13固定(リーヴラ)
//   単体の汎用カード《清貧の裁官 アナライザー》。
import { cr, ins, sor, art, ench, kw, spell, etb, dies, upkeep, endStep, onCast, once, stat, lord, selfIf, T, E, E13, E16, iff, gen, legend, cardText, sympathy, constellation, evolve, assassin, inheritIntrigue, paidChoice, faithCost, freeOnIntrigue, anyNumber, analyzer, intrigueEnd } from "../lib.mjs";

const tag = (t) => (c) => ({ ...c, tags: [...new Set([...(c.tags ?? []), t])] });
const STAR = tag("星図");
const COURT = tag("宮廷");
const LIBRA = tag("均衡");
const vaultCast = { a: "vaultCast", label: "アラワレル" };
const GOLD = gen("tk-ougon", "黄金", "{0}", "アーティファクト", [{ a: "mana", produce: ["any"], sacSelf: true }], { pile: true });
const ONE = (n) => E.token(n, 1, 1, "G", "星屑");

// ================================================================ 青緑:星図の咎人(1/1大量展開)
// 青なのに呪文が少なく、緑なのに大型を出さない。ドローとマナ加速を、元々1/1の物量に注ぐ。
const star = (id, name, cost, sub, p, t, rar, need, back, abilities, flavor) =>
  STAR(cr(id, name, cost, sub, p, t, rar, [...abilities, constellation(need, back)], { flavor }));
const sign = (id, name, p, t, abilities) => ({ ...cr(id, name, "{0}", "星座", p, t, "R", abilities), rarity: "生成" });

export const STARS = [
  STAR(legend(cr("ra01", "星図の咎人 ステラ", "{5}{U}{G}", "人間・ウィザード", 1, 1, "M", [
    sympathy(),
    etb(E16.stellaReveal(5)),
    stat({ s: "stellaLord" }),
  ], { flavor: "星図を書き換えた罪で、彼女は空を追われた。それでも、小さな光は彼女についてくる。" }))),
  star("ra02", "天狼星 シリウス", "{2}{G}", "星霊", 2, 3, "R", 8, sign("ra02b", "おおいぬ座", 6, 6, [kw("トランプル")]), [], "夜空でいちばん明るい星は、群れの先頭を走る。"),
  star("ra03", "織女星 ベガ", "{2}{U}", "星霊", 1, 3, "R", 8, sign("ra03b", "こと座", 4, 5, [kw("飛行"), upkeep(E.draw(1))]), [kw("飛行")], "竪琴の音に、小さな星が集まってくる。"),
  star("ra04", "牽牛星 アルタイル", "{1}{U}{G}", "星霊", 2, 2, "R", 10, sign("ra04b", "わし座", 5, 5, [kw("飛行"), etb(ONE(2))]), [], "川の向こう岸へ、星の橋をかける。"),
  star("ra05", "北極星 ポラリス", "{4}{U}{G}", "星霊", 3, 5, "M", 20, sign("ra05b", "こぐま座", 10, 10, [kw("トランプル", "呪禁")]), [], "動かない星のまわりを、すべての星がめぐる。"),
  STAR(cr("ra06", "星屑の妖精", "{1}{U}", "フェアリー", 1, 1, "C", [kw("飛行"), etb(E.draw(1))], { flavor: "こぼれた星の粉から生まれた。" })),
  STAR(cr("ra07", "苔むす小人", "{G}", "小人", 1, 1, "C", [etb(E.ramp(1))], { flavor: "足もとの苔に、星の光がしみている。" })),
  STAR(cr("ra08", "迷い星の子", "{U}", "スピリット", 1, 1, "C", [dies(E.draw(1))], { flavor: "帰り道を探して、ずっと空を見上げている。" })),
  STAR(cr("ra09", "森の灯虫", "{G}", "昆虫", 1, 1, "C", [etb(ONE(1))], { flavor: "一匹見つけたら、近くにもう一匹いる。" })),
  STAR(cr("ra10", "星読みの見習い", "{1}{U}{G}", "人間・ウィザード", 1, 1, "U", [etb(E.draw(2))], { flavor: "師匠の星図を、こっそり写している。" })),
  STAR(cr("ra11", "群れなす蛍", "{2}{G}", "昆虫", 1, 1, "U", [etb(ONE(2))], { flavor: "川辺の夜は、空より明るい。" })),
  STAR(cr("ra12", "天文台の小さな学徒", "{2}{U}", "人間", 1, 1, "U", [kw("飛行"), once(onCast({ type: "クリーチャー", orig11: true })(E.draw(1)))], { flavor: "望遠鏡より、仲間の数を数えるほうが得意。" })),
  STAR(sor("ra13", "流星群の夜", "{1}{U}{G}", "R", spell(E.draw({ count: "orig11" })), { flavor: "降ってくる星を、ひとつずつ拾い集める。" })),
  STAR(ench("ra14", "星図の大陣", "{2}{G}", "U", [lord({ orig11: true }, 1, 1, undefined, false), etb([E.ramp(1), ONE(1)])], { flavor: "小さな点を線で結べば、それは星座になる。" })),
];

// ================================================================ 黒赤:仮面の宮廷(長期戦コントロール)
// 生け贄による一時的なマナ加速と踏み倒しで大型を並べ、除去と置物で蓋をする。
// 宮廷の宿敵同士(ロザリンドとヴィオレッタ)が、危機に際して手を組む。
export const COURT_CARDS = [
  COURT(legend(cr("ra21", "仮面の刺客 ロザリンド", "{7}{R}", "人間・騎士", 2, 8, "M", [
    assassin(),
    evolve("{2}{R}", ["R", "B"], true),
    inheritIntrigue(),
    etb(E.duelSelf(), T.opp),
  ], { flavor: "薔薇の決闘者は仮面をつけ、宿敵の宮廷に剣を貸した。" }))),
  COURT(legend(cr("ra22", "仮面の麗人 ヴィオレッタ", "{5}{B}", "人間・貴族", 0, 6, "M", [
    kw("防衛"),
    assassin(),
    evolve("{1}{B}", ["R", "B"], true),
    etb({ do: "violettaEtb" }),
  ], { flavor: "宰相の座を降りても、宮廷の糸はまだ彼女の指にある。" }))),
  COURT(ench("ra23", "合言葉は「█い薔薇」", "{1}{B/R}", "U", [
    paidChoice(),
    etb(iff("paidR", E16.handBuff(1))),
    etb(iff("paidB", E.discard(1, "opp"))),
    intrigueEnd({ do: "returnSelf" }),
  ], { flavor: "黒か、赤か。答えを知る者だけが扉をくぐれる。" })),
  COURT(ench("ra24", "あなたのための舞台", "{3}{R}{B}", "R", [etb(E.create(GOLD)), intrigueEnd([E.draw(1), E16.tuckUnder()])], { flavor: "幕の裏で、次の幕の支度が進む。" })),
  COURT(ench("ra25", "錦の御旗を", "{3}{R}{B}", "R", [etb(E16.grantAssassin()), intrigueEnd(E16.eachBounceOwn())], { flavor: "旗印さえあれば、昨日の敵も今日の味方。" })),
  COURT(ench("ra26", "我らが麗しき宮廷がため", "{3}{R}{B}", "R", [etb(E.destroy(), T.opp), intrigueEnd(E.create(GOLD))], { flavor: "宮廷を守るためなら、手段は選ばない。" })),
  COURT(ins("ra27", "連剣の鉄茨", "{4}{R}", "R", [freeOnIntrigue(), spell(E16.renken(GOLD))], { flavor: "鉄の茨は、引けば引くほど深く食い込む。" })),
  COURT(ins("ra28", "宮廷の血の献上", "{B}", "C", spell([{ do: "sacOwn" }, E.addMana("{B}{B}{R}")]), { flavor: "忠誠は、血で示すもの。" })),
  COURT(cr("ra29", "宮廷の毒見役", "{1}{B}", "人間", 2, 3, "C", [dies(E.discard(1, "opp"))], { flavor: "最後の一口に、すべてを賭けた。" })),
  COURT(ench("ra30", "仮面舞踏会の招待状", "{1}{B}", "C", [etb(E.discard(1, "opp")), intrigueEnd(E.draw(1))], { flavor: "仮面の下の顔を、誰も知らない。" })),
  COURT(ench("ra31", "燃える薔薇の庭", "{1}{R}", "C", [etb(E.dmg(2), T.cre), intrigueEnd(E.dmgOpp(1))], { flavor: "赤い薔薇は、火の粉を散らして咲く。" })),
  COURT(sor("ra32", "宿敵同士の盟約", "{2}{B}{R}", "U", spell([E.destroy(), E.create(GOLD)], T.cre), { flavor: "握手の手は、互いに剣の柄から離さない。" })),
  COURT(ench("ra33", "処刑台の影", "{2}{B}", "U", [etb(E.destroy(), { t: "creature", who: "opp", maxPower: 3 }), intrigueEnd(E.gain(2))], { flavor: "宮廷の広場には、いつも影が落ちている。" })),
  COURT(cr("ra35", "宮廷の近衛騎士", "{2}{B}{R}", "人間・騎士", 3, 4, "U", [kw("絆魂"), etb(E.discard(1, "opp"))], { flavor: "仕える主が変わっても、守る扉は変わらない。" })),
  COURT(cr("ra36", "仮面の暗殺者", "{1}{B}", "人間・暗殺者", 2, 1, "C", [kw("接死"), assassin()], { flavor: "名前も顔も、仕事のたびに変える。" })),
  COURT(cr("ra37", "宮廷の大処刑人", "{5}{B}{R}", "巨人", 6, 6, "R", [kw("トランプル"), evolve("{2}{B}{R}", ["R", "B"]), etb(E.destroy(), { t: "creature", who: "opp", maxPower: 3 })], { flavor: "宮廷の床に落ちる影は、いつも彼のものだ。" })),
  COURT(cr("ra38", "炎の宮廷楽士", "{3}{R}", "人間・吟遊詩人", 3, 3, "U", [evolve("{1}{R}", ["R", "B"]), etb(E.dmg(2), T.any)], { flavor: "舞踏会の曲が終わるころ、誰かが燃えている。" })),
  COURT(ins("ra39", "黒薔薇の短剣", "{1}{B}", "C", spell(E.pump(-3, -3), T.cre), { flavor: "花束の中に、一本だけ刃が混じっている。" })),
  COURT(ench("ra34", "宮廷の大扉", "{4}{R}{B}", "U", [etb([E.create(GOLD, 2), E.draw(1)]), intrigueEnd(E.gain(2))], { flavor: "重い扉は、選ばれた者のためだけに開く。" })),
];

// ================================================================ 白黒:均衡の裁定(ライフ13固定)
// 回復しすぎも自傷しすぎも許されず、ライフがちょうど13のときだけ強くなる。
// 教義は「清貧であれ、慈善の境界に貧者を置くな」。
const WILL = gen("ra40g", "均衡の意志", "{0}", "ソーサリー", [spell(E16.willOfBalance())]);
// 混成(白/黒):白で払えば回復とリソース、黒で払えば自傷と妨害。ライフが13なら両方(ライフの増減は相殺して起きない)
const wb = (w, wRes, b, bRes) => [
  ...(w ? [iff("paidWnot13", w)] : []),
  ...[wRes].flat().map((e) => iff("paidWor13", e)),
  ...(b ? [iff("paidBnot13", b)] : []),
  ...[bRes].flat().map((e) => iff("paidBor13", e)),
];
export const LIBRA_CARDS = [
  LIBRA(cr("ra41", "均衡の裁定者 リーヴラ", "{2}{W}{B}", "天使", 3, 3, "M", [
    vaultCast,
    anyNumber("リーヴラ"),
    faithCost("リーヴラ", 5, "{B}"),
    kw("飛行"),
    etb([E16.millBoth(3), iff("life13", E14gen(WILL))]),
    stat({ s: "rivraForm", faith: "リーヴラ" }),
  ], { flavor: "天秤の裁定者は、自らを秤に載せた。どちらにも傾かないように。" })),
  LIBRA(sor("ra42", "清貧の誓い", "{W/B}", "C", [paidChoice(), spell(wb(E.gain(2), E.draw(1), E.lose(2, "you"), E.discard(1, "opp")))], { flavor: "持たざることを、誇りとせよ。" })),
  LIBRA(ench("ra43", "慈善の境界", "{2}{W/B}", "U", [paidChoice(), etb(wb(E.gain(3), E13.regrow(1, { type: "クリーチャー" }), E.lose(3, "you"), E.destroy()), { t: "creature", who: "opp", filter: { maxMV: 3 } })], { flavor: "境界の外に、誰も置き去りにしてはならない。" })),
  LIBRA(ins("ra44", "施しの鐘", "{W/B}", "C", [paidChoice(), spell(wb(E.gain(2), [E.create(GOLD), E.draw(1)], E.lose(2, "you"), [E.lose(2, "opp"), E.draw(1)]))], { flavor: "鐘が鳴るたび、誰かが分け与え、誰かが差し出す。" })),
  LIBRA(cr("ra45", "天秤の巡礼者", "{1}{W}{B}", "人間・クレリック", 2, 3, "C", [selfIf("life13", 2, 2, ["飛行"])], { flavor: "目指すのは頂でも谷でもなく、ちょうど真ん中。" })),
  LIBRA(cr("ra46", "均衡の番人", "{2}{W}{B}", "天使", 3, 4, "U", [etb(E16.nudge13(2)), selfIf("life13", 1, 1, ["警戒"])], { flavor: "傾いた皿を、そっと戻す。" })),
  LIBRA(cr("ra47", "秤皿の天使", "{2}{W}{B}", "天使", 3, 4, "R", [kw("飛行"), upkeep(E16.nudge13(2)), endStep(E.draw(1), undefined, { if: "life13" })], { flavor: "片方の皿に羽根を、もう片方に涙を。" })),
  LIBRA(cr("ra48", "清貧の修道女", "{W}{B}", "人間・クレリック", 2, 3, "C", [{ ...lord(undefined, 1, 0), if: "life13" }], { flavor: "多くを望まない者は、多くを与えられる。" })),
  LIBRA(sor("ra49", "審判の日の約束", "{3}{W}{B}", "R", { ...spell([iff("life13", E.destroyAll(undefined, undefined, "opp")), { ...E.destroyAll(), unless: "life13" }]), text: "あなたのライフがちょうど13なら、対戦相手のクリーチャーをすべて破壊する。そうでないなら、すべてのクリーチャーを破壊する。" }, { flavor: "均衡を保った者だけが、審判の日に立っていられる。" })),
  LIBRA(sor("ra50", "献身と贖罪", "{2}{W/B}", "U", [paidChoice(), spell(wb(E.gain(4), E.draw(2), E.lose(4, "you"), E.lose(4, "opp")))], { flavor: "与えた分だけ、奪われる。奪った分だけ、与える。" })),
  LIBRA(art("ra51", "リーヴラの天秤", "{2}", "U", [upkeep(E16.nudge13(1))], { flavor: "針は、いつも13を指そうとする。" })),
  LIBRA(cr("ra52", "均衡を説く者", "{1}{W/B}", "人間・クレリック", 2, 3, "C", [paidChoice(), etb(wb(E.gain(2), E.create(GOLD), E.lose(2, "you"), E.discard(1, "opp")))], { flavor: "「多すぎず、少なすぎず」それが彼女の口癖だった。" })),
];

// ================================================================ 単体の汎用カード:清貧の裁官 アナライザー
const tok = (n, p, t, kws) => ({ ...E.token(n, p, t, undefined, "エミュレート・ゴブリン"), ...(kws ? { kw: kws } : {}) });
const code = (id, name, cost, type, effects, targets) => gen(id, `Code: ${name}`, cost, type, [spell(effects, targets)]);
const AGG = code("ra60a", "Aggressive", "{1}", "ソーサリー", [tok(1, 1, 1), E16.copyEmulate()]);
const FACE = code("ra60b", "Face", "{2}", "ソーサリー", [tok(1, 2, 1), E16.emulatesPump(0, 0, ["速攻"])]);
const TEMPO = code("ra60c", "Tempo", "{2}", "インスタント", [tok(1, 1, 1), E16.emulatesPump(1, 2)]);
const PERM = code("ra60d", "Permission", "{X}{2}", "インスタント", [E16.counterUpTo(2)], T.spell);
const REMOVAL = code("ra60e", "Removal", "{3}", "インスタント", [E.destroy()], T.perm(["クリーチャー", "アーティファクト", "エンチャント"], "opp"));
const PRISON = code("ra60f", "Prison", "{2}", "インスタント", [E16.prison()]);
const HAND = code("ra60g", "Hand Disruption", "{2}", "インスタント", [E16.handExile()]);
const RAMP = code("ra60h", "Ramp", "{2}", "ソーサリー", [E.ramp(2)]);
const CA = code("ra60i", "Card Advantage", "{3}", "ソーサリー", [E.draw(3)]);
const TOOL = code("ra60j", "Toolbox", "{2}", "ソーサリー", [E.dig(1, 4, 1)]);
const ANALYSIS = gen("ra60k", "分析対象", "{4}", "ソーサリー", [spell(E16.analysisDraw())]);
const CODES = [
  { label: "Beatdown", cards: [AGG, FACE, TEMPO] },
  { label: "Control", cards: [TEMPO, PERM, REMOVAL, PRISON, HAND] },
  { label: "Special", cards: [RAMP, CA, TOOL] },
];
export const ANALYZER = [
  cr("ra60", "清貧の裁官 アナライザー", "{7}", "エミュレート・天使", 4, 2, "M", [
    vaultCast,
    analyzer(ANALYSIS, 5),
    etb(E16.codePick(CODES)),
    endStep(E16.analyzerReduce()),
  ], { flavor: "「分析完了。最適解を出力します」" }),
];

function E14gen(card) {
  return { do: "genLib", card, n: { count: "myGrave" } };
}

export const PACK16A = [...STARS, ...COURT_CARDS, ...LIBRA_CARDS, ...ANALYZER];
