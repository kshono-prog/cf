# Task
settlement の mobile 情報密度を下げ、guided flow を小画面で読みやすくする

## Goal
`Bridge -> Draft -> Preflight -> Execute -> Review` を mobile でも 1 step ずつ追いやすくする

## Scope
- step overview を mobile で横スクロール + compact card にする
- bridge / draft / preflight / execute / review の主要操作を縦積み中心にする
- execution log と manual result の行を mobile で読みやすくする

## Non-Goals
- settlement の文言刷新
- desktop レイアウトの全面変更
- 高度な操作の追加削除

## Acceptance Criteria
- mobile 幅で step cards が詰まりすぎない
- section header と主要ボタンが横並びで潰れない
- review のログと manual result が折り返しても読める
- `eslint`, `typecheck`, `build` が通る

## Result
- `ProjectSettlementGuidedFlow` を mobile で横スクロール可能な compact step card に変更
- `Bridge / Draft / Preflight / Execute / Review` の主要操作を小画面で縦積み中心に整理
- 実行ログと手動結果記録の各行を mobile で読みやすい block layout に調整
