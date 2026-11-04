// 第13弾 ― 砂に眠る王と九柱の神々(エジプト)
//
//   ヘリオポリスの神々(白青赤):系譜。親の神が自分の戦場か墓地にあれば、子の神が{2}軽くなる。
//     系図:アトゥム → シュウ・テフヌト → ゲブ・ヌト → オシリス・イシス・セト・ネフティス → ホルス
//   メジャイの兵士(白黒緑):任務。条件を満たすたびに任務カウンターが乗り、規定の数で達成して報酬が出る。
//   罠のピラミッドとファラオ(青黒緑):罠。裏向きで仕掛け、次のターンからコストなしで発動。表向きのあとはコストを払って何度でも使える。
//     罠を発動するたびにファラオの呪いが溜まり、加護を得て長期戦を優位にするコントロール。
import { cr, ins, sor, ench, art, kw, spell, etb, dies, attacks, lord, stat, selfIf, once, allyEnter, act, entrata, countPerm, T, E, E13, lineage, trap, quest, onBlocks, onQuestDone, onTrapUse } from "../lib.mjs";

const tag = (t) => (c) => ({ ...c, tags: [...new Set([...(c.tags ?? []), t])] });
const GOD = tag("ヘリオポリス");
const MJ = tag("メジャイ");
const PH = tag("ファラオ");
const HUMAN = { sub: "人間" };
const qst = (id, name, cost, rar, abilities, flavor) => MJ(ench(id, name, cost, rar, abilities, { subtype: "任務", flavor }));
const trp = (id, name, cost, rar, abilities, flavor) => PH(art(id, name, cost, rar, abilities, { subtype: "罠", flavor }));

