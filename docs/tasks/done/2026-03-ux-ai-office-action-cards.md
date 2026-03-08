# Task

Phase 2 UX: `AI Office` の task type select を action card に置き換える

## Goal

内部の task type 名を選ばせるのではなく、`何をしたいか` ベースで AI タスクを選べるようにする。

## Scope

- `Create` 画面の task type select を action card に置き換える
- 各 card に `何を作るか / どんな時に使うか` を表示する
- 選択中の card が一目で分かる状態にする

## Non-Goals

- task type の追加や削除
- AI Office の全面リデザイン

## Validation

- `eslint`
- `npm run typecheck`
- `npm run build`

## Result

- `components/mypage/AiOfficeCreateSection.tsx` で task type select を action card に置き換えた
- `何をしたいか` ベースの選択 UI にして、task type 名を直接選ばせない構成へ寄せた
- 選択中の task が視覚的に分かる card state を追加した
