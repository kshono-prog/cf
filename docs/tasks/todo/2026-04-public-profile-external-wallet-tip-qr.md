# Public Profile External Wallet Tip QR

## Summary

公開プロフィール中央カラムに、外部ウォレットから creator へ直接送金するための QR 生成カードを追加する。

- chain 選択: Polygon / Ethereum / Avalanche
- token 選択: native token / JPYC / USDC
- 金額あり: asset と amount を含む QR
- 金額なし: native は creator address のみ、JPYC / USDC は wallet-side amount input 前提の transfer QR

## Goals

- public profile 上で外部ウォレット送金をすぐ試せる
- creator address を手入力せずに送金できる
- chain / token を supporter 側で選べる
- アドレスや送金リンクをコピーできる
- 既存の `Contribution / Project / Purpose` フローを変更しない

## Non-Goals

- 内部支援フローへの統合
- direct wallet transfer の自動計上
- project progress や support history への自動反映
- ERC-20 token transfer QR の追加

## Notes

- native は address-only または value 付き URI を使う
- JPYC / USDC は EIP-681 の `transfer` 形式を使う
- 外部ウォレット送金であることを UI 上で明示する
- サイト内の支援履歴と進捗には反映されないことを明示する
- QR と同じ内容で `ウォレットを開く` deep link を出す