export const HELIOPOLIS = [
  GOD(cr("eg01", "アトゥム", "{W}{U}{R}", "神", 3, 3, "M", [etb(E.tutor({ names: ["シュウ", "テフヌト"] }))], { flavor: "原初の水ヌンから、自らを生んだ創造の神。" })),
  GOD(cr("eg02", "シュウ", "{1}{W}{U}", "神", 2, 3, "R", [kw("飛行"), lineage("アトゥム"), etb(E.bounce(), T.opp)], { flavor: "大気の神。天と地のあいだに立ち、両者を引き離す。" })),
  GOD(cr("eg03", "テフヌト", "{1}{W}{R}", "神", 3, 2, "R", [kw("先制攻撃"), lineage("アトゥム"), etb(E.dmg(2), T.opp)], { flavor: "湿気の女神。怒れば雌獅子となり、砂漠を焼く。" })),
  GOD(cr("eg04", "ゲブ", "{3}{W}", "神", 3, 6, "R", [kw("警戒"), lineage("シュウ", "テフヌト"), lord({ sub: "神" }, 0, 2)], { flavor: "大地の神。その笑い声が地震になる。" })),
  GOD(cr("eg05", "ヌト", "{3}{U}", "神", 2, 5, "R", [kw("飛行"), lineage("シュウ", "テフヌト"), etb(E.draw(2))], { flavor: "天空の女神。毎夕、太陽を呑み込み、毎朝それを産む。" })),
  GOD(cr("eg06", "オシリス", "{2}{W}{W}", "神", 4, 4, "R", [lineage("ゲブ", "ヌト"), dies(E13.selfToHand())], { flavor: "冥界の王。殺されても、何度でもよみがえる。" })),
  GOD(cr("eg07", "イシス", "{2}{U}{U}", "神", 2, 4, "R", [kw("瞬速"), lineage("ゲブ", "ヌト"), etb(E.counter(), T.spell)], { flavor: "魔術の女神。太陽神の真の名さえ、その手に握る。" })),
  GOD(cr("eg08", "セト", "{3}{R}{R}", "神", 5, 4, "R", [kw("トランプル"), lineage("ゲブ", "ヌト"), etb(E.dmgAll(2))], { flavor: "砂嵐と混沌の神。兄の玉座を奪った。" })),
  GOD(cr("eg09", "ネフティス", "{2}{U}{R}", "神", 3, 3, "U", [lineage("ゲブ", "ヌト"), etb(E.ret("hand"), T.gyF({ sub: "神" }))], { flavor: "死者を守る女神。姉とともに、兄の亡骸を探した。" })),
  GOD(cr("eg10", "ホルス", "{3}{W}{U}{R}", "神", 6, 6, "M", [kw("飛行"), lineage("オシリス", "イシス"), etb(E.destroy(), T.opp)], { flavor: "天空の鷹。父の仇を討ち、王となった。" })),
  GOD(cr("eg11", "ヘリオポリスの神官", "{1}{W}", "人間・神官", 1, 2, "C", [etb(E13.seek(4, { sub: "神" }))], { flavor: "太陽の都の神殿で、九柱の名を唱え続ける。" })),
  GOD(cr("eg12", "聖鳥ベヌウ", "{2}{R}", "鳥", 2, 2, "U", [kw("飛行", "輪廻")], { flavor: "ベンベン石の上で鳴き、時を始めた不死の鳥。" })),
  GOD(sor("eg13", "天地開闢", "{1}{U}", "C", spell(E13.seek(4, { sub: "神" }, "graveyard")), { flavor: "天と地が分かれ、神々の系譜が始まった。" })),
  GOD(art("eg14", "ベンベン石", "{1}", "U", [act({ mana: "{1}", sacSelf: true }, E.tutor({ names: ["アトゥム"] }))], { flavor: "原初の丘。創造の神が最初に立った場所。" })),
  GOD(ench("eg15", "太陽の船", "{2}{W}{R}", "R", [lord({ sub: "神" }, 1, 1, ["速攻"], false)], { flavor: "昼は天を、夜は冥界を渡る、ラーの船。" })),
  GOD(ench("eg16", "ヘリオポリス", "{1}{W}{U}", "R", [once(allyEnter({ sub: "神" })(E.draw(1)))], { flavor: "太陽の都。九柱の神々は、ここで生まれた。" })),
  GOD(ins("eg17", "ティエトの護符", "{W}", "C", spell(E.pump(0, 0, ["破壊不能"]), T.you), { flavor: "イシスの結び目。身につけた者を災いから守る。" })),
  GOD(ins("eg18", "セトの砂嵐", "{1}{R}", "C", spell([E.dmg(2), E.dmgOpp(2)], T.cre), { flavor: "赤い砂が、目も喉も焼く。" })),
  GOD(ins("eg19", "心臓の計量", "{2}{W}", "U", spell(E.exile(), { t: "creature", inCombat: true }), { flavor: "真理の羽根より重い心臓は、怪物に喰われる。" })),
  GOD(sor("eg20", "九柱の集い", "{W}{U}{R}", "R", spell(E13.regrow(2, { sub: "神" })), { flavor: "九柱がそろうとき、太陽の都に光が満ちる。" })),
];

