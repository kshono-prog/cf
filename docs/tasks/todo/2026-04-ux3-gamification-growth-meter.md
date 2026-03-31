# UX-3: 完了演出・ゲーミフィケーション基盤

**Phase**: Phase 2
**Status**: 完了（2026-04-01）
**依存**: UX-1, UX-2（インライン完了フローが成立していること）

---

## Goal

タスク完了時の「成長が見える」演出と、
使うほど育つ 5 軸成長メーターを実装する。
「何をするとどの軸が伸びるか」を明示し、行動学習を促進する。

---

## Scope

### 1. 完了演出（ゲーム感）
- 完了時の XP 付与アニメーション（軽量 CSS）
- バッジ / 称号の条件定義と表示
- 連続達成ストリーク（日次・週次）カード
- 「今日の成果カード」自動生成（SNS 共有テキスト付き）

### 2. 5 軸成長メーター（read-only 派生）
| 軸 | 派生元データ |
|---|---|
| Creator Skill | 投稿数・継続日数 |
| Page Growth | プロフィール完成度・Goal 設定状況 |
| Trust | Contribution 数・AI Manager 運用スコア |
| Fan Energy | 支援者数・メッセージ反応数 |
| Opportunity | Stage 成熟度・ExternalContact 数 |

DB 追加不要。既存データからの派生値として計算する。

### 3. 機能解放型 進行表示
- 現在のレベルと次のレベルまでの条件を表示
- 解放済み機能のバッジを Creator Home に表示

---

## Non-Goals

- XP・レベルの永続 DB 保存（Phase 2 では derived 値として計算）
- 外部ゲーミフィケーションライブラリの導入
- リアルタイムソケット更新

---

## Files Likely Affected

```
lib/gamification/growthMeter.ts              # 新規: 5軸スコア導出
lib/gamification/streakCalc.ts              # 新規: ストリーク計算
lib/gamification/levelSystem.ts             # 新規: レベル・XP・機能解放定義
components/mypage/GrowthMeterDisplay.tsx    # 新規: 5軸メーター UI
components/mypage/AiManagerStreakCard.tsx   # 新規: 連続達成カード
components/mypage/TodayAchievementCard.tsx # 新規: 今日の成果カード（SNS 共有）
components/mypage/CreatorReadyHomeRoute.tsx # メーター・ストリーク表示追加
```

---

## スコア設計例

```ts
type GrowthMeterScores = {
  creatorSkill: number;  // 0-100
  pageGrowth: number;
  trust: number;
  fanEnergy: number;
  opportunity: number;
};

type LevelInfo = {
  level: number;
  xp: number;
  nextLevelXp: number;
  unlockedFeatures: string[];
  nextUnlock: string | null;
};
```

---

## 機能解放定義（初期案）

| レベル | 必要 XP | 解放機能 |
|---|---|---|
| 1 | 0 | 基本機能（デフォルト） |
| 2 | 100 | 投稿テンプレ拡張（カテゴリ別） |
| 3 | 300 | AI 提案精度 UP（追加コンテキスト送信） |
| 4 | 700 | サポーター分析（Fan Energy 詳細） |
| 5 | 1500 | 仕事接続機能（Opportunity CRM 強化） |

---

## Acceptance Criteria

- [ ] Creator Home に 5 軸成長メーターが表示される
- [ ] タスク完了時に XP アニメーションが動作する
- [ ] 連続達成ストリーク（日次）が表示される
- [ ] 今日の成果カードに SNS 共有テキストが生成される
- [ ] 現在レベルと次のレベル解放条件が表示される
- [ ] 新規 Prisma schema なしで動作する（既存データ派生）

---

## Risks

- スコア計算ロジックが複雑になりすぎる
  → Phase 2 は簡易版（各軸 0-100 の線形スコア）から始める
- SNS 共有カードのコピーが古くなる
  → 生成テキストはサーバー側でなく、クライアント側で即時生成する

---

## Validation

```bash
npm run lint
npm run typecheck
npm run build
```

手動確認:
- タスク完了後の XP アニメーション動作
- 5 軸メーターの数値がプロフィール / 投稿状況と整合しているか
- SNS 共有テキストの内容確認
