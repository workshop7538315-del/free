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
];
