// パック(第n弾)の一覧。パックの情報とカードの所属はここで一元管理する。
//
//   kind:  "新規展開"(新しいアーキタイプ・キーワード・シナジー)
//          "既存カード強化"(再録・強化版・リメイク・サポート)
//   words: パックのテーマとなる3つの単語(デザインの起点)
//   sets:  このパックで初めて収録されるカード(各カードの pack になる)
//   reprints: 再録するカードのID(カードは変えず、packs にこのパックが加わる)
//
// 強化パックの新規カードは、lib.mjs の basedOn(card, 元のID, "強化版" | "リメイク" | "サポート") で元カードとの関係を記録する。
import { CORE } from "./sets/core.mjs";
import { HUMANS } from "./sets/humans.mjs";
import { ENCHANTMENTS } from "./sets/enchantments.mjs";
import { THREE } from "./sets/three.mjs";
import { HIGHLANDER } from "./sets/highlander.mjs";
import { HOSHIYOMI } from "./sets/hoshiyomi.mjs";
import { TEKKI } from "./sets/tekki.mjs";
import { GRAVEYARD } from "./sets/graveyard.mjs";
import { ARISTOCRATS } from "./sets/aristocrats.mjs";
import { LIFEGAIN } from "./sets/lifegain.mjs";
import { COUNTERS } from "./sets/counters.mjs";
import { SPELLS } from "./sets/spells.mjs";
import { EQUIPMENT } from "./sets/equipment.mjs";
import { HEARTBEAT } from "./sets/heartbeat.mjs";
import { ARMED } from "./sets/armed.mjs";
import { TRIBAL } from "./sets/tribal.mjs";
import { MISC } from "./sets/misc.mjs";
import { ADVANCED } from "./sets/advanced.mjs";
import { AWAKENING } from "./sets/p4-awakening.mjs";
import { REKINDLE, REKINDLE_REPRINTS } from "./sets/p5-rekindle.mjs";
import { COURT } from "./sets/p6-court.mjs";
import { VOIDS } from "./sets/p7-void.mjs";
import { BEACON, BEACON_REPRINTS } from "./sets/p8-beacon.mjs";
import { GATE } from "./sets/p9-gate.mjs";
import { COMMEDIA } from "./sets/p95-commedia.mjs";
import { ELDORADO } from "./sets/p95-eldorado.mjs";
import { BLACK_MARKET } from "./sets/p10-blackmarket.mjs";

