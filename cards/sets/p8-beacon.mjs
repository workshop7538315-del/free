// 第8弾「逆襲の烽火」(既存カード強化) 3つの単語:底力・継戦・反撃
//   総当たり戦で弱かったデッキ(装備・呪文・生け贄・赤白・緑系・エルフ・カウンター・青赤)に、
//   そのアーキタイプでしか働かない「エンジン」を配る。主に手札(ドロー・生成)と、飛行への答え。
//   強襲:このターン、クリーチャー2体以上で攻撃したなら / 連唱:このターン、インスタントかソーサリーを2つ以上唱えたなら
//   生成:カードリストにないカードを手札に加える(チャージできない)
//   新規カードはすべて basedOn で元のカードとの関係を記録する。
import {
  cr, acr, ins, sor, ench, equipment, kw, spell, etb, dies, attacks, endStep, upkeep, charge, castSpell, allyDies, allyEnter,
  act, stat, lord, selfIf, discount, mana, control, armed, basedOn, once, onSacrifice, modal, gen, T, E, F,
} from "../lib.mjs";

const EQ = { sub: "装備品" };
const BIG = { type: "クリーチャー", minPower: 4 };
const tag = (t, c) => ({ ...c, tags: [...new Set([...(c.tags ?? []), t])] });
const raid = (ab) => ({ ...ab, if: "raid" });
const chain = (ab) => ({ ...ab, if: "chain" });
const opp = (e) => ({ ...e, unless: "raid" });
const soldier = (n, haste = false) => E.token(n, 1, 1, "W", "人間・兵士", haste ? ["速攻"] : undefined);
const FLYER = { t: "creature", who: "opp", flying: true };

// ---------------------------------------------------------------- 生成されるカード
const SPARK = gen("tk-hinoko", "火の粉", "{R}", "インスタント", spell(E.dmg(1), T.any));
const BLADE = gen("tk-kanibu", "簡易の剣", "{1}", "アーティファクト", [stat({ s: "auraBuff", p: 1, t: 1 }), { a: "equip", cost: "{1}" }], { subtype: "装備品" });

