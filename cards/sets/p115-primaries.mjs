// 第11.5弾「原色の守護者」(新規展開) 3つの単語:原色・守護・濁り / 白・青・緑の単色だけ
//
// 設定:色がまだ混ざっていなかった時代、色ごとに1柱ずつ守護者がいた。守護者たちは色が混ざることを「濁り」と呼んで憎み、
//   やがて守護者同士の争いになった。赤の守護者は争いの火種となって真っ先に討たれ、最期の炎が世界に散って混色の始まりになった。
//   黒の守護者は赤を討つために手を組んだが、用済みになって葬られ、その墓所の場所は誰も知らない。
//   生き残った白(癒す)・青(知る)・緑(育つ)は休戦しているが、「次に濁るのはお前だ」と互いを疑い合っている。
//
//   原色 ―:あなたのマナゾーンにある、そのカードと同じ色の単色カードの枚数。多色・欠色・裏向きのカードは数えない。
//   染色 ―:このカードをチャージしたとき(マナゾーンに置かれたとき)、あなたのマナゾーンが純色なら、効果が起きる。
//
//   白:回復。ライフを得るたびに強くなる。
//   青:ドロー。たくさん引き、各ターンの2枚目を引くたびに誘発する。
//   緑:ファッティ。すべてマナ総量11以上。原色と過去のカード(開拓進化・ランプ・《黄金》・マナ武装)で軽減して出す。
import {
  cr, ins, sor, ench, kw, spell, etb, upkeep, lifeGain, once, discount, scale, crest, buried, lord,
  primaryDown, costDown, dye, secondDraw, primaryCount, T, E,
} from "../lib.mjs";

const tagged = (c) => ({ ...c, tags: [...new Set([...(c.tags ?? []), "原色"])] });
const W = primaryCount("W");
const U = primaryCount("U");
const G = primaryCount("G");
/** マナ総量11以上の呪文 */
const HUGE = { minMV: 11 };
const cleric = (n = 1) => E.token(n, 1, 1, "W", "人間・クレリック");
const bird = (n = 1) => E.token(n, 1, 1, "U", "鳥", ["飛行"]);