export const PACKS = [
  {
    id: "p1",
    number: 1,
    name: "始まりの大地",
    kind: "新規展開",
    words: ["大地", "マナ", "始まり"],
    theme: "5色と欠色・多色の基本カード。チャージ、燃焼、マナ解放、還元、侵食、開花など、マナゾーンを中心にした基本の仕組み。",
    sets: [CORE],
  },
  {
    id: "p2",
    number: 2,
    name: "十五の旗印",
    kind: "新規展開",
    words: ["旗印", "部族", "戦略"],
    theme: "15のアーキタイプ(人間、エンチャント、マナ総量3、孤高、「星詠み」、「鉄機」、墓地、生け贄、ライフ、カウンター、呪文、装備、鼓動、マナ武装、部族)。",
    sets: [HUMANS, ENCHANTMENTS, THREE, HIGHLANDER, HOSHIYOMI, TEKKI, GRAVEYARD, ARISTOCRATS, LIFEGAIN, COUNTERS, SPELLS, EQUIPMENT, HEARTBEAT, ARMED, TRIBAL, MISC],
  },
  {
    id: "p3",
    number: 3,
    name: "変異の兆し",
    kind: "新規展開",
    words: ["変異", "派生", "強化"],
    theme: "既存キーワードの強化版・派生版(天翔、大威迫、吸血、疾駆、鉄壁、輪廻、烈燃、略奪、満開、奈落、伏兵)。",
    sets: [ADVANCED],
  },
  {
    id: "p4",
    number: 4,
    name: "紋章の目覚め",
    kind: "新規展開",
    words: ["大地", "刻印", "目覚め"],
    theme: "マナゾーンに眠る力が目を覚ます。新キーワード「紋章」(マナゾーンにあるあいだ働く能力)と「顕現」(マナゾーンからクリーチャーを戦場に出す)。どのカードをマナにするかが、そのまま戦略になる。",
    sets: [AWAKENING],
  },
  {
    id: "p5",
    number: 5,
    name: "再燃の炎",
    kind: "既存カード強化",
    words: ["再燃", "鍛錬", "継承"],
    theme: "消えかけた炎を再び燃やす。総当たり戦で苦戦した赤系・装備・生け贄・呪文・エルフ・鉄機を、再録・強化版・リメイク・サポートで立て直す。",
    sets: [REKINDLE],
    reprints: REKINDLE_REPRINTS,
  },
  {
    id: "p6",
    number: 6,
    name: "宮廷の暗闘",
    kind: "新規展開",
    words: ["貴族", "陰謀", "決闘"],
    theme: "表では貴族が剣を抜いて決闘し、裏では陰謀が相手の手札と戦力を削る。新キーワード「決闘」(自分と相手のクリーチャーが互いにパワー分のダメージを与え合う)と「陰謀」(このターン相手がカードを捨てたかクリーチャーを失ったなら有効)、新しい種族「貴族」。",
    sets: [COURT],
  },
  {
    id: "p7",
    number: 7,
    name: "虚無の胎動",
    kind: "新規展開",
    words: ["虚無", "裏向き", "欠色"],
    theme: "すべて欠色のパック。色を奪い(略奪)、色を捨て(虚化)、何もないところから力を得る(虚空・真空)。新しい種族・呪文の種類「虚無」は、欠色マナでなければ唱えられない。",
    sets: [VOIDS],
  },
  {
    id: "p8",
    number: 8,
    name: "逆襲の烽火",
    kind: "既存カード強化",
    words: ["底力", "継戦", "反撃"],
    theme: "劣勢のデッキが烽火を上げる。総当たり戦で苦戦した装備・呪文・生け贄・赤白・緑系・エルフ・カウンターに、そのデッキでしか働かない手札補充のエンジンと飛行への答えを配る。新しい条件「強襲」(このターン2体以上で攻撃した)と「連唱」(このターン呪文を2つ以上唱えた)、手札にカードを加える「生成」、効果を選ぶモード呪文。",
    sets: [BEACON],
    reprints: BEACON_REPRINTS,
  },
  {
    id: "p9",
    number: 9,
    name: "秘蔵の門",
    kind: "新規展開",
    words: ["奉納", "リリース", "秘蔵"],
    theme: "メインのデッキとは別に、8枚の「秘蔵庫」を持つ。軽いエンチャントや「奉納」を持つクリーチャーで手札とマナを整え、それらを生け贄に捧げて(リリース召喚)、秘蔵庫の神獣・祖霊・機神をコストを支払わずに呼び出す。捧げずに残せば、ドローやマナを生み続ける。",
    sets: [GATE],
  },
  {
    id: "p95a",
    number: 9.5,
    name: "仮面劇場の狂宴",
    kind: "新規展開",
    words: ["仮面", "演劇", "狂気"],
    theme: "イタリアの即興仮面劇(コンメディア・デッラルテ)が舞台。青・黒・赤だけのパック。呪文を唱えると喝采【狂気】、生け贄に捧げると喝采【悲劇】、大勢で攻撃すると喝采【喜劇】が溜まり、喝采を消費して秘蔵庫の役者を登場させる(エントラータ)。",
    sets: [COMMEDIA],
  },
  {
    id: "p95b",
    number: 9.5,
    name: "黄金郷の発明家",
    kind: "新規展開",
    words: ["開拓", "発明", "黄金郷"],
    theme: "白・赤・緑と欠色だけのパック。緑は戦場とマナゾーンのカードを墓地に置いて秘蔵庫の開拓者を出し(開拓進化【緑】)、切り札の大開拓者エル・ドラードは加護《黄金郷への道》をもたらす。白赤はクリーチャーをタップして秘蔵庫の発明品を組み立て、条件を満たすと合体先と武装進化する。報酬は好きな色のマナになる《黄金》。",
    sets: [ELDORADO],
  },
  {
    id: "p10",
    number: 10,
    name: "闇市の大強盗",
    kind: "新規展開",
    words: ["快楽", "強盗", "闇市"],
    theme: "港町の裏街・灰燭街が舞台。青・赤・緑だけのパック。赤緑の強盗団「鉄爪団」は自分の金庫(秘蔵庫)から宝石を盗み出してマナに換え(強盗)、宝石獣をマナ解放で目覚めさせる。青赤の密売組織「夢花会」の架空の薬は、捨てられたときに効く(陶酔)。常用者とキセルが捨てる手段で、常用者は依存に苦しむ。",
    sets: [BLACK_MARKET],
  },
];
