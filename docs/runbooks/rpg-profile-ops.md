# RPG プロフィール機能 運用ランブック

**作成日**: 2026-04-02
**対象機能**: RPG型プロフィール（EXP・レベル・バッジ・活動ログ）

---

## 監視指標

| 指標 | 確認方法 | 目標値 |
|---|---|---|
| `RPG_409_DUPLICATE_EVENT` エラー率 | APIログ / Supabase | < 0.1% |
| `RPG_429_DAILY_EXP_CAP_REACHED` 発生数 | APIログ | 正常範囲内（≤ 1日300EXP設計） |
| `RPG_500_INTERNAL_ERROR` 発生率 | APIログ | 0% 目標 |
| EXP付与成功率 | `rpg_exp_events` 件数推移 | 安定増加 |
| プロフィールAPI p95レスポンス | `/api/rpg/profile` | < 1000ms |
| バッジ獲得率 | `user_rpg_badges` / `rpg_badges` | モニタリング |

---

## DBクエリ（異常検知用）

```sql
-- 1日の EXP 付与集計（上位ユーザー、不正検知）
SELECT creator_profile_id, SUM(awarded_exp) AS total
FROM rpg_exp_events
WHERE occurred_at >= NOW() - INTERVAL '1 day'
GROUP BY creator_profile_id
ORDER BY total DESC
LIMIT 20;

-- 日次上限到達ユーザー数
SELECT COUNT(DISTINCT creator_profile_id)
FROM rpg_daily_exp_summaries
WHERE date = CURRENT_DATE AND awarded_exp >= 300;

-- idempotency key 重複（存在しないはずだが確認用）
SELECT idempotency_key, COUNT(*) AS cnt
FROM rpg_exp_events
GROUP BY idempotency_key
HAVING COUNT(*) > 1;

-- 今日獲得バッジ数
SELECT badge_code, COUNT(*) AS cnt
FROM user_rpg_badges
WHERE earned_at >= CURRENT_DATE
GROUP BY badge_code
ORDER BY cnt DESC;

-- レベル分布
SELECT level, COUNT(*) AS users
FROM user_rpg_profiles
GROUP BY level
ORDER BY level;
```

---

## feature flag 運用

現在この機能には専用の feature flag はない。
将来的にフラグが必要になった場合は以下の方針で実装する:
- `process.env.NEXT_PUBLIC_RPG_ENABLED` フラグを `lib/publicEnv.ts` に追加
- フロントエンド側で `RpgProfileTab` のレンダリングを条件付きに切り替える
- バックエンド側で `/api/rpg/*` を 503 で返すミドルウェアを追加

---

## マスタデータ更新手順

バッジ・称号・EXPルールの追加は seed ファイルを更新して `npm run db:seed` を実行する。

```bash
# マスタデータ再投入（upsert なので安全）
npm run db:seed
```

バッジ追加例（`prisma/seed.ts` の `seedRpgMasterData` に追記）:
```typescript
{ badgeCode: "NEW_BADGE", nameJa: "新バッジ名", descriptionJa: "説明", conditionTextJa: "条件テキスト", rarity: "RARE", sortOrder: 11 }
```

---

## EXP ルール変更手順

1. `prisma/seed.ts` の `expRules` 配列を更新
2. `npm run db:seed` で反映
3. 既存の `rpg_exp_events` は変更しない（過去の付与は維持）
4. 変更は翌日以降の新規イベントから有効

---

## 緊急対応（EXP 不正付与が発見された場合）

1. 対象ユーザーを特定: `rpg_exp_events` テーブルで `idempotency_key` パターンを確認
2. `enabled = false` を `rpg_exp_rules` に設定してそのイベントタイプを無効化
3. 不正イベントを `rpg_exp_events` から削除し `rpg_daily_exp_summaries` を再計算
4. `user_rpg_profiles` の `current_exp / total_exp / level` を手動で更新
5. インシデントレポートを `docs/reviews/` に記録

---

## バックアップ

RPG テーブルはすべて Supabase Postgres に保存されており、Supabase の自動バックアップポリシーが適用される。
追加のバックアップ設定は不要。
