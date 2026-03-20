# Data Integrity Audit Runbook

## 目的

migration 後や read model 改修後に、`Goal / active project / public project` の整合性が崩れていないかをすぐ確認できるようにする。

## 監査内容

- `Goal.targetAmount` と `Goal.targetAmountJpyc` の同期ずれ
- `CreatorProfile.activeProjectIdJpyc / activeProjectIdUsdc` の参照先不整合
- project があるのに active slot が空の creator
- `creatorProfileId` が無いまま public 側に出そうな project

## コマンド

```bash
npm run audit:data-integrity
```

warning も含めて失敗扱いにしたい場合:

```bash
npm run audit:data-integrity -- --strict
```

## 結果の見方

- `critical`: 先に直すべき不整合
- `warning`: すぐ壊れないが、public read model や運用で詰まりやすい状態

## 使いどころ

- `npx prisma migrate deploy` 後
- `Goal / Project / CreatorProfile` を触る refactor の後
- public profile / mypage の read path を変えた後

## 注意

- この監査は read model 観点の整合性確認であり、送金や署名の安全性確認を置き換えるものではない
- `PUBLIC_PROJECT_WITHOUT_CREATOR_PROFILE` は運用上の意図がある場合もあるので、即削除ではなくまず原因を確認する
