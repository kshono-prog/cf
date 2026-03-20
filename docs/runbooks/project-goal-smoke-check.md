# Project Goal Smoke Check

## 目的

`Project.goal` を正本にした後でも、public / mypage / AI snapshot の read model が同じ前提で動いているかを最小手順で確認する。

## Seed 前提

1. `SEED_CREATOR_WALLET_ADDRESS`
2. `SEED_CREATOR_USERNAME`
3. `SEED_PROJECT_CURRENCY=JPYC|USDC`
4. `SEED_GOAL_TARGET_AMOUNT=<number>`
5. 必要なら `SEED_GOAL_DEADLINE=<ISO datetime>`

実行:

```bash
npm run db:seed
```

## Smoke Check

1. public page を開き、hero と progress が `Project.goal.targetAmount` ベースで表示されることを確認する。
2. `/<username>/mypage` を開き、同じ通貨の project / goal / summary が一致していることを確認する。
3. `/<username>/mypage/support-page` で goal 保存後の summary 更新が同じ target amount を返すことを確認する。
4. `/<username>/mypage/supporters` から AI Office snapshot を開き、project summary の target/progress が欠けないことを確認する。
5. `USDC` seed の場合も progress 表示が `JPYC` 文言に引っ張られず、同じ通貨で進捗が見えることを確認する。

## Legacy Data Cleanup

外部 `users.json` に `goalTargetJpyc` が残っている場合は、one-off script で `Project.goal` へ移す。

```bash
node scripts/backfillLegacyGoalsToProjects.cjs
```

別パスを使う場合:

```bash
LEGACY_USERS_JSON=/absolute/path/to/users.json node scripts/backfillLegacyGoalsToProjects.cjs
```

注意:

- `goalTitle` は現在の DB model に保存先がないため、backfill 対象は `target amount` と `deadline` のみ。
- script は `activeProjectIdJpyc / activeProjectIdUsdc` を優先し、最後に最新 project へ fallback する。

## Active Project Cleanup

generic `activeProjectId` は schema から削除済みです。今後の smoke check では、通貨別 `activeProjectIdJpyc / activeProjectIdUsdc` だけを source of truth として確認する。

- JPYC project を作成した creator は `activeProjectIdJpyc` が埋まっていること
- USDC project を作成した creator は `activeProjectIdUsdc` が埋まっていること
- public / mypage の primary `projectId` は上記 2 つから解決されること
