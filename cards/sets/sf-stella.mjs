// 第15弾 ― Stella Facet(韓国をモチーフにした、アイドル+ソシャゲのパック)
//
//   オーディションで練習生(トークン)を生まれさせ、プロデュースで秘蔵庫のレッスン(両面の装備品)をつける。
//   レッスンの条件を満たすと、レッスンは裏返って練習生に重なり、練習生は名前のついたアイドルになる。
//   アイドルの組み合わせで「グループ活動」が働く。切札は、3人そろうと強い《フィナーレ・シャイン》。
//
//   Stella Facet:ミニー(ダンス・赤)、ハル(ボーカル・青)、セラ(ビジュアル・白)。
//   「ありふれたトークンたちから磨き上げられた存在」。
import { cr, acr, ins, sor, art, ench, kw, spell, etb, dies, attacks, upkeep, endStep, castSpell, lifeGain, duelWin, secondDraw, once, stat, mana, act, lord, discount, equipment, T, E, E15, iff, idolLesson, gen, legend, cardText } from "../lib.mjs";

const tag = (t) => (c) => ({ ...c, tags: [...new Set([...(c.tags ?? []), t])] });
const SF = tag("アイドル");
const MIN = (c) => tag("ミニー")(SF(c));
const HAL = (c) => tag("ハル")(SF(c));
const SER = (c) => tag("セラ")(SF(c));

// ---------------------------------------------------------------- 生成専用
const trainee = (id, name, color, kws = []) => {
  const c = { id, name, cost: "", type: "クリーチャー", subtype: "人間・練習生", power: 2, toughness: 2, rarity: "トークン", abilities: kws.length ? kw(...kws) : [], tokenColor: color };
  return { ...c, text: cardText(c) };
};
export const TRAINEES = {
  Da: trainee("sfg1", "練習生(ダンス)", "R"),
  Vo: trainee("sfg2", "練習生(ボーカル)", "U"),
  Vi: trainee("sfg3", "練習生(ビジュアル)", "W"),
};
const GOLD = gen("tk-ougon", "黄金", "{0}", "アーティファクト", [{ a: "mana", produce: ["any"], sacSelf: true }], { pile: true });
const GOODNIGHT = gen("sfg4", "おやすみなさい…", "{0}", "インスタント", [spell(E.counter(), T.spell)]);
const AUD = (n = 1) => E15.audition(TRAINEES, n);
const BS = E15.backstage();

// ---------------------------------------------------------------- アイドル(レッスンの裏面)
const idol = (id, name, song, sub, p, t, abilities, flavor) => ({ ...legend(cr(id, name, "{0}", `${sub}・アイドル`, p, t, "M", abilities, { flavor })), song });

const MINNIE1 = idol("sf01b", "躍る星 ミニー", "ファセット・シャイン", "ゴブリン", 4, 3,
  [kw("速攻"), attacks(E.pumpSelf({ count: "facetPower" }, { count: "facetPower" }))],
  "「いっくよー! 全力で踊るから、ちゃんと見ててね!」");
const HARU1 = idol("sf02b", "囁く星 ハル", "ファセット・シャイン", "スピリット", 3, 4,
  [kw("飛行"), castSpell([E.draw(1), E.pumpSelf(1, 1)])],
  "ささやくような声なのに、客席のいちばん奥まで届く。");
const SERA1 = idol("sf03b", "輝く星 セラ", "ファセット・シャイン", "人間", 4, 5,
  [kw("警戒"), upkeep([E.create(GOLD), E.pumpSelf({ count: "gold" }, { count: "gold" }), E.pumpSelf({ count: "facetCount" }, { count: "facetCount" })])],
  "「皆さま、ごきげんよう。今宵もわたくしたちの舞台へ」");