export const PRIMARIES = [
  // ================================================================ 白:回復
  tagged(cr("pc01", "白の守護者 ルミエラ", "{3}{W}{W}", "神・守護者", 4, 5, "M", [
    kw("飛行", "絆魂"),
    etb(E.gain(W)),
    once(lifeGain([E.counters(1)], T.you)),
    lifeGain(E.lose(1), undefined, { if: "pureColor" }),
  ], { flavor: "「黒を葬ったのは正しかった。……そう祈るしかないの。だから私は、今日も誰かを癒やすのです」" })),
  tagged(ench("pc02", "黒き墓所の封印聖堂", "{2}{W}{W}", "R", [upkeep(E.gain(W)), upkeep(cleric(), undefined, { if: { primary: "W", n: 5 } })], {
    flavor: "祈りが途切れた日、封印はほどける。だから聖堂の鐘は、一度も鳴りやんだことがない。",
  })),
  tagged(cr("pc03", "慈雨の大司祭", "{2}{W}{W}", "人間・クレリック", 1, 3, "R", [once(lifeGain(cleric()))], { flavor: "「癒やしは雨と同じ。降らせ続ければ、やがて地面が応える」" })),
  tagged(cr("pc04", "聖水の運び手", "{1}{W}", "人間・クレリック", 2, 2, "U", [etb(E.gain(2)), dye(E.gain(3))])),
  tagged(ins("pc05", "白光の祈り", "{1}{W}", "U", spell([E.pump(1, 3), E.gain(3)], T.you))),
  tagged(sor("pc06", "癒し手の行進", "{2}{W}{W}", "U", spell([E.gain(W), E.countersAll(1)]), { flavor: "「青は知るだけ、緑は育つだけ。癒やせるのは私たちだけよ」──ルミエラ" })),
  tagged(ins("pc07", "聖別の浄光", "{2}{W}", "U", spell([E.exile(), E.gain(2)], { t: "creature", tapped: true }))),
  tagged(cr("pc08", "巡礼の癒し手", "{W}", "人間・クレリック", 1, 2, "C", [kw("絆魂"), dye(E.gain(2))])),
  tagged(cr("pc09", "祈りの番兵", "{1}{W}", "人間・兵士", 1, 4, "C", [dye(E.gain(2))])),
  tagged(cr("pc10", "白翼の見習い", "{1}{W}", "人間・クレリック", 2, 1, "C", [kw("飛行"), once(lifeGain(E.pumpSelf(1, 1)))])),
  tagged(ins("pc11", "光の聖句", "{W}", "C", [spell(E.gain(3)), dye(E.gain(2))])),
  tagged(cr("pc12", "聖堂の衛兵", "{2}{W}", "人間・兵士", 2, 3, "C", [kw("警戒"), etb(E.gain(3))])),
  tagged(cr("pc13", "聖別の天使", "{3}{W}", "天使", 2, 3, "C", [kw("飛行"), once(lifeGain(E.countersSelf(1)))])),
  tagged(ins("pc14", "守りの陣", "{1}{W}", "C", spell([E.pumpAll(0, 2), E.gain(2)]))),
  tagged(sor("pc15", "裁きの光", "{3}{W}", "C", spell([E.destroy(), E.gain(2)], { t: "creature", who: "opp", minPower: 4 }))),

  // ================================================================ 青:ドロー
  tagged(cr("pc16", "青の守護者 シアネア", "{3}{U}{U}", "神・守護者", 3, 5, "M", [
    kw("飛行"),
    upkeep(E.draw(1), undefined, { if: "pureColor" }),
    secondDraw([E.tap(0, true), E.mill(2)], T.opp),
  ], { flavor: "「赤の最期の炎について、記録は3つ残っている。どれも互いに矛盾している。だから私は、まだ読むのをやめられない」" })),
  tagged(ench("pc17", "知識の大書庫", "{2}{U}{U}", "R", [secondDraw(bird()), dye(E.draw(1))], { flavor: "棚は天井まで届き、天井はまだ見えない。" })),
  tagged(sor("pc18", "原色の叡智", "{3}{U}{U}", "R", spell([E.draw(U), E.discard(2)]), { flavor: "「白は癒やすことしか知らない。緑は育つことしか知らない。愚かだと思わない?」──シアネア" })),
  tagged(cr("pc19", "書庫の番人", "{1}{U}", "人間・ウィザード", 1, 3, "U", [dye(E.draw(1))])),
  tagged(ins("pc20", "矛盾する三つの記録", "{1}{U}{U}", "U", spell([E.counter(), E.draw(1)], T.spell), { flavor: "どれが本当かは問題ではない。三つとも読んだ者が勝つ。" })),
  tagged(cr("pc21", "潮読みの学者", "{2}{U}", "人間・ウィザード", 2, 2, "U", [kw("飛行"), etb(E.draw(1)), dye(E.draw(1))])),
  tagged(cr("pc22", "知識を喰らう大海鳥", "{4}{U}", "鳥", 1, 1, "U", [kw("飛行"), scale({ count: "hand" }, 1, 1)])),
  tagged(cr("pc23", "見習いの写本師", "{U}", "人間・ウィザード", 1, 1, "C", [secondDraw(E.countersSelf(1))])),
  tagged(ins("pc24", "渦の問答", "{U}", "C", [spell(E.draw(1)), dye(E.draw(1))])),
  tagged(ins("pc25", "知の引き潮", "{1}{U}", "C", spell([E.bounce(), { ...E.draw(1), if: "pureColor" }], T.cre))),
  tagged(cr("pc26", "青翼の偵察鳥", "{1}{U}", "鳥", 1, 2, "C", [kw("飛行"), etb(E.draw(1))])),
  tagged(cr("pc27", "霧の写字生", "{2}{U}", "人間・ウィザード", 2, 3, "C", [secondDraw(E.tap(), T.opp)])),
  tagged(sor("pc28", "深き洞察", "{2}{U}", "C", spell([{ ...E.draw(2), unless: { primary: "U", n: 5 } }, { ...E.draw(3), if: { primary: "U", n: 5 } }]))),
  tagged(cr("pc29", "書架の巨人", "{5}{U}", "巨人", 4, 6, "C", [etb(E.draw(2))])),
  tagged(ins("pc30", "霧隠れ", "{1}{U}", "C", spell([E.tap(), E.draw(1)], T.opp))),

  // ================================================================ 緑:ファッティ(すべてマナ総量11以上。軽い3枚のサポートを除く)
  tagged(cr("pc31", "緑の守護者 ヴェルドグラン", "{12}{G}{G}{G}", "神・守護者", 15, 15, "M", [
    primaryDown("G"),
    costDown({ n: 5, if: { manaMV: 30 } }),
    kw("トランプル"),
    etb(E.duelSelf(), T.opp),
  ], { flavor: "「燃えた森も、腐った森も、また生える。それだけのことだ」" })),
  tagged(cr("pc32", "焼け跡の大樹", "{9}{G}{G}", "ツリーフォーク", 11, 11, "R", [primaryDown("G"), kw("到達"), crest(discount(HUGE, 1))], {
    flavor: "赤の守護者が倒れた場所には、灰しか残らなかった。百年後、そこに最初の芽が出た。",
  })),
  tagged(cr("pc33", "地鳴りの巨亀", "{9}{G}{G}", "カメ", 8, 14, "U", [primaryDown("G"), dye(E.extraCharge(1))])),
  tagged(cr("pc34", "黄金郷の山崩し", "{9}{G}{G}", "巨人", 10, 10, "U", [primaryDown("G"), costDown({ n: 3, if: "pioneeredGame" }), buried(4)])),
  tagged(cr("pc35", "原色の巨獣", "{10}{G}{G}", "ビースト", 12, 12, "C", [primaryDown("G"), costDown({ per: { count: "perm", filter: { type: "クリーチャー", minPower: 4 } }, mult: 2 }), kw("トランプル")])),
  tagged(cr("pc36", "森喰らいの大蛇", "{10}{G}", "ヘビ", 11, 9, "C", [primaryDown("G"), costDown({ per: { count: "graveyardCreatures" } }), kw("トランプル")])),
  tagged(cr("pc37", "苔の巨人", "{8}{G}{G}{G}", "巨人", 9, 9, "C", [primaryDown("G"), dye(E.draw(1))])),
  tagged(cr("pc38", "大角の群れ長", "{9}{G}{G}", "ビースト", 10, 8, "C", [primaryDown("G"), kw("トランプル"), dye(E.ramp(1))])),
  tagged(cr("pc39", "根張りの巨像", "{10}{G}{G}", "ツリーフォーク", 11, 12, "C", [primaryDown("G"), kw("到達"), crest(lord({ type: "クリーチャー", color: "G" }, 0, 0, ["トランプル"], false))])),
  tagged(cr("pc40", "雷鳴の巨牛", "{11}{G}{G}", "ビースト", 13, 13, "C", [primaryDown("G"), costDown({ n: 2, if: "buriedInMana" }), kw("速攻", "トランプル")])),
  // サポート:軽い3枚
  tagged(sor("pc41", "大地の呼び声", "{1}{G}", "C", spell([{ ...E.ramp(1), unless: { primary: "G", n: 5 } }, { ...E.ramp(2), if: { primary: "G", n: 5 } }]))),
  tagged(ins("pc42", "巨体への祝福", "{G}", "C", spell([{ ...E.pump(2, 2, ["トランプル"]), unless: { primary: "G", n: 5 } }, { ...E.pump(5, 5, ["トランプル"]), if: { primary: "G", n: 5 } }], T.you))),
  tagged(ench("pc43", "原色の泉", "{2}{G}", "U", [discount(HUGE, 1)], { flavor: "「青は泉の水を調べ、白は泉で傷を洗う。わしは飲む。それだけだ」──ヴェルドグラン" })),
  // サポート:大型の2枚
  tagged(sor("pc44", "森を呼ぶ", "{9}{G}{G}", "R", [primaryDown("G"), spell(E.callForest(5, 11))])),
  tagged(sor("pc45", "大地踏み", "{10}{G}", "U", [primaryDown("G"), spell(E.stomp())])),
];
