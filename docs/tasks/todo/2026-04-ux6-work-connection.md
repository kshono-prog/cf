# UX-6: 仕事接続（実績カード・信頼プロフィール）

**Phase**: Phase 3
**Status**: 完了（2026-04-01）
**依存**: UX-3（ゲーミフィケーション基盤）、UX-4（ファン応援可視化）、`StageEvidence` 実装済み

---

## Goal

クリエイターの「信頼の積み上げ」を外部（コラボ先・仕事機会）に見せられる形にする。
AI が実績ベースで案件応募文を下書きし、
月次活動レポートを 1 クリックで出力できるようにする。

---

## Scope

### 1. 実績カード自動生成
- 活動継続期間・応援推移・達成タスク数を 1 枚のカードにまとめる
- クリエイターの公開プロフィールに表示（opt-in）
- SNS シェア用テキスト付き

### 2. 「信頼プロフィール」整備
- コラボ依頼・仕事機会を受けるための public-safe な信頼シグナルページ
- 既存 `AM-39 Public-safe Trust Signal` を拡張
- 「問い合わせを受け付ける」フラグ追加

### 3. AI 案件応募文下書き
- 新規 AgentTask タイプ `OPPORTUNITY_APPLICATION_DRAFT`
- 過去の実績・StageEvidence・Contribution 履歴を引用
- Manager Desk の Opportunity CRM から起動

### 4. 月次活動レポート出力
- 既存 `MONTHLY_CASHFLOW_REPORT` を拡張
- 活動 / 支援 / 達成 / 信頼の 4 セクションを含む
- PDF ではなく、まず印刷可能な HTML ページとして実装

---

## Non-Goals

- 実際の仕事マッチング機能（プラットフォーム外の連携）
- PDF 生成ライブラリの導入（Phase 3 では印刷用 HTML で代替）
- 新規 Prisma schema（既存モデルで対応可能な範囲で実装）

---

## Files Likely Affected

```
lib/creator-ai/opportunityApplicationDraftTask.ts   # 新規: AgentTask executor
components/mypage/AchievementCard.tsx               # 新規: 実績カード
components/profile/PublicTrustProfileSection.tsx    # 新規: 公開信頼プロフィール
components/managerDesk/OpportunityApplicationCTA.tsx # 新規: 応募文起動ボタン
app/[username]/activity-report/page.tsx             # 新規: 月次レポートページ
app/api/creator/activity-report/route.ts            # 新規: レポート API
```

---

## Acceptance Criteria

- [ ] 実績カードが Creator Home + 公開プロフィールに表示される
- [ ] 信頼プロフィールで「問い合わせを受け付ける」フラグが設定可能
- [ ] Opportunity CRM から `OPPORTUNITY_APPLICATION_DRAFT` タスクが起動できる
- [ ] 月次活動レポートが `/[username]/activity-report` で表示される
- [ ] レポートページが印刷可能なレイアウト（`@media print` 対応）
- [ ] 財務・ウォレット情報は公開表示に含めない

---

## Risks

- `OPPORTUNITY_APPLICATION_DRAFT` が既存 `CONTACT_OUTREACH_DRAFT` と重複
  → 用途を明確に分ける（機会応募 vs 初回アウトリーチ）
- 月次レポートに含める内容の選定でプライバシー考慮が必要
  → opt-in 方式で、デフォルトは owner only 表示

---

## Validation

```bash
npm run lint
npm run typecheck
npm run build
npm run prisma:validate  # executor 追加時のみ
```

手動確認:
- 実績カードのデータ整合（Contribution 数・継続期間）
- 応募文下書きの AI 出力に過去実績が引用されているか
- 月次レポートの印刷レイアウト（Chrome の印刷プレビューで確認）
- 公開レポートに財務情報が混入していないこと