export const MEDJAY = [
  qst("eg21", "王墓の見張り", "{W}", "C", quest(3, "allyBlocks", HUMAN, E.token(2, 1, 1, "W", "人間・メジャイ")), "夜の王墓に、松明の列が続く。"),
  qst("eg22", "墓泥棒狩り", "{B}", "U", quest(3, "oppDies", null, [E.draw(2), E.gain(2)]), "盗んだ財宝ごと、砂に埋めてやる。"),
  qst("eg23", "砂漠の巡回", "{G}", "U", quest(4, "allyAttacks", HUMAN, E.countersAll(1, HUMAN)), "砂丘を越えるたびに、足は強くなる。"),
  qst("eg24", "ナイルの恵み", "{1}{G}", "U", quest(3, "manaEnter", null, E.token(1, 4, 4, "G", "カバ")), "氾濫のあとの黒い土が、すべてを育てる。"),
  qst("eg25", "ファラオの勅命", "{W}{B}{G}", "R", quest(2, "questDone", null, E13.reanimateAll(HUMAN)), "王の命令は、死者さえも起こす。"),
  MJ(cr("eg26", "メジャイの新兵", "{W}", "人間・メジャイ", 1, 1, "C", [etb(E13.advance())], { flavor: "砂漠の民から選ばれた、若き警備兵。" })),
  MJ(cr("eg27", "メジャイの巡察兵", "{1}{W}", "人間・メジャイ", 2, 2, "C", [kw("警戒"), attacks(E13.advance())], { flavor: "王の道を、夜明けから日暮れまで歩く。" })),
  MJ(cr("eg28", "王墓の門番", "{1}{W}", "人間・メジャイ", 1, 4, "C", [kw("防衛"), onBlocks(E13.advance())], { flavor: "この扉の向こうへは、誰も通さない。" })),
  MJ(cr("eg29", "メジャイの弓兵", "{1}{G}", "人間・メジャイ", 2, 2, "C", [kw("到達"), etb(E13.advance())], { flavor: "砂嵐の中でも、鷹の目は外さない。" })),
  MJ(cr("eg30", "墓守の老人", "{1}{B}", "人間", 1, 2, "C", [dies([E13.advance(), E.draw(1)])], { flavor: "王墓の秘密を知る者は、墓まで持っていく。" })),
  MJ(cr("eg31", "ミイラ職人", "{2}{B}", "人間", 2, 3, "U", [etb(E.ret("hand"), T.gyF(HUMAN))], { flavor: "七十日かけて、死者を永遠の旅に送り出す。" })),
  MJ(cr("eg32", "砂漠の追跡者", "{2}{G}", "人間・メジャイ", 3, 3, "U", [selfIf("questDone", 2, 2)], { flavor: "一度追った足跡は、砂に消えても見失わない。" })),
  MJ(cr("eg33", "王の書記官", "{1}{W}{B}", "人間", 2, 2, "U", [onQuestDone(E.draw(1))], { flavor: "功績はすべて、パピルスに記される。" })),
  MJ(cr("eg34", "ナイルの猟師", "{3}{G}", "人間・メジャイ", 4, 4, "U", [etb(E13.advance(2))], { flavor: "葦の茂みで、鰐とカバを相手にしてきた。" })),
  MJ(cr("eg35", "メジャイの隊長", "{1}{W}{G}", "人間・メジャイ", 3, 3, "R", [lord(HUMAN, 1, 1)], { flavor: "隊長の号令ひとつで、隊列は一つの槍になる。" })),
  MJ(cr("eg36", "闇の処刑人", "{2}{B}{B}", "人間・メジャイ", 3, 2, "R", [kw("接死"), etb(E.shrink(2), T.opp), etb(E13.advance())], { flavor: "王の名において、墓を荒らす者を裁く。" })),
  MJ(cr("eg37", "王墓の槍兵隊", "{2}{W}", "人間・メジャイ", 2, 3, "C", [etb(E.gain(countPerm(HUMAN)))], { flavor: "並んだ槍の数だけ、王墓は固くなる。" })),
  MJ(cr("eg38", "メジャイの長", "{W}{B}{G}", "人間・メジャイ", 4, 4, "M", [kw("先制攻撃"), stat({ s: "questDouble" })], { flavor: "ファラオから直々に、王墓の守りを託された。" })),
  MJ(ins("eg39", "王墓の守り", "{W}", "C", spell(E.pumpAll(1, 1, undefined, "you", HUMAN)), { flavor: "盾を並べろ。王の眠りを守れ。" })),
  MJ(sor("eg40", "墓荒らしへの罰", "{2}{B}", "C", spell([E.destroy(), E13.advance()], T.opp), { flavor: "王墓の呪いより先に、メジャイの刃が来る。" })),
];