export const BEACON = [
  // ================================================================ 装備(赤白・欠色)
  tag("装備", basedOn(cr("cb01", "鍛冶場の徒弟長", "{1}{W}", "人間・職人", 2, 2, "U", [once(allyEnter(EQ)(E.draw(1)))]), "eqp09", "サポート")),
  tag("装備", basedOn(cr("cb02", "先陣の剣士", "{1}{R}", "人間・戦士", 2, 2, "C", [once(attacks(E.draw(1), undefined, { if: control(EQ, 1) }))]), "eqp13", "リメイク")),
  tag("装備", basedOn(equipment("cb03", "継承の刃", "{1}", "C", "{2}", { p: 1, t: 1 }, [etb(E.draw(1))]), "eqp01", "強化版")),
  tag("装備", basedOn(equipment("cb04", "聖騎士の大盾", "{2}", "U", "{1}", { p: 0, t: 3, kw: ["警戒"] }, [etb(soldier(1))]), "eqp02", "強化版")),
  tag("装備", basedOn(equipment("cb05", "炎の籠手", "{2}", "U", "{2}", { p: 1, t: 0, kw: ["速攻", "先制攻撃"] }), "eqp05", "リメイク")),
  tag("装備", basedOn(cr("cb06", "武具の継承者", "{2}{W}", "人間・騎士", 3, 3, "R", [etb(E.tutor(EQ))]), "eqp14", "サポート")),
  tag("装備", basedOn(cr("cb07", "鍛冶神の使徒", "{R}{W}", "人間・騎士", 2, 2, "U", [kw("先制攻撃"), selfIf(control(EQ, 1), 1, 1), once(allyEnter(EQ)(E.draw(1)))]), "eqp14", "強化版")),
  tag("装備", basedOn(cr("cb08", "剣舞の達人", "{2}{R}{W}", "人間・戦士", 3, 3, "R", [kw("先制攻撃"), attacks(E.pumpAll(1, 0), undefined, { if: control(EQ, 1) })]), "eqp14", "リメイク")),
  tag("装備", basedOn(ins("cb09", "鉄の祝福", "{W}", "C", modal([["あなたのクリーチャー1体は+2/+2", E.pump(2, 2), T.you], ["墓地の装備品を手札に戻す", E.ret("hand"), T.gyF(EQ)]])), "eqp11", "サポート")),
  tag("装備", basedOn(sor("cb10", "鋼の行進", "{3}{W}", "U", spell([{ ...E.pumpAll(1, 1, ["警戒"]), unless: control(EQ, 1) }, { ...E.pumpAll(2, 1, ["警戒"]), if: control(EQ, 1) }, E.draw(1)])), "eqp11", "サポート")),
  tag("装備", basedOn(acr("cb11", "武具庫の番人", "{3}", "構築物", 2, 4, "C", [etb(E.create(BLADE))]), "eqp15", "サポート")),
  tag("装備", basedOn(equipment("cb12", "王者の継承", "{4}", "M", "{3}", { p: 3, t: 3, kw: ["トランプル"] }, [etb(E.draw(1))]), "eqp15", "強化版")),

  // ================================================================ 呪文(青赤):連唱と「火の粉」の生成
  tag("呪文", basedOn(cr("cb13", "火の粉の術士", "{1}{R}", "人間・ウィザード", 1, 2, "C", [once(castSpell(E.create(SPARK)))]), "spl07", "リメイク")),
  tag("呪文", basedOn(cr("cb14", "連唱の学徒", "{U}", "人間・ウィザード", 1, 2, "C", [castSpell(E.lookTop()), selfIf("chain", 1, 1, ["飛行"])]), "spl01", "強化版")),
  tag("呪文", basedOn(sor("cb15", "二重詠唱", "{1}{U}{R}", "U", spell([E.draw(2), { ...E.dmgOpp(2), if: "chain" }])), "spl14", "強化版")),
  tag("呪文", basedOn(ins("cb16", "稲妻の連詠", "{R}", "C", spell([{ ...E.dmg(2), unless: "chain" }, { ...E.dmg(3), if: "chain" }], T.any)), "r002", "リメイク")),
  tag("呪文", basedOn(ins("cb17", "思考の火花", "{1}{U}", "C", modal([["2枚引いて1枚捨てる", [E.draw(2), E.discard(1)]], ["マナ総量2以下の呪文を打ち消す", E.counter(0), { t: "spell", maxMV: 2 }]])), "spl02", "強化版")),
  tag("呪文", basedOn(cr("cb18", "嵐の継承者", "{2}{U}{R}", "人間・ウィザード", 3, 3, "R", [kw("飛行"), once(castSpell(E.create(SPARK))), castSpell(E.dmgOpp(1), undefined, { if: "chain" })]), "spl13", "強化版")),
  tag("呪文", basedOn(sor("cb19", "呪文の反響", "{2}{R}", "U", spell(E.create(SPARK, 3))), "spl10", "サポート")),
  tag("呪文", basedOn(ench("cb20", "炎と知の書", "{1}{U}{R}", "R", [once(castSpell(E.draw(1), undefined, { if: "chain" })), castSpell(E.lookTop())]), "spl24", "サポート")),
  tag("呪文", basedOn(ins("cb21", "渦巻く知恵", "{2}{U}", "C", spell([E.draw(2), { ...E.create(SPARK), if: "chain" }])), "u007", "強化版")),
  tag("呪文", basedOn(cr("cb22", "炎術の見習い", "{R}", "人間・ウィザード", 1, 1, "C", [kw("速攻"), castSpell(E.pumpSelf(1, 0))]), "spl19", "強化版")),
  tag("呪文", basedOn(sor("cb23", "雷火の嵐", "{3}{U}{R}", "U", spell([E.dmgAllOpp(2), { ...E.draw(2), if: "chain" }])), "spl22", "リメイク")),
  tag("呪文", basedOn(cr("cb24", "呪文喰いの竜", "{4}{R}", "ドラゴン", 4, 4, "R", [kw("飛行"), etb(E.create(SPARK, 2))]), "spl11", "リメイク")),

  // ================================================================ 生け贄(黒赤)
  tag("生け贄", basedOn(cr("cb25", "贄の祭壇守", "{1}{B}", "人間・クレリック", 2, 2, "U", [once(onSacrifice()(E.draw(1)))]), "ari02", "サポート")),
  tag("生け贄", basedOn(ench("cb26", "血の祭具", "{B}", "C", [act({ sacSelf: true }, [E.draw(1), E.lose(1, "you")])]), "ari01", "リメイク")),
  tag("生け贄", basedOn(cr("cb27", "爆ぜる信者", "{R}", "人間・狂信者", 1, 1, "C", [dies(E.dmg(1), T.any)]), "ari06", "強化版")),
  tag("生け贄", basedOn(cr("cb28", "屍の献上者", "{2}{B}", "ゾンビ", 2, 2, "C", [act({ sac: {} }, E.countersSelf(1))]), "ari03", "リメイク")),
  tag("生け贄", basedOn(sor("cb29", "冥炎の儀式", "{1}{B}{R}", "U", modal([["対戦相手はクリーチャー1体を生け贄に捧げる", E.sac()], ["2/2のゾンビを2体生成する", E.token(2, 2, 2, "B", "ゾンビ")]])), "ari16", "リメイク")),
  tag("生け贄", basedOn(cr("cb30", "魂の取引人", "{B}{R}", "人間・ならず者", 2, 2, "U", [once(allyDies(E.draw(1)))]), "ari11", "強化版")),
  tag("生け贄", basedOn(cr("cb31", "骨の山の主", "{3}{B}", "ゾンビ", 3, 3, "U", [etb(E.token(2, 2, 2, "B", "ゾンビ"))]), "ari15", "強化版")),
  tag("生け贄", basedOn(cr("cb32", "生け贄の大司祭", "{2}{B}{R}", "人間・クレリック", 3, 3, "R", [act({ sac: {} }, E.dmg(2), T.any), onSacrifice()(E.gain(1))]), "ari02", "強化版")),
  tag("生け贄", basedOn(ench("cb33", "灰の誓約", "{1}{R}", "C", [act({ sacSelf: true }, E.dmg(2), T.cre)]), "ari07", "サポート")),
  tag("生け贄", basedOn(ench("cb34", "死の契約書", "{2}{B}", "U", [onSacrifice()([E.lose(1), E.gain(1)])]), "ari12", "サポート")),

  // ================================================================ 赤白・強襲
  basedOn(cr("cb35", "鬨の声の伝令", "{1}{R}", "人間・兵士", 2, 1, "C", [kw("速攻"), raid(endStep(E.draw(1)))]), "m022", "サポート"),
  basedOn(cr("cb36", "先陣の旗持ち", "{1}{W}", "人間・兵士", 2, 2, "C", [raid(attacks(E.pumpAll(1, 0)))]), "w017", "リメイク"),
  basedOn(ench("cb37", "烽火の戦旗", "{R}{W}", "R", [raid(endStep(E.draw(1)))]), "m005", "サポート"),
  basedOn(sor("cb38", "逆襲の号令", "{2}{R}{W}", "U", spell([soldier(2, true), E.pumpAll(1, 0)])), "rk26", "リメイク"),
  basedOn(cr("cb39", "反撃の騎士", "{2}{W}", "人間・騎士", 3, 2, "C", [kw("先制攻撃"), raid(attacks(E.gain(2)))]), "trb15", "強化版"),
  basedOn(cr("cb40", "底力の戦士", "{2}{R}", "人間・戦士", 2, 2, "U", [selfIf("raid", 2, 0, ["トランプル"])]), "r012", "リメイク"),
  basedOn(ins("cb41", "戦場の鍛錬", "{R}", "C", modal([["クリーチャー1体は+2/+0と先制攻撃", E.pump(2, 0, ["先制攻撃"]), T.you], ["クリーチャー1体に2点", E.dmg(2), T.cre]])), "r011", "リメイク"),
  basedOn(ins("cb42", "継戦の誓い", "{W}", "C", modal([["あなたのクリーチャー1体は+1/+3", E.pump(1, 3), T.you], ["1/1の兵士を生成し、2点のライフを得る", [soldier(1), E.gain(2)]]])), "w013", "サポート"),

  // ================================================================ 赤(ゴブリン・マナ武装)
  tag("部族", basedOn(cr("cb43", "ゴブリンの烽火番", "{R}", "ゴブリン", 1, 1, "C", [kw("速攻"), raid(endStep(E.token(1, 1, 1, "R", "ゴブリン")))]), "trb03", "サポート")),
  tag("部族", basedOn(cr("cb44", "ゴブリンの戦太鼓", "{2}{R}", "ゴブリン・戦士", 2, 2, "U", [lord(F.goblin, 1, 0, ["速攻"]), raid(attacks(E.dmgOpp(1)))]), "trb01", "強化版")),
  tag("マナ武装", basedOn(ench("cb45", "烈火の覚醒", "{1}{R}", "U", [endStep(E.draw(1), undefined, { if: armed("R", 5) })]), "arm14", "サポート")),
  basedOn(cr("cb46", "炎嵐の大戦士", "{3}{R}{R}", "人間・戦士", 5, 4, "R", [kw("速攻"), raid(attacks(E.dmgAllOpp(1)))]), "r005", "強化版"),

  // ================================================================ 緑(大型・エルフ・飛行への答え)
  basedOn(cr("cb47", "群れの語り部", "{3}{G}", "エルフ・シャーマン", 3, 3, "U", [allyEnter(BIG)(E.draw(1))]), "g021", "サポート"),
  basedOn(ins("cb48", "空裂きの蔦", "{G}", "C", spell(E.dmg(4), FLYER)), "m026", "リメイク"),
  basedOn(sor("cb49", "大地の底力", "{2}{G}", "C", modal([["マナを1枚増やし、1枚引く", [E.ramp(1), E.draw(1)]], ["あなたのクリーチャーと相手のクリーチャーが格闘する", E.fight(), [T.you, T.opp]]])), "g004", "リメイク"),
  basedOn(cr("cb50", "森の継承者", "{1}{G}", "エルフ・戦士", 2, 2, "C", [etb(E.draw(1), undefined, { if: control(BIG, 1) })]), "trb06", "サポート"),
  basedOn(ench("cb51", "巨獣の咆哮", "{2}{G}", "U", [lord(BIG, 0, 0, ["トランプル", "到達"], false), allyEnter(BIG)(E.gain(2))]), "g011", "サポート"),
  basedOn(cr("cb52", "苔むした大熊", "{2}{G}", "熊", 3, 3, "C", [kw("到達"), charge(E.lookTop())]), "g002", "強化版"),
  tag("部族", basedOn(cr("cb53", "エルフの語り部", "{1}{G}", "エルフ・シャーマン", 1, 2, "U", [once(allyEnter(F.elf)(E.draw(1)))]), "trb05", "サポート")),
  tag("部族", basedOn(sor("cb54", "エルフの大合唱", "{2}{G}{G}", "R", spell([E.token(3, 1, 1, "G", "エルフ・戦士"), E.draw(1)])), "trb07", "強化版")),
  basedOn(cr("cb55", "樹上の弓兵", "{2}{G}", "エルフ・射手", 2, 3, "C", [kw("到達"), etb(E.dmg(2), FLYER)]), "g010", "強化版"),
  basedOn(cr("cb56", "原野の継承者", "{4}{G}{G}", "ビースト", 6, 6, "R", [kw("トランプル"), etb([E.duelSelf(), E.draw(1)], T.opp)]), "g012", "強化版"),
  basedOn(ins("cb57", "緑の底力", "{G}", "C", modal([["クリーチャー1体は+3/+3", E.pump(3, 3), T.you], ["クリーチャー1体に+1/+1カウンターを2個", E.counters(2), T.you]])), "g009", "強化版"),
  tag("マナ武装", basedOn(ench("cb58", "大地の継承", "{2}{G}", "U", [upkeep(E.draw(1), undefined, { if: armed("G", 5) })]), "arm20", "サポート")),
  tag("マナ武装", basedOn(cr("cb59", "緑の巨躯", "{3}{G}{G}", "ビースト", 5, 5, "U", [selfIf(armed("G", 5), 2, 2, ["トランプル"]), etb(E.lookTop())]), "arm17", "リメイク")),
  basedOn(ins("cb60", "赤緑の猛攻", "{R}{G}", "U", modal([["飛行を持つクリーチャー1体に3点", E.dmg(3), FLYER], ["あなたのクリーチャー1体は+2/+2とトランプル", E.pump(2, 2, ["トランプル"]), T.you]])), "m012", "サポート"),
  basedOn(cr("cb61", "大地揺らしの継承竜", "{3}{R}{G}", "ドラゴン", 5, 5, "R", [kw("飛行"), etb(E.dmg(3), FLYER)]), "m013", "強化版"),
  basedOn(cr("cb62", "群れの継承者", "{1}{G}{W}", "人間・兵士", 3, 3, "U", [kw("警戒"), raid(attacks(soldier(1)))]), "m014", "強化版"),
  basedOn(ench("cb63", "森と光の祝福", "{G}{W}", "R", [raid(endStep(E.countersAll(1)))]), "m015", "サポート"),

  // ================================================================ カウンター(黒緑)
  tag("カウンター", basedOn(cr("cb64", "不屈の若熊", "{1}{G}", "熊", 2, 2, "C", [kw("不屈"), etb(E.lookTop())]), "ctr03", "強化版")),
  tag("カウンター", basedOn(cr("cb65", "不死の継承者", "{1}{B}{G}", "ゾンビ・エルフ", 2, 2, "U", [kw("不屈"), once(allyDies(E.draw(1)))]), "ctr15", "サポート")),
  tag("カウンター", basedOn(sor("cb66", "群れの大成長", "{3}{G}{G}", "R", spell([E.countersAll(2), E.draw(1)])), "ctr04", "強化版")),
  tag("カウンター", basedOn(cr("cb67", "苔の大古老", "{3}{G}", "ツリーフォーク", 2, 5, "U", [kw("到達"), etb(E.counters(2), T.you)]), "ctr06", "強化版")),

  // ================================================================ 各色のモード呪文・複数の能力
  basedOn(sor("cb68", "逆襲の烽火", "{2}{R}", "R", modal([["対戦相手の各クリーチャーに2点", E.dmgAllOpp(2)], ["速攻を持つ1/1の兵士を3体生成する", soldier(3, true)]])), "r016", "リメイク"),
  basedOn(ins("cb69", "継戦の構え", "{1}{W}", "C", modal([["クリーチャー1体は+0/+3と破壊不能", E.pump(0, 3, ["破壊不能"]), T.you], ["1/1の兵士を2体生成する", soldier(2)]])), "eqp16", "サポート"),
  basedOn(ins("cb70", "黒の反撃", "{1}{B}", "C", modal([["クリーチャー1体は-2/-2", E.pump(-2, -2), T.cre], ["対戦相手は手札を1枚捨てる", E.discard(1, "opp")]])), "arm10", "リメイク"),
  basedOn(ins("cb71", "青の継戦", "{1}{U}", "C", modal([["ライブラリーの一番上を見て、1枚引く", [E.lookTop(), E.draw(1)]], ["クリーチャー1体を手札に戻す", E.bounce(0), T.cre]])), "spl06", "リメイク"),
  basedOn(ins("cb72", "反撃の狼煙", "{R}", "C", spell([{ ...E.dmg(1), unless: "raid" }, { ...E.dmg(3), if: "raid" }], T.any)), "r008", "強化版"),
  basedOn(ins("cb73", "群れの反撃", "{1}{G}", "C", spell([E.counters(1, 0), E.bite()], [T.you, T.opp])), "g015", "強化版"),
  tag("装備", basedOn(cr("cb74", "継戦の鍛冶屋", "{1}{R}{W}", "人間・職人", 2, 3, "U", [etb(E.create(BLADE)), once(allyEnter(EQ)(E.dmgOpp(1)))]), "eqp12", "強化版")),
  basedOn(cr("cb75", "炎樹の継承者", "{2}{R}{G}", "エレメンタル", 4, 3, "U", [kw("速攻", "トランプル"), raid(endStep(E.draw(1)))]), "m012", "強化版"),
  basedOn(cr("cb76", "先陣の大旗手", "{3}{R}{W}", "人間・兵士", 4, 4, "M", [kw("速攻"), attacks(soldier(1, true)), once(raid(attacks(E.draw(1))))]), "w017", "強化版"),
];

// 再録:弱いデッキで使いやすい既存カード(IDもデータも変わらない)
export const BEACON_REPRINTS = ["r002", "g004", "eqp08", "spl12", "ari12", "trb05", "ctr04", "m026"];

void ins;
void mana;
void discount;
void opp;
void chain;
void upkeep;
