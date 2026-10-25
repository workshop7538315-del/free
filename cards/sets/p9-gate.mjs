// 第9弾「秘蔵の門」(新規展開) 3つの単語:奉納・リリース・秘蔵
//   秘蔵庫:メインのデッキとは別に、8枚まで(同名2枚まで)用意する。手札には来ない。
//   リリース召喚 N(素材):素材に指定されたパーマネント(トークンを除く)か「奉納」を持つものを、マナ総量の合計がN以上に
//                  なるように生け贄に捧げ、秘蔵庫からこのクリーチャーをコストを支払わずに戦場に出す(ソーサリーのタイミングで、1ターンに1回)。
//                  素材は種類ごとに違う:神獣=エンチャントかクリーチャー、祖霊=エンチャント、機神=アーティファクト、種類なし=パーマネント。
//                  戦場を離れると秘蔵庫に戻る。
//   奉納 N(種類):リリース召喚のために生け贄に捧げるとき、マナ総量に+Nして数える(種類があれば、その種類のときだけ)。
//   軽いエンチャントは、それ自体がドローやマナを生む。残しておくか、捧げて秘蔵庫を開くかを選ぶ。
import {
  cr, acr, ins, sor, ench, art, kw, spell, etb, dies, attacks, endStep, upkeep, act, mana, once, onSacrifice,
  releaseSummon, offering, modal, gen, T, E, F,
} from "../lib.mjs";

const g = (c) => ({ ...c, tags: [...new Set([...(c.tags ?? []), "秘蔵"])] });
const BEAST = "神獣";
const SPIRIT = "祖霊";
const MACHINE = "機神";
const BEAST_FROM = [{ type: "エンチャント" }, { type: "クリーチャー", minPower: 3 }];
const MACHINE_FROM = [{ type: "アーティファクト" }];
const ANY = [{}];
const soldier = (n) => E.token(n, 1, 1, "W", "人間・兵士");

// ---------------------------------------------------------------- 生成されるカード
/** 供物の灯:{1} のエンチャント、奉納 1(リリースでは2として数える) */
const LAMP = gen("tk-kumotsu", "供物の灯", "{1}", "エンチャント", [offering(1)]);
/** 予備の歯車:{1} のアーティファクト、奉納 1(機神の素材) */
const GEAR = gen("tk-haguruma", "予備の歯車", "{1}", "アーティファクト", [offering(1)]);

