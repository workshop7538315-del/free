// 制限カード:デッキに入れられる枚数を、通常(同名4枚、秘蔵庫は2枚)より少なくする。禁止(0枚)はまだ使わない。
// { カードID: 上限の枚数 }。ビルドで cards.json の各カードに limit として書き込み、デッキビルダーとスターターに反映する。
// 検証用:RESTRICT='{"hr88":1}' node cards/build.mjs で一時的に足せる。
export const RESTRICTED = {};
