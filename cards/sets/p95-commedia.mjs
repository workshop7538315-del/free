// 第9.5弾「仮面劇場の狂宴」(新規展開) 3つの単語:仮面・演劇・狂気 / 青・黒・赤だけ
//   イタリアの即興仮面劇(コンメディア・デッラルテ)がモチーフ。
//
// 【設定】劇団にいるのは、とても弱い神々。観客の喝采で力を得る。狂気・悲劇・喜劇の3つの派閥がある。
//   秘蔵庫の役者たちは、それぞれの派閥の座長の化身(かわり身)で、どの派閥にも本当は座長1人しかいない。
//   メインのクリーチャーは、座長のだれかが生み出した眷属。
//   座長たちは価値観が根本からおかしく、演劇をすることそのものが目的で、ほかはすべて手段。
//   派閥どうしはとても仲が悪く、顔を合わせれば喧嘩し、いつも陰口を言っている。
//   狂気派の座長 ニコ=フォッリア・ルッチョラ:小柄で中性的なトリックスター(女寄り)。
//   悲劇派の座長 オッタヴィア・ラ・クリマ:陰気で、かなり背が高く、とても細身の女。
//   喜劇派の座長 レオーネ・ジョコンド:筋肉質で陽気な男。
//   カーテンコール N【〜】:化身として演じ切った舞台(戦場の化身)の上に重ね、喝采を消費して座長本人が現れる。
//   喝采【狂気】【悲劇】【喜劇】:観客の喝采。デッキ(メインか秘蔵庫)のカードが関係するカテゴリーだけが、加護の枠を使って0から溜まる。
//     【狂気】青か赤のインスタントかソーサリーを唱えるたび+1(1ターンに2まで)
//     【悲劇】黒か赤のパーマネントを生け贄に捧げるか、黒か赤のトークンでないクリーチャーが死亡するたび+1(1ターンに3まで)
//     【喜劇】赤か白のクリーチャー2体以上で攻撃したとき+1、3体以上なら+2(1ターンに3まで)
//   エントラータ N【〜】:その喝采をN消費して、秘蔵庫から役者を戦場に出す(登場)。回数の制限はない(同じカードは1ターンに1回)。
//   ウシータ ―:役者が戦場を離れて秘蔵庫に戻るとき(退場)。
import {
  cr, art, ins, sor, ench, kw, spell, etb, dies, attacks, endStep, castSpell, act, selfIf, lord, once, onSacrifice,
  releaseSummon, entrata, uscita, curtainCall, applause, modal, allyDies, T, E,
} from "../lib.mjs";

const tagged = (c) => ({ ...c, tags: [...new Set([...(c.tags ?? []), "喝采"])] });
const MAD = "狂気";
const TRAGEDY = "悲劇";
const COMEDY = "喜劇";
// 大喝采:このゲームで得た喝采の累計がこの値以上なら、座長を秘蔵庫から{3}安く唱えられる
const OV = { MAD: 6, TRAGEDY: 6, COMEDY: 3 };
const CREATURES = [{ type: "クリーチャー" }];
const zanni = (n, haste = true) => E.token(n, 1, 1, "R", "役者・ザンニ", haste ? ["速攻"] : undefined);
const extra = (n) => E.token(n, 1, 1, "B", "役者・端役");

