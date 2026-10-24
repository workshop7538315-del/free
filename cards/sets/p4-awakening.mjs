// 第4弾「紋章の目覚め」(新規展開) 3つの単語:大地・刻印・目覚め
//   紋章:このカードがマナゾーンにあるあいだだけ働く能力。チャージしたカードが力を持つ。
//   顕現 N:マナゾーンからマナ総量N以下のクリーチャー・カードを1枚戦場に出す。
//   既存の輪廻(死亡するとマナゾーンへ)・還元・略奪・鼓動と組み合わさる。
import { cr, acr, ins, sor, art, kw, spell, etb, upkeep, castSpell, allyDies, manaEnter, stat, lord, scale, discount, crest, free, mana, T, E, F, count, tagAll } from "../lib.mjs";

const crests = count("crests");
const all = { type: "クリーチャー" };

export const AWAKENING = tagAll("紋章", [
  // 白:守りと展開
  cr("aw01", "刻印の守り手", "{1}{W}", "人間・兵士", 2, 2, "U", [crest(lord(all, 0, 1, undefined, false))]),
  cr("aw02", "目覚めの聖騎士", "{2}{W}{W}", "人間・騎士", 3, 3, "R", [kw("先制攻撃"), etb(E.manifest(2))]),
  cr("aw03", "大地の祈祷師", "{W}", "人間・クレリック", 1, 2, "C", [crest(upkeep(E.gain(1)))]),
  ins("aw04", "刻印の盾", "{W}", "C", [spell(E.pump(0, 2, ["破壊不能"]), T.you), crest(lord(F.human, 1, 0, undefined, false))]),
  sor("aw05", "目覚めの軍勢", "{3}{W}", "U", spell([E.token(2, 1, 1, "W", "人間・兵士"), E.token(crests, 1, 1, "W", "人間・兵士")])),
  cr("aw06", "刻印の大天使", "{4}{W}{W}", "天使", 5, 5, "M", [kw("飛行"), crest(lord(all, 1, 0, undefined, false))]),
  // 青:呪文と手札
  cr("aw07", "刻印の書記", "{1}{U}", "人間・ウィザード", 1, 3, "C", [crest(castSpell(E.lookTop()))]),
  cr("aw08", "目覚めの賢者", "{2}{U}", "マーフォーク・ウィザード", 2, 2, "U", [etb(E.draw(1)), crest(upkeep(E.lookTop()))]),
  ins("aw09", "刻印の渦", "{1}{U}{U}", "U", [spell(E.counter(), T.spell), crest(discount(F.spell, 1))]),
  cr("aw10", "夢見る大海蛇", "{5}{U}", "海蛇", 5, 6, "R", [kw("呪禁"), crest(upkeep(E.draw(1)))]),
  sor("aw11", "潮の顕現", "{3}{U}", "U", spell([E.manifest(3), E.draw(1)])),
  cr("aw12", "マナ紋の幻術師", "{U}{U}", "人間・ウィザード", 2, 2, "U", [kw("飛行"), crest(lord(F.wizard, 1, 1, undefined, false))]),
  // 黒:死と輪廻
  cr("aw13", "墓刻の死霊", "{1}{B}", "スピリット", 2, 1, "C", [kw("輪廻"), crest(allyDies(E.lose(1)))]),
  ins("aw14", "刻印の呪い", "{1}{B}", "C", [spell(E.pump(-2, -2), T.cre), crest(allyDies(E.gain(1)))]),
  cr("aw15", "目覚める屍", "{3}{B}", "ゾンビ", 3, 3, "U", [kw("輪廻"), etb(E.manifest(2))]),
  cr("aw16", "冥刻の王", "{4}{B}{B}", "デーモン", 5, 5, "R", [kw("飛行"), crest(allyDies([E.draw(1), E.lose(1, "you")]))]),
  sor("aw17", "墓所の目覚め", "{2}{B}", "U", spell([E.ret("mana"), E.draw(1)], T.gy)),
  cr("aw18", "紋章喰らい", "{2}{B}", "ホラー", 2, 3, "U", [etb(E.veilOpp(1, { crest: true }))]),
  // 赤:速さと炎
  cr("aw19", "刻印の火花", "{R}", "ゴブリン", 1, 1, "C", [kw("速攻"), crest(castSpell(E.dmgOpp(1)))]),
  ins("aw20", "灼刻の一撃", "{1}{R}", "C", spell(E.dmg(3), T.cre)),
  cr("aw21", "刻印の狂戦士", "{2}{R}", "人間・狂戦士", 2, 2, "U", [kw("速攻"), scale(crests, 1, 0)]),
  cr("aw22", "炎刻の竜", "{3}{R}{R}", "ドラゴン", 4, 4, "R", [kw("飛行"), crest(upkeep(E.dmgOpp(1)))]),
  sor("aw23", "炎の顕現", "{1}{R}", "U", spell(E.manifest(3, true))),
  cr("aw24", "刻印の鍛冶師", "{1}{R}", "人間・戦士", 2, 1, "C", [kw("速攻"), crest(lord({ sub: "戦士" }, 1, 0, undefined, false))]),
  // 緑:マナと顕現
  sor("aw25", "大地の目覚め", "{2}{G}", "U", spell([E.ramp(1), E.manifest(2)])),
  cr("aw26", "刻印の巨獣", "{4}{G}{G}", "ビースト", 6, 6, "R", [kw("トランプル"), crest(lord(all, 0, 0, ["トランプル"], false))]),
  cr("aw27", "根刻の精", "{G}", "エルフ・ドルイド", 1, 1, "U", [crest(stat({ s: "extraCharge", n: 1 }))]),
  cr("aw28", "刻印の大樹", "{3}{G}", "ツリーフォーク", 2, 5, "U", [kw("到達"), crest(manaEnter(E.gain(1)))]),
  cr("aw29", "顕現の導き手", "{3}{G}", "エルフ・シャーマン", 3, 3, "U", [etb(E.manifest(3))]),
  cr("aw30", "刻印の狼", "{1}{G}", "狼", 1, 1, "C", [scale(crests, 1, 1)]),
  // 多色
  cr("aw31", "紋章の守護者", "{1}{G}{W}", "人間・ドルイド", 3, 3, "U", [kw("警戒"), etb(E.manifest(2))]),
  cr("aw32", "刻印の司書", "{U}{B}", "人間・ウィザード", 1, 3, "U", [crest(upkeep(E.mill(2, "opp")))]),
  cr("aw33", "炎樹の紋章獣", "{R}{G}", "エレメンタル", 3, 3, "C", [kw("速攻"), crest(manaEnter(E.dmgOpp(1)))]),
  cr("aw34", "夜明けの刻印鳥", "{W}{U}", "鳥", 2, 2, "C", [kw("飛行"), crest(lord(all, 0, 0, ["警戒"], false))]),
  cr("aw35", "冥炎の紋章鬼", "{B}{R}", "デーモン", 3, 2, "U", [kw("威迫"), crest(allyDies(E.dmgOpp(1)))]),
  cr("aw36", "五刻の王", "{W}{U}{B}{R}{G}", "人間・王", 4, 4, "M", [kw("飛行", "警戒"), crest(lord(all, 1, 1, undefined, false))]),
  cr("aw37", "顕現の大司祭", "{2}{G}{U}", "マーフォーク・シャーマン", 3, 4, "R", [etb(E.manifest(4))]),
  // 欠色
  art("aw38", "刻印の石版", "{2}", "C", [mana("any"), crest(upkeep(E.lookTop()))]),
  acr("aw39", "古代の紋章機", "{4}", "構築物", 3, 3, "U", [crest(lord(F.artifact, 1, 0, undefined, false))]),
  acr("aw40", "目覚めし巨神", "{7}", "ゴーレム", 7, 7, "R", [kw("トランプル"), free("fullBloom")]),
]);