export const PHARAOH = [
  trp("eg41", "串刺し罠", "{1}{B}", "U", [trap("{3}{B}{B}", E.destroy(), T.opp, "oppEnter")], "足を踏み入れた瞬間、床から槍が突き出る。"),
  trp("eg42", "王家の呪印", "{U}", "C", [trap("{2}{U}", E.draw(1), undefined, "oppDraw")], "王の名を盗み見た者の知恵は、王のものになる。"),
  trp("eg43", "落とし穴", "{1}{B}", "C", [trap("{3}{B}{B}", E.destroy(), { t: "creature", attacking: true })], "財宝の手前の一歩が、最後の一歩になる。"),
  trp("eg44", "流砂", "{1}{U}", "U", [trap("{3}{U}{U}", E.tuck(), T.cre)], "もがくほど、砂は深く引き込む。"),
  trp("eg45", "毒矢の壁", "{1}{G}", "C", [trap("{3}{G}", E.dmg(3), { t: "creature", inCombat: true })], "壁の穴から、蛇の毒を塗った矢が降る。"),
  trp("eg46", "封印の扉", "{U}", "U", [trap("{3}{U}", E.counter(), { t: "spell", maxMV: 3 })], "王の言葉で閉じた扉は、王の言葉でしか開かない。"),
  trp("eg47", "石棺の呪い", "{1}{U}", "C", [trap("{3}{U}", E.tap(0, true), T.opp)], "石棺のふたに触れた手が、動かなくなる。"),
  trp("eg48", "吊り天井", "{2}{B}", "U", [trap("{5}{B}", E.pumpAll(-1, -1, undefined, "opp"))], "鎖の切れる音が、回廊に響いた。"),
  trp("eg49", "スカラベの大群", "{1}{B}{G}", "R", [trap("{4}{B}{G}", E.token(3, 1, 1, "B", "昆虫・スカラベ"))], "壁画の甲虫が、本物になって這い出してくる。"),
  trp("eg50", "王家の呪い", "{U}{B}{G}", "R", [trap("{5}", [E.destroy(), E.lose(2)], T.opp)], "王の眠りを妨げる者には、死が素早い翼に乗って訪れる。"),
  PH(cr("eg51", "少年王", "{1}{U}", "人間・ファラオ", 1, 3, "U", [etb(E.blessing("王の継承"))], { flavor: "九歳で玉座についた王は、自分の墓の設計図を見て笑った。" })),
  PH(cr("eg52", "墓所の建築家", "{2}{U}", "人間", 1, 3, "C", [etb(E13.seek(5, { sub: "罠" }))], { flavor: "王墓の地図を知る者は、完成とともに消される。" })),
  PH(cr("eg53", "盗掘者の亡骸", "{1}{B}", "ゾンビ・ミイラ", 2, 1, "C", [dies(E.ret("hand"), T.gyF({ sub: "罠" }))], { flavor: "罠にかかった盗人は、次の盗人への罠になる。" })),
  PH(cr("eg54", "墓の大蛇", "{3}{G}", "蛇", 3, 5, "C", [kw("接死")], { flavor: "王墓の闇で、千年とぐろを巻いている。" })),
  PH(cr("eg55", "ミイラの番兵", "{1}{B}{G}", "ゾンビ・ミイラ", 2, 5, "U", [onTrapUse(E.gain(2))], { flavor: "包帯の奥の目は、まだ王墓を見張っている。" })),
  PH(cr("eg56", "呪われたファラオ", "{2}{U}{B}", "ゾンビ・ミイラ・ファラオ", 3, 4, "R", [etb(E.blessing("呪われた財宝")), onTrapUse(E.draw(1))], { flavor: "財宝に触れた者の命は、すべて王のものになる。" })),
  PH(cr("eg57", "不死のファラオ", "{3}{U}{B}{G}", "ゾンビ・ミイラ・ファラオ", 5, 6, "M", [entrata(5, "呪い"), etb([E.blessing("不死の王墓"), E13.setFromGrave(2)])], { flavor: "呪いが満ちたとき、王は石棺のふたを内側から押し開ける。" })),
  PH(ench("eg58", "大ピラミッド", "{1}{U}{B}{G}", "R", [onTrapUse(E.applause("呪い", 1)), act({ applause: { cat: "呪い", n: 3 } }, E.blessing("迷宮の回廊"))], { flavor: "王の墓は、王を守る巨大な罠そのもの。" })),
  PH(sor("eg59", "死者の書", "{2}{U}{B}", "U", spell([E.blessing("死者の書"), E.draw(1)]), { flavor: "冥界を旅する死者のための、呪文の書。" })),
  PH(ins("eg60", "ミイラ化", "{2}{B}", "C", spell([{ ...E.shrink(3), unless: { applause: "呪い", n: 3 } }, { ...E.shrink(5), if: { applause: "呪い", n: 3 } }], T.cre), { flavor: "生きたまま、永遠の眠りへ。" })),
];

export const EGYPT = [...HELIOPOLIS, ...MEDJAY, ...PHARAOH];
