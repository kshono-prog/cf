# UX-2: インライン実行 UI（その場完結）

**Phase**: MVP
**Status**: 完了（2026-03-31）
**依存**: UX-1（Top3 タスク表示）

---

## Goal

Top3 タスクの「この場でやる」ボタンを押すと、
画面遷移なしにモーダル / サイドパネルで完結できる UI を実装する。
入力補助（テンプレート・AI 下書き）と 1 アクション保存を提供し、
完了後に即フィードバックを返す。

---

## Scope

最低 2 種類のインライン実行 UI を実装する:

### パターン A: プロフィール 1 文追加
- モーダルで紹介文 textarea を表示
- AI 下書き CTA（既存 `/api/ai/profile-draft` 流用）
- 保存で `CreatorProfile.bio` を即時更新

### パターン B: 進捗投稿の作成
- サイドパネルで AI 下書き → 投稿 Compose へ引き渡し
- 既存 `postingComposeHandoff.ts` を流用
- 完了後に「投稿しました」フィードバック

### 共通 UI 仕様
- 完了後フィードバック表示（例: 「プロフィール充実度 +5%」「Trust +2」）
- `GrowthEvent` 送信（既存 `/api/growth/events` 流用）

---

## Non-Goals

- XP / バッジ等のゲーミフィケーション永続化（→ UX-3 で対応）
- 3 種類以上のインライン実行の同時実装
- 新規 Prisma schema 追加

---

## Files Likely Affected

```
components/mypage/AiManagerInlineTaskModal.tsx         # 新規: 汎用インラインモーダル
components/mypage/AiManagerInlineProfileEditPanel.tsx  # 新規: パターン A
components/mypage/AiManagerInlinePostingPanel.tsx      # 新規: パターン B（既存ハンドオフ流用）
components/mypage/AiManagerTop3TaskCard.tsx            # 「この場でやる」ボタン接続
lib/aiManager/inlineTaskRegistry.ts                    # 新規: タスク種別 → パネル種別マッピング
```

---

## 完了後フィードバック設計

```ts
type InlineTaskCompletionFeedback = {
  message: string;          // 例: "プロフィールを更新しました"
  growthLabel: string;      // 例: "プロフィール充実度 +5%"
  growthEventType: string;  // GrowthEvent に送るイベント種別
};
```

フィードバックは 2〜3 秒のトースト表示 + カード上の完了マーク。

---

## Acceptance Criteria

- [ ] Top3 タスクカードから「この場でやる」を押すとモーダルが開く
- [ ] パターン A（プロフィール編集）がモーダル内で完結する
- [ ] パターン B（投稿作成）がサイドパネル内で完結する
- [ ] 完了後に「何が伸びたか」のフィードバックが即時表示される
- [ ] 既存の設定画面・AI 事務所への遷移なしで完結する
- [ ] キャンセル / 閉じるで元の Home に戻る

---

## Risks

- モーダル内で API エラーが起きた場合のリカバリー導線
  → エラートースト + 「設定画面で確認」リンクをフォールバックとして追加
- `postingComposeHandoff` との責務が重複するリスク
  → インライン UI はエントリー、Compose 本体は既存のまま維持

---

## Validation

```bash
npm run lint
npm run typecheck
npm run build
```

手動確認:
- プロフィール未設定状態でパターン A を開いて保存
- 投稿パネルで AI 下書きを取得して Compose に引き渡し
- モーダル外クリック / Escape でのキャンセル動作
- エラー時のフォールバック表示
