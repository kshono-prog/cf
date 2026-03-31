# UX-4: ファン応援可視化

**Phase**: Phase 2
**Status**: TODO
**依存**: 既存 Contribution / Post / Reply データ

---

## Goal

「応援されている実感」を数字ではなく「意味」として返す。
クリエイターが活動を続けるための動機（応援可視化）を Creator Home に設置する。

---

## Scope

### 1. 応援タイムライン
- 直近の Contribution / Post への反応を時系列で表示
- 誰がいつ何に共感したかを 1 行で見せる

### 2. 応援ヒートマップ
- 曜日 / 時間帯別の応援集中パターンを可視化（CSS グリッド）
- 外部チャートライブラリは使わない

### 3. 「今週の応援ハイライト」自動要約
- 既存 `SUPPORTER_RESULT_REPORT` AgentTask を流用
- または軽量な in-app summary（top Contribution + top Post reaction）

### 4. お礼アクション提案
- 未返礼の Contribution があれば「お礼メッセージを送る」を提案
- ワンタップで AI 下書きを生成し、Compose に渡す
- 既存 `SUPPORTER_MESSAGE_DRAFT` AgentTask を流用

---

## Non-Goals

- リアルタイムプッシュ通知
- 外部 SNS の反応取得
- 新規 Prisma schema（既存 Contribution / Post / Reply を使う）

---

## Files Likely Affected

```
lib/fanEngagement/engagementTimeline.ts          # 新規: タイムライン導出
lib/fanEngagement/engagementHeatmap.ts           # 新規: ヒートマップ集計
components/mypage/FanEngagementTimelineCard.tsx  # 新規: タイムライン UI
components/mypage/FanEngagementHeatmapCard.tsx   # 新規: ヒートマップ UI
components/mypage/FanThankActionCard.tsx         # 新規: お礼提案カード
components/mypage/CreatorReadyHomeRoute.tsx       # 応援可視化セクション追加
app/api/mypage/fan-engagement/route.ts           # 新規 or 既存 dashboard 拡張
```

---

## ハイライト要約の設計

単一文で返す。例：
- 「今週は 3 人から支援があり、"制作裏話"の投稿に反応が集中しています。」
- 「今月の応援ペースは先月より 20% 増えています。」

数字 + 意味の組み合わせで「何が評価されたか」を伝える。

---

## Acceptance Criteria

- [ ] Creator Home に応援タイムライン（直近 5 件）が表示される
- [ ] 応援ヒートマップで「いつ応援が多いか」が視覚的に分かる
- [ ] 今週のハイライト要約が 1 文で表示される
- [ ] 未返礼 Contribution があれば「お礼を送る」が提案される
- [ ] お礼提案からワンタップで AI 下書き → Compose 起動できる
- [ ] データがない場合のフォールバック表示がある

---

## Risks

- お礼アクション提案が毎回同じ Contribution を対象にするリスク
  → 最近の Contribution から「まだお礼していない」ものを優先フィルター
- ヒートマップのデータが少ない初期ユーザーに空表示になる
  → 7 件未満の場合は「データが溜まると表示されます」プレースホルダー

---

## Validation

```bash
npm run lint
npm run typecheck
npm run build
```

手動確認:
- Contribution あり / なしの両状態でタイムライン表示
- ヒートマップのデータ整合（曜日・時間帯）
- お礼 AI 下書き → Compose 引き渡しのフロー