export const COMMEDIA = [
  // ================================================================ 秘蔵庫の役者:【狂気】(青赤)
  tagged(cr("cm01", "跳ね回るアルレッキーノ", "{1}{R}", "役者・道化", 2, 1, "U", [entrata(2, MAD), kw("速攻"), etb(E.dmgOpp(1))])),
  tagged(cr("cm02", "囁くブリゲッラ", "{1}{U}", "役者・道化", 1, 2, "U", [entrata(2, MAD), kw("飛行"), etb([E.draw(1), E.discard(1)])])),
  tagged(cr("cm03", "剣舞のスカラムーシュ", "{2}{U}{R}", "役者・剣士", 3, 3, "R", [entrata(5, MAD), kw("先制攻撃"), castSpell(E.pumpSelf(1, 0)), uscita(E.applause(MAD, 1))])),
  tagged(cr("cm04", "狂気の座長", "{4}{U}{R}", "役者", 4, 5, "M", [entrata(5, MAD), kw("飛行"), etb(E.draw(1)), castSpell(E.dmgOpp(1))], { flavor: "「舞台の上なら、私は何にでもなれるの。……ほら、もう誰だかわからないでしょ?」──狂気の座長" })),
  tagged(cr("cm13", "饒舌なドットーレ", "{2}{U}", "役者・学者", 2, 3, "U", [entrata(3, MAD), etb([E.draw(2), E.discard(1)])])),

  // ================================================================ 秘蔵庫の役者:【悲劇】(黒赤)
  tagged(cr("cm05", "嘆きのインナモラータ", "{B}", "役者・恋人", 1, 1, "U", [entrata(2, TRAGEDY), etb([E.lose(1), E.gain(1)]), act({ sacSelf: true }, [E.lose(1), E.gain(1)])])),
  tagged(cr("cm06", "血涙のインナモラート", "{1}{R}", "役者・恋人", 2, 1, "U", [entrata(2, TRAGEDY), etb(E.dmg(1), T.any), act({ sacSelf: true }, E.dmg(1), T.any)])),
  tagged(cr("cm07", "黒仮面のプルチネッラ", "{2}{B}{R}", "役者", 4, 3, "R", [entrata(3, TRAGEDY), releaseSummon(5, CREATURES), kw("威迫"), etb(E.sac())])),
  tagged(cr("cm08", "悲劇の歌姫", "{4}{B}{B}", "役者・歌手", 5, 5, "M", [entrata(5, TRAGEDY), releaseSummon(8, CREATURES), kw("飛行"), onSacrifice()(E.lose(1))], { flavor: "「拍手は要らないわ。すすり泣きだけ置いていって」──悲劇の歌姫" })),

  // ================================================================ 秘蔵庫の役者:【喜劇】(赤)
  tagged(cr("cm09", "ほら吹き隊長カピターノ", "{2}{R}", "役者・兵士", 3, 2, "R", [entrata(1, COMEDY), kw("速攻"), lord({ type: "クリーチャー" }, 1, 0)])),
  tagged(cr("cm10", "機転のコロンビーナ", "{1}{R}", "役者・小間使い", 2, 2, "U", [entrata(1, COMEDY), etb(zanni(2))])),
  tagged(cr("cm11", "老商人パンタローネ", "{3}{R}", "役者・商人", 2, 4, "U", [entrata(2, COMEDY), etb(E.draw(1)), uscita(E.applause(COMEDY, 1))])),
  tagged(cr("cm12", "一座の花形", "{3}{R}{R}", "役者", 5, 4, "M", [entrata(3, COMEDY), kw("速攻", "トランプル"), attacks(E.pumpAll(1, 0))], { flavor: "「さあ笑え! 笑わねえなら、笑うまで殴る!」──一座の花形" })),

  // ================================================================ 【狂気】のメイン(青赤の呪文)
  tagged(ins("cm14", "台本の読み合わせ", "{U}", "C", spell([E.lookTop(), E.draw(1)]))),
  tagged(sor("cm15", "狂乱の幕開け", "{1}{R}", "C", modal([["クリーチャー1体かプレイヤー1人に2点", E.dmg(2), T.any], ["喝采【狂気】を2増やし、1枚引く", [E.applause(MAD, 2), E.draw(1)]]]))),
  tagged(ins("cm16", "仮面の囁き", "{1}{U}", "C", modal([["マナ総量2以下の呪文を打ち消す", E.counter(0), { t: "spell", maxMV: 2 }], ["クリーチャー1体を手札に戻す", E.bounce(0), T.cre]]))),
  tagged(ins("cm17", "道化の綱渡り", "{1}{U}{R}", "C", spell([E.draw(1), E.dmgOpp(1)]))),
  tagged(cr("cm18", "狂気の舞台監督", "{1}{U}{R}", "眷属・ウィザード", 2, 3, "U", [act({ applause: { cat: MAD, n: 2 } }, E.draw(1))])),
  tagged(cr("cm19", "幕間の道化", "{1}{R}", "眷属・道化", 2, 1, "C", [kw("速攻"), castSpell(E.pumpSelf(1, 0))])),
  tagged(sor("cm20", "狂想曲", "{2}{U}{R}", "R", spell([E.dmg({ count: "applause", cat: MAD }), E.draw(1)], T.any))),
  tagged(ins("cm39", "台本の書き換え", "{2}{U}", "U", spell([E.counter(0), E.applause(MAD, 1)], T.spell))),
  tagged(ench("cm40", "狂気の仮面", "{1}{U}{R}", "R", [once(castSpell(E.draw(1), undefined, { if: applause(MAD, 4) }))])),
  tagged(sor("cm43", "道化師の帰還", "{1}{U}", "C", spell([E.draw(1), E.applause(MAD, 1)]))),
  tagged(cr("cm35", "仮面職人", "{1}{U}", "眷属・職人", 1, 3, "C", [etb(E.lookTop()), act({ mana: "{3}", tap: true }, E.applause(MAD, 1))])),

  // ================================================================ 【悲劇】のメイン(黒赤の生け贄)
  tagged(ench("cm22", "舞台裏の毒杯", "{B}", "C", [act({ sacSelf: true }, E.pump(-1, -1), T.cre)])),
  tagged(cr("cm23", "身代わり人形", "{1}{B}", "眷属・人形", 2, 1, "C", [act({ sacSelf: true }, [E.lose(1), E.gain(1)])])),
  tagged(cr("cm24", "悲劇の脚本家", "{1}{B}", "眷属・ウィザード", 2, 2, "U", [act({ applause: { cat: TRAGEDY, n: 1 } }, E.draw(1))])),
  tagged(sor("cm25", "血の幕引き", "{1}{B}{R}", "U", modal([["対戦相手はクリーチャー1体を生け贄に捧げる", E.sac()], ["1/1の端役を2体生成する", extra(2)]]))),
  tagged(ench("cm26", "生け贄の舞台", "{2}{B}", "U", [act({ mana: "{1}", sac: {} }, E.draw(1))])),
  tagged(ins("cm27", "終幕の刃", "{B}{R}", "C", spell([E.destroy(), E.applause(TRAGEDY, 1)], T.creF({ maxPower: 3 })))),
  tagged(sor("cm28", "端役の群れ", "{2}{B}", "C", spell(extra(3)))),
  tagged(cr("cm29", "黒衣の演出家", "{2}{B}{R}", "眷属・シャーマン", 3, 3, "R", [selfIf(applause(TRAGEDY, 3), 2, 2, ["威迫"]), once(onSacrifice()(E.dmg(1), T.any))])),
  tagged(ins("cm38", "幕引きの一撃", "{2}{B}", "U", spell([E.destroy(), { ...E.draw(1), if: applause(TRAGEDY, 3) }], T.cre))),
  tagged(cr("cm37", "劇場の亡霊", "{3}{B}", "眷属・スピリット", 3, 3, "C", [kw("飛行"), dies(E.applause(TRAGEDY, 2))])),

  // ================================================================ 【喜劇】のメイン(赤の攻撃)
  tagged(sor("cm30", "ザンニの行列", "{2}{R}", "C", spell(zanni(3)))),
  tagged(cr("cm31", "喝采を浴びる剣士", "{1}{R}", "眷属・戦士", 2, 2, "C", [selfIf(applause(COMEDY, 2), 1, 1, ["先制攻撃"])])),
  tagged(ins("cm32", "喜劇の幕開け", "{R}", "C", modal([["あなたのクリーチャー1体は+2/+0", E.pump(2, 0), T.you], ["速攻を持つ1/1のザンニを1体生成する", zanni(1)]]))),
  tagged(sor("cm33", "道化の大騒ぎ", "{3}{R}", "U", spell([E.pumpAll(1, 0, ["速攻"]), E.applause(COMEDY, 1)]))),
  tagged(cr("cm34", "一座の太鼓叩き", "{2}{R}", "眷属・楽士", 2, 3, "U", [act({ applause: { cat: COMEDY, n: 1 } }, E.pumpAll(1, 0))])),
  tagged(cr("cm45", "端役の役者", "{R}", "眷属・役者", 2, 1, "C", [kw("速攻"), selfIf(applause(COMEDY, 2), 1, 0)])),

  // ================================================================ 仮面と劇場(複数の効果)
  tagged(ench("cm41", "悲劇の仮面", "{1}{B}{R}", "R", [once(onSacrifice()([E.lose(1), E.gain(1)]))])),
  tagged(ench("cm42", "喜劇の仮面", "{1}{R}", "U", [endStep(zanni(1, false), undefined, { if: "raid" })])),
  tagged(ench("cm36", "仮面舞踏会", "{2}{U}{B}", "U", [etb([E.draw(2), E.lose(2, "you")]), act({ sacSelf: true }, E.discard(1, "opp"))])),
  tagged(art("cm21", "劇場の幕", "{2}", "C", [etb(E.lookTop()), act({ sacSelf: true }, E.draw(1))])),
  tagged(sor("cm44", "仮面劇場の狂宴", "{1}{U}{B}{R}", "M", modal([
    ["喝采【狂気】を3増やし、1枚引く", [E.applause(MAD, 3), E.draw(1)]],
    ["喝采【悲劇】を3増やし、1枚引く", [E.applause(TRAGEDY, 3), E.draw(1)]],
    ["喝采【喜劇】を3増やし、1枚引く", [E.applause(COMEDY, 3), E.draw(1)]],
  ]))),
  // ================================================================ 座長本人(カーテンコール)
  tagged(cr("cm52", "狂気派の座長 ニコ=フォッリア・ルッチョラ", "{4}{U}{U}{R}{R}", "神・役者", 6, 6, "M", [
    curtainCall(3, MAD, "cm04", "狂気の座長", OV.MAD, 3), kw("飛行", "呪禁"), etb([E.draw(2), E.handBlast({ cat: MAD, div: 4 })]),
  ], { flavor: "「悲劇? 泣き顔って退屈なのよね。喜劇? 笑い声がうるさいだけ。ねえ、もっと狂おしいのを見せて?」" })),
  tagged(cr("cm53", "悲劇派の座長 オッタヴィア・ラ・クリマ", "{5}{B}{B}{B}", "神・役者", 7, 8, "M", [
    curtainCall(3, TRAGEDY, "cm08", "悲劇の歌姫", OV.TRAGEDY, 3), kw("飛行", "絆魂"), etb([E.sac(2), E.lose(3)]), allyDies([E.lose(3), E.gain(3)]),
  ], { flavor: "「あの男の舞台には中身がないわ。筋肉と同じね。あの子の舞台には……そもそも筋書きがないけれど」" })),
  tagged(cr("cm54", "喜劇派の座長 レオーネ・ジョコンド", "{4}{R}{R}{R}", "神・役者", 8, 7, "M", [
    curtainCall(2, COMEDY, "cm12", "一座の花形", OV.COMEDY, 3), kw("速攻", "トランプル"), etb(zanni(3)), lord({ type: "クリーチャー" }, 1, 0, ["トランプル"]), attacks(zanni(1)),
  ], { flavor: "「チビの悪ふざけも、のっぽの辛気くさい涙も、俺の笑いには勝てん! はっはっは!」" })),

  // ================================================================ 眷属と小道具(フレーバーつき)
  tagged(ins("cm46", "ルッチョラの蛍火", "{1}{U}{R}", "U", spell([E.dmg(2), E.applause(MAD, 1)], T.any), { flavor: "ニコが指を鳴らすと、客席に蛍が舞った。誰も火事だとは思わなかった。それも演出のうちだから。" })),
  tagged(cr("cm47", "ニコの落書き小鬼", "{1}{R}", "眷属・小鬼", 2, 1, "C", [kw("速攻"), castSpell(E.pumpSelf(1, 0))], { flavor: "楽屋の壁には、のっぽの女と大男の似顔絵。どちらも鼻が三つある。" })),
  tagged(art("cm48", "ラ・クリマの涙壺", "{1}{B}", "U", [etb(E.lookTop()), act({ sacSelf: true }, E.draw(1))], { flavor: "「この壺には観客の涙を集めているの。あの男の客席では、一滴も集まらなかったけれど」──オッタヴィア" })),
  tagged(cr("cm49", "オッタヴィアの喪服の侍女", "{2}{B}", "眷属・侍女", 2, 3, "C", [dies([E.lose(1), E.gain(1)])], { flavor: "主人の影から生まれ、主人の影のように黙って立つ。泣くのは舞台の上でだけ。" })),
  tagged(sor("cm50", "ジョコンドの大笑い", "{2}{R}", "C", spell([zanni(2), E.pumpAll(1, 0)]), { flavor: "「腹から笑え! 腹筋が割れるまでな!」──レオーネ" })),
  tagged(cr("cm51", "レオーネの力持ち", "{2}{R}", "眷属・戦士", 3, 3, "C", [kw("トランプル")], { flavor: "座長の力こぶから生まれた。本人いわく「悲劇派ののっぽより、俺のほうが背が高く見える」。" })),
];
