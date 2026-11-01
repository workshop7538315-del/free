// 第12弾 ― 龍生九子(黒赤)
//
//   守護者の死骸から生まれた九匹の龍。長兄の贔屓だけがメインデッキに入り、ほかの8体は秘蔵庫に入る(秘蔵庫8枚にちょうど収まる)。
//   龍生:秘蔵庫の九子のマナコストを進化コストとして払い、贔屓を含む自分のクリーチャーの上に重ねて出す。
//     ソーサリーのタイミングで、回数の制限はない。重なったカード1枚につき+1/+1。
//     x(下に重なっている枚数)が大きいほど「出たとき」の効果が大きくなる。
//     それぞれが「代わりの払い方」を持ち、マナの代わりにライフ・手札・場などを削って重ねられる。
//   場を離れると重なったカードも一緒に離れる(九子は秘蔵庫へ戻り、贔屓は墓地へ)。
//   シルバーバレット:秘蔵庫の九子はいつでも見えていて、相手に合わせて1体を選んで重ねる。
import { cr, ins, sor, ench, kw, spell, etb, lord, dragon, stat, UNDER, T, E } from "../lib.mjs";

const tagged = (c) => ({ ...c, tags: [...new Set([...(c.tags ?? []), "龍生九子"])] });
const SON = "ドラゴン・九子";
const son = (id, name, cost, p, t, rar, abilities, extra, sub = SON) => tagged(cr(id, name, cost, sub, p, t, rar, abilities, extra));

export const KYUSHI = [
  son("ry01", "贔屓", "{1}{B}{R}", 1, 5, "U", [], { flavor: "九子の長兄。重いものを背負うことを好む。守護者の石碑も、弟たちも。" }),
  son("ry02", "螭吻", "{1}{B}", 2, 3, "R", [dragon({ mill: 3 }), etb(E.dig(UNDER, 2, 3))], { flavor: "遠くを望むことを好む。屋根の端から、まだ来ない明日を見ている。" }),
  son("ry03", "狻猊", "{2}{R}", 3, 3, "R", [dragon({ discard: 2 }), etb(E.volley(UNDER, 2))], { flavor: "火と煙を好む。香炉の上で、退屈そうに炎を吐く。" }),
  son("ry04", "狴犴", "{2}{B}", 3, 4, "R", [dragon({ life: 4 }, { ambush: true }), etb(E.shrink(UNDER), T.opp)], { flavor: "訴えを好む。悪事を見れば、呼ばれなくても裁きに来る。" }),
  son(
    "ry05",
    "饕餮",
    "{3}{B}{R}",
    5,
    4,
    "R",
    [kw("絆魂"), dragon({ sacOther: true }), etb([E.pumpSelf(UNDER, 0), { ...E.fightSelf(), may: true }], T.opp)],
    { flavor: "喰らうことを好む。四凶にも数えられる、底なしの胃袋。" },
    "ドラゴン・九子・四凶",
  ),
  son("ry06", "蒲牢", "{2}{R}{R}", 4, 3, "R", [dragon({ tapCreatures: 2 }), etb(E.shatter(UNDER))], { flavor: "吼えることを好む。鐘の上で叫べば、作りものはみな砕ける。" }),
  son("ry07", "覇下", "{3}{B}", 3, 5, "R", [dragon({ manaToGrave: 2 }), etb([E.washGrave(), E.tuckUpTo(UNDER)])], { flavor: "水を好む。流れは、墓に眠るものまで押し流す。" }),
  son("ry08", "椒図", "{2}{B}{R}", 3, 3, "R", [dragon({ underToVault: 1 }), etb(E.rotate())], { flavor: "閉じこもることを好む。扉の輪をくわえて、兄弟の誰かを外に出す。" }),
  son("ry09", "睚眦", "{8}{B}{R}", 6, 6, "M", [dragon(undefined, { selfReduce: true }), etb([E.countersSelf(UNDER), E.yazi()])], {
    flavor: "殺戮を好む。九つの首がそろったとき、戦は一度では終わらない。",
  }),

  // ---------------------------------------------------------------- サポート(メインデッキ)
  tagged(ins("ry10", "九子の巡り", "{1}{B}{R}", "R", spell(E.rotate(0), T.creF({ sub: "ドラゴン" }, "you")), { flavor: "兄弟の順番は、いつでも入れ替わる。" })),
  tagged(ins("ry11", "登龍門", "{B}{R}", "R", spell(E.dragonNow()), { flavor: "滝を登りきった鯉は、龍になる。" })),
  tagged(sor("ry12", "石碑", "{B}", "C", spell(E.tutor({ name: "贔屓" })), { flavor: "亀の背の石碑。崩れたとき、百八の星がこぼれ落ちた。" })),
  tagged(ench("ry13", "龍の背", "{1}{B}", "U", [lord({ sub: "ドラゴン" }, 0, 0, ["呪禁"], false)], { flavor: "九つの背中が、互いを守る。" })),
  tagged(sor("ry14", "九子の帰還", "{1}{R}", "C", spell([E.ret("hand"), E.draw(1)], T.gyF({ name: "贔屓" })), { flavor: "長兄は、何度でも戻ってくる。" })),
  tagged(
    ins("ry15", "龍の咆哮", "{1}{R}", "C", spell([{ ...E.dmg(3), unless: { control: { sub: "ドラゴン" }, n: 1 } }, { ...E.dmg(5), if: { control: { sub: "ドラゴン" }, n: 1 } }], T.cre), {
      flavor: "兄弟の誰かが吼えれば、残りも続く。",
    }),
  ),
  tagged(ins("ry17", "逆鱗", "{1}{B}", "U", spell(E.underToHand(2), T.creF({ sub: "ドラゴン" }, "you")), { flavor: "喉元の一枚だけ逆さに生えた鱗。触れた者を、龍は決して許さない。" })),
  tagged(ench("ry16", "守護者の死骸", "{1}{B}{R}", "R", [stat({ s: "dragonDiscount", n: 1 }), etb(E.tutor({ name: "贔屓" }))], { flavor: "赤と黒の守護者が倒れた場所から、九つの卵が見つかった。" })),
];
