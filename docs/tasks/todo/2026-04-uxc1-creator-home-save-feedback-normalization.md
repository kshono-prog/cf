# UXC-1: Creator Home の保存・pending・完了フィードバック統一

**Surface**: mypage
**Status**: Phase 11 実装中（2026-04-04）
**依存**: UXA-1

---

## Goal

Creator Home / Settings 内の保存操作で、
「未保存 / 保存中 / 完了 / エラー / 認証が必要」の見え方を揃える。

---

## Scope

- profile / goal / note / revenue / expense 周辺の保存フィードバック棚卸し
- button 文言、notice、inline error の統一
- 長いフォームで dirty state や保存完了の見え方を整理

### Phase 1（今回の実装）

- profile / user registration / creator apply の保存結果を上部 notice に統一
- auth-required / 接続不足 / username 競合などの保存エラー文言を整理
- revenue / expense 入力カードで保存成功・失敗を card 内 notice で見せる

### Phase 2（今回の追加実装）

- AI Manager 設定・予算操作・funding evidence・x402 更新の完了通知を構造化する
- share log の保存成功・失敗を共通 notice に寄せる
- owner auth / 署名キャンセル時の文言を AI Manager 保存系でも分かりやすくする

### Phase 3（今回の追加実装）

- goal 保存 / 達成確定の成功表示を notice 化する
- goal panel の validation / owner-only / summary fetch error を意味のある文言へ寄せる
- 保存成功後の summary refresh で success message が消える問題を解消する

### Phase 4（今回の追加実装）

- 投稿 composer の validation / auth-required / 保存完了を共通 notice に寄せる
- metrics input の保存成功・失敗を共通 notice へ寄せる
- 投稿・指標記録の error code を共通 copy helper で扱えるようにする

### Phase 5（今回の追加実装）

- AI profile draft / inline profile edit / inline posting panel の error 表示を共通 notice に寄せる
- AI 下書き失敗・入力不足・Compose handoff 失敗の文言を共通 copy helper で扱う
- inline 編集系でも auth-required や保存失敗の意味が伝わるようにする

### Phase 6（今回の追加実装）

- ShareDraftCard の生成成功・生成失敗・コピー失敗を共通 notice に寄せる
- 公開ページ URL 不足や clipboard 非対応時の案内を共通 copy helper で扱う
- 生成後に「次にできること」が伝わる success notice を追加する

### Phase 7（今回の追加実装）

- AiAgencyCard の取得失敗・作成失敗・queue 完了を共通 notice に寄せる
- MyPostsCard の一覧取得失敗・archive 切り替え完了を共通 notice に寄せる
- SNS 管理系 API の error code を共通 copy helper で扱えるようにする

### Phase 8（今回の追加実装）

- AnalyticsSummaryCard の取得失敗を共通 notice に寄せる
- GrowthOverviewCard の読み込み失敗を共通 notice に寄せる
- 読み込み系カードでも error copy helper を再利用できるようにする

### Phase 9（今回の追加実装）

- Manager Feed / Planner / Growth Reflection / Supporter Overview の error 表示を共通 notice に寄せる
- home section の read feedback でも error code をそのまま見せないようにする
- supporter overview が error 時に無言で消える問題を解消する

### Phase 10（今回の追加実装）

- settings header の raw warning を WorkspaceStatusNotice に置き換える
- project dashboard fetch error を code 化して home / settings の両方で共通 helper を通す
- home 先頭の dashboardError も意味のある notice に寄せる

### Phase 11（今回の追加実装）

- AiOfficePanel の raw message を code ベースへ寄せ、失敗時の notice を揃える
- daily briefing / AI home summary の hidden read error を home 上部 notice として見せる
- supporter CRM / fan engagement の silent failure を card 単位の notice に寄せる

---

## Non-Goals

- form schema の変更
- AI task の実行フロー変更
- settlement / bridge UI の変更

---

## Files Likely Affected

```
app/[username]/mypage/AccountPageClient.tsx
components/mypage/*.tsx
lib/mypage/*.ts
```

---

## Acceptance Criteria

- [x] Phase 1: profile / user / creator apply の保存結果が上部 notice で見える
- [x] Phase 1: auth-required と validation error の文言が以前より分かれる
- [x] Phase 1: revenue / expense の保存完了が card 内で明確に伝わる
- [x] Phase 2: AI Manager / share log の保存フィードバックを共通 notice に寄せる
- [x] Phase 3: goal 保存 / 達成確定の feedback を notice に寄せる
- [x] Phase 4: 投稿 composer / metrics input の feedback を notice に寄せる
- [x] Phase 5: inline AI 編集系の error 表示を notice に寄せる
- [x] Phase 6: Share draft 生成 / copy feedback を notice に寄せる
- [x] Phase 7: AI agency / my posts の管理系 feedback を notice に寄せる
- [x] Phase 8: 分析系カードの取得失敗を notice に寄せる
- [x] Phase 9: Home section の read feedback を notice に寄せる
- [x] Phase 10: settings / dashboard error を notice に寄せる
- [x] Phase 11: 残る form save UX / read feedback を面横断で統一する

---

## Risks

- 大きなコンポーネントにローカル state が散っている
- 成功通知の統一を急ぐと既存 UX を壊す可能性がある

---

## Validation

```bash
npm run lint
npm run typecheck
npm run build
```

手動確認:

- profile 保存
- goal 保存
- AI Manager 設定保存
- AI Manager の budget top-up / deduct / x402 update
- expense / revenue 入力
- share log 保存
- post composer 保存
- metrics input 保存
- AI profile draft / inline profile edit / inline posting
- share draft 生成 / copy
- AI agency / my posts
- analytics summary / growth overview
- manager feed / planner / growth reflection / supporter overview
- settings header / dashboard error