export const GATE = [
  // ================================================================ 秘蔵庫:神獣(緑白)
  g(cr("hz01", "若葉の神獣", "{2}{G}{G}", "神獣", 4, 4, "U", [releaseSummon(7, BEAST_FROM), kw("到達"), etb(E.ramp(1))])),
  g(cr("hz02", "白鬣の神獣", "{3}{W}{W}", "神獣", 4, 5, "R", [releaseSummon(8, BEAST_FROM), kw("警戒", "絆魂"), etb(soldier(2))])),
  g(cr("hz03", "天翔ける神獣", "{3}{G}{W}", "神獣", 5, 5, "R", [releaseSummon(9, BEAST_FROM), kw("飛行", "警戒"), attacks(E.countersAll(1))])),
  g(cr("hz04", "大樹の神獣", "{5}{G}{G}", "神獣", 7, 7, "M", [releaseSummon(11, BEAST_FROM), kw("トランプル"), attacks(E.countersAll(1))])),

  // ================================================================ 秘蔵庫:祖霊(白黒)
  g(cr("hz05", "灯守の祖霊", "{2}{W}{B}", "スピリット・祖霊", 3, 3, "U", [releaseSummon(6), kw("飛行"), etb(E.lookTop()), dies(E.draw(1))])),
  g(cr("hz06", "墓守の祖霊", "{3}{B}{B}", "スピリット・祖霊", 4, 4, "U", [releaseSummon(7), kw("威迫"), etb(E.ret("hand"), T.gyCre)])),
  g(cr("hz07", "審きの祖霊", "{4}{W}{W}", "スピリット・祖霊", 4, 5, "R", [releaseSummon(8), kw("飛行"), etb(E.tap(0, true), T.opp)])),
  g(cr("hz08", "万霊の祖", "{5}{W}{B}", "スピリット・祖霊", 6, 6, "M", [releaseSummon(11), kw("飛行", "絆魂"), etb([E.lose(3), E.gain(3)])])),

  // ================================================================ 秘蔵庫:機神(青赤・アーティファクト)
  g(acr("hz09", "歯車の機神", "{4}", "構築物・機神", 3, 3, "U", [releaseSummon(7, MACHINE_FROM), etb(E.draw(1)), dies(E.draw(1))])),
  g(acr("hz10", "雷鳴の機神", "{3}{R}", "構築物・機神", 4, 3, "U", [releaseSummon(8, MACHINE_FROM), kw("速攻"), etb(E.dmg(2), T.any)])),
  g(acr("hz11", "蒼穹の機神", "{4}{U}", "構築物・機神", 4, 4, "R", [releaseSummon(8, MACHINE_FROM), kw("飛行"), etb(E.draw(1))])),
  g(acr("hz12", "終焉の機神", "{8}", "構築物・機神", 8, 8, "M", [releaseSummon(12, MACHINE_FROM), kw("トランプル"), etb(E.dmgAllOpp(3))])),

  // ================================================================ 秘蔵庫:種類なし
  g(cr("hz13", "門の守護者", "{1}{W}", "スピリット", 3, 3, "C", [releaseSummon(4, ANY), kw("先制攻撃")])),
  g(cr("hz14", "黄泉の門番", "{3}{B}", "デーモン", 4, 4, "U", [releaseSummon(7, ANY), kw("威迫"), etb(E.discard(1, "opp")), dies([E.lose(2), E.gain(2)])])),
  g(cr("hz15", "深海の守り神", "{3}{U}", "リバイアサン", 3, 5, "U", [releaseSummon(7, ANY), kw("呪禁"), etb([E.draw(2), E.discard(1)])])),
  g(cr("hz16", "獄炎の鬼神", "{3}{B}{R}", "デーモン", 5, 4, "R", [releaseSummon(8, ANY), kw("速攻", "威迫"), attacks(E.lose(1))])),
  g(cr("hz17", "秘蔵の竜", "{4}{R}{R}", "ドラゴン", 6, 5, "M", [releaseSummon(9, ANY), kw("飛行", "速攻"), etb(E.dmg(3), T.any)])),

  // ================================================================ 奉納:神獣(緑白)
  g(ench("hz18", "神獣の祭壇", "{G}", "C", [offering(1, BEAST), etb(E.lookTop())])),
  g(ench("hz19", "森の供物", "{1}{G}", "C", [offering(1, BEAST), mana("{G}")])),
  g(ench("hz20", "神獣の目覚め", "{1}{G}{W}", "U", [offering(2, BEAST), etb(E.draw(1))])),
  g(cr("hz21", "神獣の巫女", "{1}{G}", "エルフ・クレリック", 1, 2, "C", [offering(1, BEAST), mana("{G}")])),
  g(cr("hz22", "神獣の守り手", "{2}{W}", "人間・クレリック", 2, 3, "C", [offering(1, BEAST), etb(E.gain(2))])),
  g(cr("hz23", "門前の獣", "{2}{G}", "ビースト", 3, 3, "C", [offering(1, BEAST), kw("到達")])),
  g(cr("hz24", "神獣の導き手", "{1}{G}{W}", "人間・ドルイド", 3, 3, "U", [kw("警戒"), etb(E.create(LAMP))])),

  // ================================================================ 奉納:祖霊(白黒)
  g(ench("hz25", "祖霊の灯籠", "{W}", "C", [offering(1, SPIRIT), etb(E.lookTop())])),
  g(ench("hz26", "祖霊の墓碑", "{1}{B}", "C", [offering(1, SPIRIT), act({ sacSelf: true }, [E.draw(1), E.lose(1, "you")])])),
  g(ench("hz27", "魂の供物", "{B}", "C", [offering(1), etb([E.lose(1), E.gain(1)])])),
  g(cr("hz28", "祖霊の巫女", "{1}{W}", "人間・クレリック", 1, 3, "C", [offering(1, SPIRIT), etb(E.lookTop())])),
  g(cr("hz29", "墓所の語り部", "{2}{B}", "ゾンビ", 2, 2, "C", [offering(1, SPIRIT), dies(E.draw(1))])),
  g(cr("hz30", "祖霊の守人", "{2}{W}", "スピリット", 2, 2, "C", [offering(1, SPIRIT), kw("飛行")])),
  g(cr("hz31", "祖霊を呼ぶ者", "{1}{W}{B}", "人間・シャーマン", 2, 3, "U", [kw("絆魂"), once(onSacrifice()(E.create(LAMP)))])),

  // ================================================================ 奉納:機神(青赤)
  g(art("hz32", "機神の設計図", "{U}", "C", [offering(1, MACHINE), etb(E.lookTop())])),
  g(art("hz33", "歯車の祭壇", "{1}{R}", "C", [offering(1, MACHINE), act({ sacSelf: true }, E.dmg(2), T.cre)])),
  g(art("hz34", "機神の起動式", "{1}{U}", "U", [offering(1, MACHINE), etb(E.draw(1))])),
  g(acr("hz35", "機械仕掛けの職工", "{1}{U}", "構築物", 1, 2, "C", [offering(1, MACHINE), etb(E.lookTop())])),
  g(cr("hz36", "火花の技師", "{R}", "人間・職人", 1, 1, "C", [offering(1, MACHINE), dies(E.dmg(1), T.any)])),
  g(cr("hz37", "炉の番人", "{2}{R}", "人間・職人", 3, 2, "C", [offering(1, MACHINE), kw("速攻")])),
  g(cr("hz38", "機神の操者", "{1}{U}{R}", "人間・ウィザード", 2, 2, "U", [etb(E.create(GEAR)), once(onSacrifice()(E.draw(1)))])),

  // ================================================================ 奉納:種類なし(どの秘蔵庫にも)
  g(ench("hz39", "奉納の札", "{1}", "C", [offering(1), etb(E.lookTop())])),
  g(ench("hz40", "秘蔵の鍵", "{2}", "U", [offering(1), etb(E.draw(1))])),
  g(ench("hz41", "門の灯火", "{1}{R}", "C", [offering(1), mana("{R}")])),
  g(ench("hz42", "供物の籠", "{G}", "C", [etb(E.create(LAMP))])),
  g(ench("hz43", "祈りの鈴", "{W}", "C", [offering(1), etb(E.gain(2)), act({ sacSelf: true }, E.gain(2))])),
  g(ench("hz44", "叡智の燭台", "{1}{U}", "C", [offering(1), act({ sacSelf: true }, E.draw(1))])),
  g(cr("hz45", "冥府の運び手", "{2}{B}", "ゾンビ", 2, 2, "C", [offering(1), dies(E.lose(2))])),
  g(cr("hz46", "門前の供え手", "{G}", "エルフ", 1, 1, "C", [offering(1), mana("{G}")])),
  g(acr("hz47", "機神の見張り", "{2}", "構築物", 2, 2, "C", [offering(1, MACHINE), etb(E.lookTop())])),
  g(ench("hz48", "秘蔵の門", "{2}{W}", "M", [offering(2), etb([E.create(LAMP, 2)])])),

  // ================================================================ 生け贄に捧げたとき
  g(cr("hz49", "秘蔵庫の司書", "{2}{U}", "人間・ウィザード", 2, 3, "U", [once(onSacrifice()(E.draw(1)))])),
  g(cr("hz50", "灯籠の番人", "{1}{W}", "人間・兵士", 2, 2, "C", [onSacrifice()(E.countersSelf(1))])),
  g(cr("hz51", "門を開く者", "{1}{B}", "人間・ならず者", 2, 1, "C", [onSacrifice()(E.lose(1))])),
  g(cr("hz52", "供物を喰らう獣", "{3}{G}", "ビースト", 3, 4, "U", [kw("トランプル"), onSacrifice()(E.countersSelf(1))])),
  g(ench("hz53", "開門の祝詞", "{1}{W}{B}", "R", [offering(1), once(onSacrifice()([E.draw(1), E.gain(1)]))])),
  g(ench("hz54", "燃える供物台", "{1}{R}", "U", [onSacrifice()(E.dmgOpp(1))])),

  // ================================================================ 呪文(複数の効果・モード)
  g(sor("hz55", "開門の儀", "{1}{G}{W}", "U", spell([E.create(LAMP, 2), E.draw(1)]))),
  g(sor("hz56", "供物の行列", "{2}{W}", "C", spell([soldier(2), E.create(LAMP)]))),
  g(ins("hz57", "神獣の咆哮", "{2}{G}", "C", modal([["あなたのクリーチャーと相手のクリーチャーが格闘する", E.fight(), [T.you, T.opp]], ["クリーチャー1体に+1/+1カウンターを2個", E.counters(2), T.you]]))),
  g(sor("hz58", "祖霊の裁き", "{2}{W}", "U", spell([E.destroy(), E.gain(2)], T.creF({ minPower: 4 }, "opp")))),
  g(ins("hz59", "祖霊の呪い", "{1}{B}", "C", modal([["クリーチャー1体は-3/-3", E.pump(-3, -3), T.cre], ["墓地のクリーチャー・カードを手札に戻す", E.ret("hand"), T.gyCre]]))),
  g(ins("hz60", "機神の閃光", "{1}{R}", "C", modal([["クリーチャー1体に3点", E.dmg(3), T.cre], ["対戦相手に2点、予備の歯車を生成", [E.dmgOpp(2), E.create(GEAR)]]]))),
  g(ins("hz61", "機神の解析", "{1}{U}", "C", modal([["マナ総量3以下の呪文を打ち消す", E.counter(0), { t: "spell", maxMV: 3 }], ["一番上を見て、1枚引く", [E.lookTop(), E.draw(1)]]]))),
  g(sor("hz62", "秘蔵の目録", "{2}{U}", "U", spell([E.draw(2), E.create(LAMP)]))),
  g(sor("hz63", "黄泉の招き", "{2}{B}", "C", spell([E.ret("hand"), E.create(LAMP)], T.gyCre))),
  g(ins("hz64", "門番の一喝", "{W}", "C", spell([E.tap(0), E.lookTop()], T.opp))),

  // ================================================================ 効果が2つ以上ある各色のクリーチャー
  g(cr("hz65", "光の巡礼者", "{1}{W}", "人間・クレリック", 2, 1, "C", [kw("飛行"), etb(E.gain(2))])),
  g(cr("hz66", "門の潮読み", "{2}{U}", "人間・ウィザード", 1, 3, "C", [etb([E.draw(2), E.discard(1)])])),
  g(cr("hz67", "墓荒らしの鬼", "{2}{B}", "デーモン", 3, 2, "C", [etb(E.discard(1, "opp")), dies(E.gain(2))])),
  g(cr("hz68", "炎の門番", "{2}{R}", "人間・戦士", 3, 2, "C", [kw("速攻"), etb(E.dmg(1), T.opp)])),
  g(cr("hz69", "苔の門番", "{1}{G}", "ビースト", 2, 3, "C", [kw("到達"), etb(E.lookTop())])),
  g(cr("hz70", "門の大守護", "{3}{W}", "人間・騎士", 3, 4, "U", [kw("警戒"), etb(soldier(1)), endStep(E.gain(1))])),
  g(cr("hz71", "深淵の書記官", "{3}{U}", "スピリット", 2, 4, "U", [kw("飛行"), etb(E.draw(1)), upkeep(E.lookTop())])),
  g(cr("hz72", "黄泉の使い", "{3}{B}", "ゾンビ", 3, 3, "U", [kw("威迫"), etb(E.ret("hand"), T.gyCre)])),
  g(cr("hz73", "炎門の巨人", "{4}{R}", "巨人", 5, 4, "U", [kw("トランプル"), etb(E.dmg(2), T.opp)])),
  g(cr("hz74", "森門の巨獣", "{4}{G}", "ビースト", 5, 5, "U", [kw("到達"), etb(E.ramp(1))])),
  g(cr("hz75", "秘蔵庫の主", "{2}{W}{B}", "スピリット・祖霊", 3, 3, "R", [kw("飛行"), offering(2, SPIRIT), once(onSacrifice()(E.draw(1)))])),
  g(cr("hz76", "門を統べる者", "{2}{U}{R}", "人間・ウィザード", 3, 3, "M", [kw("飛行"), etb(E.create(GEAR, 2)), once(onSacrifice()(E.dmg(2), T.any))])),
];

void sor;
void F;
void attacks;