const MINNIE2 = idol("sf04b", "ごちそうさまでした! ミニー", "おかわり!アンコール", "ゴブリン", 5, 4,
  [kw("速攻", "絆魂"), etb([E.dmg(2), E.countersSelf(1)], T.any), { a: "trigger", on: "hitPlayer", effects: [E.dmg(2), E.countersSelf(1)], targets: [T.any] }],
  "「おかわり! ……え、もう3杯目? まだまだいけるよ!」");
const HARU2 = idol("sf05b", "眠りの歌姫 ハル", "星のささやき", "スピリット", 3, 5,
  [kw("飛行"), etb(E.create(GOODNIGHT)), secondDraw(E.create(GOODNIGHT))],
  "子守唄を歌うと、いちばん先に眠くなるのは本人だ。");
const SERA2 = idol("sf06b", "優雅に、絢爛に セラ", "きらめくティータイム", "人間", 4, 6,
  [kw("警戒", "絆魂"), once(lifeGain([E.create(GOLD), E.pumpSelf({ count: "gold" }, { count: "gold" })]))],
  "紅茶の香りと笑い声。彼女のまわりには、いつも人が集まる。");

// ---------------------------------------------------------------- レッスン(秘蔵庫・両面)
export const LESSONS = [
  MIN(idolLesson("sf01", "アピールの基本", "{R}", "R", "Da", "creature", "duelWin", { p: 2, t: 1, kw: ["速攻"] }, MINNIE1,
    [{ a: "trigger", on: "equippedAttacks", effects: [E15.lessonDuel()], targets: [T.opp] }], { flavor: "最初に教わるのは、目の前の相手に負けないこと。" })),
  HAL(idolLesson("sf02", "イメージの基本", "{U}", "R", "Vo", "spell", "counterBounce", { p: 1, t: 1, kw: ["飛行"] }, HARU1, [], { flavor: "歌う前に、届けたい景色を思い浮かべて。" })),
  SER(idolLesson("sf03", "目線の基本", "{W}", "R", "Vi", "perm", "gold", { p: 2, t: 2, kw: ["警戒"] }, SERA1, [], { flavor: "カメラの向こうの一人ひとりと、目を合わせるように。" })),
  MIN(idolLesson("sf04", "食べた分を取り返してるの!", "{1}{R}", "M", "Da", "creature", "hitPlayer", { p: 2, t: 0 }, MINNIE2, [], { flavor: "レッスン後のごはんは、いつも大盛り。" })),
  HAL(idolLesson("sf05", "私なんて…", "{1}{U}", "M", "Vo", "spell", "secondDraw", { p: 0, t: 2, kw: ["飛行"] }, HARU2, [], { flavor: "自信がないのは、それだけ真剣だから。" })),
  SER(idolLesson("sf06", "皆さまの規範として", "{1}{W}", "M", "Vi", "perm", "gain6", { p: 0, t: 2, kw: ["絆魂"] }, SERA2, [], { flavor: "背筋を伸ばして。見られることも、仕事のうち。" })),
];

