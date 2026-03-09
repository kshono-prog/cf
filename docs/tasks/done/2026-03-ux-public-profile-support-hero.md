# Task
公開プロフィールの支援導線を fold 上に寄せる

## Goal
初見の支援者が、何を支援するページかをすぐ理解して、そのまま支援 UI へ進めるようにする

## Scope
- 公開プロフィールの上部に support hero を追加する
- `何を支援するか -> 進捗 -> すぐ支援` の順に並べる
- wallet section を supporting content より前に出す

## Non-Goals
- 公開プロフィール全体の全面リデザイン
- wallet 送金フローの仕様変更
- 動画セクションの redesign

## Acceptance Criteria
- fold 上で支援目的、現在値、目標、進捗が見える
- `この目標を支援する` から wallet section へ移動できる
- 進捗詳細は supporting information として残る
- `eslint`, `typecheck`, `build` が通る

## Result
- `ProfileClient` に support hero を追加
- wallet section を動画より前に配置
- 進捗カードは詳細確認の役割に寄せた
- support hero と wallet 導線を light theme に統一
- `資金を預からない / 送信後に確認できる` という安心文言を fold 上と wallet 手前に追加
- 進捗詳細は wallet より上に戻し、安心文言は hero 内の短い補足に圧縮した
- wallet section は動画の後ろへ戻し、`接続 -> ネットワーク -> 通貨 -> 金額 -> 送金` の順に見える step layout に整理した
- header / goal / video / wallet / footer の角丸、border tone、背景色、accent の使い方を揃えた
- `Creator support` と `Goal/進捗` を 1 つの surface に統合し、footer は元の見え方へ戻した
