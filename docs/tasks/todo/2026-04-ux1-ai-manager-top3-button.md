# UX-1: AIマネージャー呼び出しボタン & Top3 タスク表示

**Phase**: MVP
**Status**: 完了（2026-03-31）
**依存**: なし（既存 `AgentTask` / `dailyBriefing` データを流用）

---

## Goal

Creator Home に「AIマネージャーを呼ぶ」固定 CTA ボタンを設置し、
押すたびに「今の優先タスク Top3」をメタ情報付きで提示する。
クリエイターが「何をすればよいか」を一目で判断できる状態にする。

---

## Scope

- Creator Home（`CreatorReadyHomeRoute.tsx`）に固定 CTA ボタンを追加
- Top3 タスクの導出ロジックを `lib/` に切り出す
  - 優先度（Impact × Urgency）
  - 所要時間（2 分 / 5 分 / 10 分）
  - 難易度（★1〜3）
  - カテゴリ（成長 / 信頼 / 収益 / 関係性）
  - 完了後の効果テキスト
- タスク表示カードコンポーネント（`AiManagerTop3TaskCard`）の新設
- ユーザーフェーズ別の優先ロジック（初期 / 活動中 / 停滞）

---

## Non-Goals

- その場完結 UI（→ UX-2 で対応）
- XP / レベル / バッジ（→ UX-3 で対応）
- 新規 Prisma schema 追加
- 設定画面の非表示化（→ UX-5 で対応）

---

## Files Likely Affected

```
components/mypage/CreatorReadyHomeRoute.tsx      # CTA ボタン追加
components/mypage/AiManagerTop3TaskCard.tsx      # 新規: タスクカード
lib/aiManager/top3Tasks.ts                       # 新規: Top3 導出ロジック
lib/aiManager/taskMeta.ts                        # 新規: タスクメタ定義
```

---

## タスクメタ設計

```ts
type AiManagerTaskMeta = {
  id: string;
  title: string;
  purpose: string;          // なぜ今やるか
  estimatedMinutes: 2 | 5 | 10;
  difficulty: 1 | 2 | 3;   // ★1〜3
  category: "growth" | "trust" | "revenue" | "relationship";
  outcomeLabel: string;     // 完了後の効果テキスト
  actionKind: "inline" | "href" | "settings";
  priority: number;         // Impact × Urgency スコア
};
```

---

## 優先ロジック

| フェーズ判定 | 優先タスク |
|---|---|
| プロフィール未完 or Goal 未設定 | 迷い削減タスク（プロフィール / Goal 設定） |
| 承認待ち AgentTask あり | AI 事務所 Inbox タスク |
| 投稿停滞（7 日以上） | 近況共有 / 発信タスク |
| 活動中（上記なし） | 関係性タスク（お礼 / 進捗共有） |
| 停滞判定（30 日以上活動なし） | 最小行動タスク（1〜2 分で終わるもの） |

---

## Acceptance Criteria

- [ ] Creator Home に「AIマネージャーを呼ぶ」CTA が常時表示される
- [ ] 押すと優先タスク Top3 が目的・時間・効果付きで表示される
- [ ] ユーザーフェーズ（初期 / 活動中 / 停滞）に応じてタスク種別が変わる
- [ ] データがない場合のフォールバック表示がある
- [ ] 既存の `DAILY_ACTION_PLAN` AgentTask と重複しない（補完関係）

---

## Risks

- 既存の `CreatorReadyAiManagerSection` との責務重複
  → Top3 ボタンは「呼び出し」、既存カードは「AI 提案結果」として明確に分ける
- タスク導出ロジックが肥大化するリスク
  → `lib/aiManager/top3Tasks.ts` に閉じ込め、コンポーネントから分離する

---

## Validation

```bash
npm run lint
npm run typecheck
npm run build
```

手動確認:
- プロフィール未設定状態で Top3 を確認
- 承認待ち AgentTask がある状態で Top3 を確認
- 停滞ユーザー（投稿なし / 活動なし）で Top3 を確認