// ---------------------------------------------------------------- 切札・共通
export const COMMON = [
  SF(sor("sf07", "フィナーレ・シャイン", "{2}{U}{R}{W}", "M", spell([
    AUD(2),
    E.pumpAll(1, 1),
    iff("groupAll", E.tapAll()),
    iff("groupAll", E.pumpAll(2, 2, ["トランプル"])),
  ]), { flavor: "三つの光がひとつに重なったとき、ステージは星空になる。" })),
  SF(sor("sf08", "運命のオーディション", "{2}", "U", [spell(AUD(2)), BS], { flavor: "番号札を握る手が、少しだけ震えていた。" })),
  SF(sor("sf09", "追加オーディション", "{2}", "C", [spell([AUD(1), E.draw(1)]), BS], { flavor: "「もう一人、見てほしい子がいるんです」" })),
  SF(sor("sf10", "原石を、磨く", "{1}", "C", [spell([E.counters(2), iff("groupVoDa", E.draw(1)), iff("groupDaVi", E.draw(1))], T.you), BS], { flavor: "光るかどうかは、磨いてみるまでわからない。" })),
  SF(ins("sf11", "プロデューサーの采配", "{2}", "C", [spell(E.pump(2, 2, ["呪禁"]), T.you), BS], { flavor: "「大丈夫。今日のステージは、きみのものだ」" })),
  SF(ench("sf12", "初舞台", "{2}", "U", [etb(AUD(1)), lord({ sub: "練習生" }, 1, 1), BS], { flavor: "幕が上がる直前の静けさを、きっと一生忘れない。" })),
  SF(ench("sf13", "三人のステージ", "{3}", "R", [lord({ sub: "アイドル" }, 1, 1), upkeep(AUD(1)), endStep(E.draw(1), undefined, { if: "groupAll" }), BS], { flavor: "三人で立つと、ステージが少し狭く感じる。" })),
  SF(cr("sf14", "事務所の看板猫", "{2}", "猫", 2, 2, "C", [etb(AUD(1)), BS], { flavor: "オーディション会場に、いつのまにか紛れ込んでいる。" })),
  SF(art("sf15", "三人分の楽譜", "{2}", "C", [mana("W", "U", "R"), etb(E.draw(1)), BS], { flavor: "それぞれのパートに、それぞれの書き込み。" })),
  SF(ins("sf16", "二人のハーモニー", "{1}{U}{R}", "U", spell([E.dmg(3), iff("groupVoDa", E.draw(1))], T.cre), { flavor: "息を合わせるのに、言葉はいらない。" })),
  SF(ins("sf17", "視線とステップ", "{R}{W}", "U", spell([E.pump(2, 2), iff("groupDaVi", E.pump(0, 0, ["先制攻撃"])), iff("groupDaVi", E.create(GOLD))], T.you), { flavor: "一歩踏み出すたび、視線がついてくる。" })),
  SF(ins("sf18", "歌と微笑み", "{1}{W}{U}", "U", spell([E.bounce(), iff("groupVoVi", E.gain(3))], T.opp), { flavor: "微笑まれて、歌われて、気づけば席を立っていた。" })),
];

// ---------------------------------------------------------------- ミニー(赤)
export const MINNIE = [
  MIN(cr("sf19", "おにぎりぱんだちゃん", "{1}{R}", "熊・ぬいぐるみ", 2, 2, "C", [dies(AUD(1))], { flavor: "ミニーのお気に入り。ほっぺに、ごはん粒がついている。" })),
  MIN(cr("sf20", "おかわり番長", "{2}{R}", "ゴブリン", 3, 2, "C", [kw("速攻")], { flavor: "社員食堂の主。ミニーとは大盛り仲間。" })),
  MIN(equipment("sf21", "リーダーの腕章", "{1}{R}", "U", "{1}", { p: 2, t: 0 }, [], { flavor: "赤い腕章をつけると、背筋がしゃんと伸びる。" })),
  MIN(equipment("sf22", "すべらないダンスシューズ", "{R}", "C", "{1}", { p: 1, t: 0, kw: ["先制攻撃"] }, [], { flavor: "どんな床でも、思いきりターンできる。" })),
  MIN(ench("sf23", "満腹ライブ", "{2}{R}", "U", [lord({ sub: "アイドル" }, 1, 0, ["速攻"]), etb(AUD(1))], { flavor: "お腹いっぱいのほうが、声が出る。……らしい。" })),
  MIN(ench("sf24", "疾走のステージ", "{1}{R}", "U", [duelWin(E.draw(1)), etb(AUD(1))], { flavor: "全力で走り抜けた先に、次のステージがある。" })),
  MIN(sor("sf25", "食べた分だけ強くなる", "{1}{R}", "C", spell([E.counters(2), E.pump(0, 0, ["速攻"])], T.you), { flavor: "「よく食べて、よく寝て、よく踊る!」" })),
  MIN(ins("sf26", "おかわりの号令", "{R}", "C", spell(E.dmg(2), T.any), { flavor: "「もう一杯!」の声は、誰よりも大きい。" })),
];

// ---------------------------------------------------------------- ハル(青)
export const HARU = [
  HAL(cr("sf27", "数かぞえの羊", "{1}{U}", "羊", 1, 3, "C", [etb([E.draw(1), E.discard(1)])], { flavor: "九十九匹めで、ハルはもう眠っている。" })),
  HAL(cr("sf28", "ねぼすけマンボウ", "{3}{U}", "魚", 2, 5, "C", [etb(E.tap(0, true), T.opp)], { flavor: "ハルの枕元の水槽で、ゆらゆら漂っている。" })),
  HAL(art("sf29", "私のためのピンマイク", "{1}{U}", "U", [castSpell(E.lookTop()), etb(E.draw(1))], { flavor: "小さな声でも、ちゃんと拾ってくれる。" })),
  HAL(art("sf30", "星屑のイヤーモニター", "{2}{U}", "U", [discount({ type: "インスタント" }, 1), etb(AUD(1))], { flavor: "耳元で、星がさらさら鳴っている。" })),
  HAL(ench("sf31", "まどろみの舞台", "{2}{U}", "U", [etb(E.bounce(), T.opp)], { flavor: "照明が落ちると、客席ごと夢の中へ。" })),
  HAL(ench("sf32", "子守唄の時間", "{1}{U}", "U", [secondDraw(E.tap(0, true), T.opp), etb(E.draw(1))], { flavor: "「おやすみなさい……」それが合図。" })),
  HAL(sor("sf33", "まっすぐ声を届かせるには…", "{1}{U}", "C", spell(E.draw(2)), { flavor: "ノートの余白は、書いては消した跡でいっぱい。" })),
  HAL(ins("sf34", "静かに、確かに", "{1}{U}{U}", "C", spell(E.counter(), T.spell), { flavor: "大きな声で否定する必要はない。" })),
];

// ---------------------------------------------------------------- セラ(白)
export const SERA = [
  SER(cr("sf35", "真珠の白鳥", "{2}{W}", "鳥", 2, 2, "C", [kw("飛行"), etb(E.gain(2))], { flavor: "セラの家の庭の池に、毎年やってくる。" })),
  SER(cr("sf36", "黄金の小鳥", "{1}{W}", "鳥", 1, 1, "C", [kw("飛行"), etb(E.create(GOLD))], { flavor: "光るものを集めては、セラの窓辺に置いていく。" })),
  SER(equipment("sf37", "絢爛のティアラ", "{1}{W}", "U", "{1}", { p: 1, t: 1, kw: ["絆魂"] }, [], { flavor: "重さよりも、似合うことのほうが大事。" })),
  SER(art("sf38", "セラのティーセット", "{2}{W}", "U", [etb(E.create(GOLD)), upkeep([E.gain(2), E15.invest(1, AUD(1))])], { flavor: "「お話の前に、まずは一杯いかが?」" })),
  SER(ench("sf39", "お嬢様の舞踏会", "{2}{W}", "R", [once(lifeGain(E.create(GOLD))), etb(AUD(1))], { flavor: "招待状は、来てくれた人みんなの分ある。" })),
  SER(ench("sf40", "規範の舞台", "{1}{W}", "U", [endStep(E.gain(2)), etb(E.gain(2))], { flavor: "誰かのお手本になることを、彼女は怖がらない。" })),
  SER(sor("sf41", "凛として、優雅に", "{2}{W}", "C", spell([E.gain(4), E.create(GOLD), E15.invest(1, E.draw(1))]), { flavor: "ドレスの裾をつまんで、一礼。" })),
  SER(ins("sf42", "皆さまへのご挨拶", "{1}{W}", "C", spell([E.destroy(), E.gain(2)], { t: "creature", who: "opp", attacking: true }), { flavor: "「お引き取りくださいませ」" })),
];

export const PACK15 = [...LESSONS, ...COMMON, ...MINNIE, ...HARU, ...SERA];
