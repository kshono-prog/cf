# RPG型プロフィール機能 実装計画

**作成日**: 2026-04-01
**起票元**: consol.txt（RPG型プロフィール機能 実装仕様書 v1.0 / v1.1）
**対象ユーザー**: Supporter（サポーター）

---

## 北極星

> 「応援している実感」「成長している実感」を提供し、プロフィールを"見せたくなるページ"へ進化させる

継続利用の動機（次の目標）を明確にし、サポーターの長期エンゲージメントを高める。

---

## Goal

サポーター向けにRPG要素（経験値・レベル・称号・バッジ・パラメータ可視化）をプロフィールページに導入する。

## Scope

- `user_rpg_profiles` 等 RPG 関連テーブル追加・マスタ seed
- EXP 付与ロジック（ログイン・支援・コメント・リアクション・達成連携）
- API 実装（プロフィール取得・バッジ・活動ログ・公開設定・称号変更）
- フロント実装（RPGタブ: Lv/EXPバー・ステータスレーダー・バッジ一覧・活動ログ）
- レベルアップ/バッジ獲得演出（トースト・モーダル）

## Non-Goals

- 高度分析ダッシュボード
- イベントクエスト / シーズン制
- ギルド/コミュニティ連携
- 特殊演出の詳細カスタマイズ
- フレンド比較ランキング
- 実績シェアカード自動生成（SNS連携）

---

## Issue 一覧

| ID | タイトル | Phase | 工数目安 |
|---|---|---|---|
| RPG-1 | DB: RPG関連テーブル追加 + seed | Phase 1 | 1.5人日 |
| RPG-2 | BE: EXPイベント受付API + 日次上限判定 | Phase 2 | 1.0人日 |
| RPG-3 | BE: プロフィール取得API（self/public） | Phase 2 | 1.0人日 |
| RPG-4 | BE: バッジ / 活動ログ API | Phase 2 | 0.75人日 |
| RPG-5 | BE: 公開設定更新 / 称号変更 API | Phase 2 | 0.5人日 |
| RPG-6 | BE: 行動イベント連携（ログイン・支援・コメント等） | Phase 3 | 2.0人日 |
| RPG-7 | FE: RPGプロフィールヘッダー（Lv/EXP/称号） | Phase 4 | 0.75人日 |
| RPG-8 | FE: ステータスレーダーチャート | Phase 4 | 0.75人日 |
| RPG-9 | FE: バッジ一覧表示 | Phase 4 | 0.5人日 |
| RPG-10 | FE: 活動ログ一覧 + ページング | Phase 4 | 0.5人日 |
| RPG-11 | FE: 公開設定 / 称号選択 UI | Phase 4 | 1.0人日 |
| RPG-12 | FE: レベルアップ / バッジ獲得 トースト・モーダル | Phase 4 | 0.5人日 |
| RPG-13 | QA: E2E + 公開制御 + 上限判定テスト | Phase 5 | 3.0人日 |
| RPG-14 | Ops: feature flag + モニタリング整備 | Phase 6 | 1.0人日 |

**全体見積（MVP）**: 約 13.75人日（レンジ: 11.0〜15.5人日）

---

## フェーズ別スケジュール（目安）

### Phase 0: 設計確定（1.0人日）
- 仕様レビュー・凍結
- API I/F レビュー（FE/BE 合意）

### Phase 1: DB/バックエンド基盤（3.0人日 ±0.5）
- スキーマ追加（10テーブル）
- マスタデータ seed（レベル要件・バッジ10種・称号・EXPルール）
- リポジトリ / サービス層
- idempotency・日次上限判定ロジック

### Phase 2: API実装（2.75人日 ±0.25）
- `GET /api/profile/rpg`
- `GET /api/users/{userId}/profile/rpg`
- `GET /api/rpg/badges`
- `GET /api/rpg/activity-logs`
- `PATCH /api/rpg/privacy`
- `PATCH /api/rpg/title`
- `POST /internal/rpg/exp-events`

### Phase 3: EXP連携（2.0人日 ±0.5）
- ログイン時 EXP イベント送信
- 支援完了時 EXP イベント送信
- コメント / リアクション連携
- 目標達成時ボーナス連携

### Phase 4: フロント実装（4.0人日、最短 2.5人日〜）
- RPGタブ UI（ヘッダー・レーダー・バッジ・活動ログ）
- 公開設定 / 称号選択
- レベルアップ / バッジ獲得演出

### Phase 5: テスト / 品質保証（3.0人日 ±1.0）
- 単体テスト（サービス・計算ロジック）
- API 結合テスト
- E2E（支援 → EXP → LvUP → 表示反映）
- 権限 / 公開設定テスト

### Phase 6: リリース準備（1.0人日）
- 運用手順・監視項目整備
- feature flag / 段階リリース設定

---

## 仕様詳細

### EXP付与ルール（初期値）

| アクション | EXP | 1日上限 |
|---|---|---|
| ログイン（1日1回） | +10 | 1回 |
| プロジェクト閲覧 | +2/件 | 5件 |
| 初回支援（当該プロジェクト初支援） | +60 | − |
| 支援実行 | +30 | − |
| コメント投稿 | +10/件 | 3件 |
| リアクション | +2/回 | 10回 |
| 週連続支援ボーナス | +40 | − |
| 支援案件の目標達成に立ち会い | +80 | − |

**1日の獲得上限 EXP: 300**

### レベルアップ必要EXP

- Lv1→2: 100
- Lv2→3: 150
- Lv3→4: 220
- Lv4→5: 300
- Lv5以降: 前レベル必要EXP × 1.15（小数点切り上げ）

### 機能解放（レベルゲーティング）

| レベル帯 | 解放内容 |
|---|---|
| Lv1〜5（導入） | Lv/EXPバー・基本バッジ・活動ログ（直近10件） |
| Lv6〜10（定着） | ステータスレーダーチャート・プロフィール背景変更（3種）・月間ふりかえりレポート |
| Lv11〜20（活性） | 称号の手動選択・活動ログのピン留め（1件）・限定スタンプ（コメント用） |
| Lv21以上（上級） | コミュニティバッジ作成・応援履歴詳細分析・季節イベントクエスト参加権 |

### バッジ一覧（初期10種）

| バッジ名 | 取得条件 |
|---|---|
| はじめの一歩 | 初めて支援した |
| 3日ぼうず卒業 | 3日連続ログイン |
| コツコツ応援団 | 7日連続ログイン |
| 新規発掘隊 | 公開7日以内の案件を3件支援 |
| ひとこと名人 | コメント10件 |
| リアクション王 | リアクション50回 |
| 達成の立会人 | 支援案件が1件達成 |
| まごころサポーター | 累計支援5回 |
| 見守り上手 | 同一案件に3回支援 |
| 推し活職人 | Lv.10到達 |

### ステータス5指標（レーダーチャート）

| 指標 | 集計基準 |
|---|---|
| 応援力 | 累計支援額・支援回数 |
| 継続力 | 連続ログイン日数・連続支援週 |
| 発見力 | 新着案件・初期案件への支援数 |
| 共感力 | コメント数・リアクション数 |
| 育成力 | 支援した案件の目標達成件数 |

集計期間: 直近30日（将来的に切替可能）

---

## DB設計（論理）

追加テーブル（Prisma スキーマ）:

| テーブル名 | 役割 |
|---|---|
| `user_rpg_profiles` | ユーザー RPG 状態本体（level / exp / title / privacy） |
| `rpg_level_requirements` | レベルごとの必要 EXP マスタ |
| `rpg_exp_rules` | EXP 付与ルールマスタ（event_type 別） |
| `rpg_exp_events` | EXP 付与イベント履歴（idempotency_key unique） |
| `rpg_daily_exp_summaries` | 日次獲得 EXP 集計（上限判定高速化） |
| `rpg_badges` | バッジマスタ |
| `user_rpg_badges` | ユーザー獲得バッジ（user_id, badge_code unique） |
| `rpg_titles` | 称号マスタ（unlock_level 付き） |
| `user_rpg_titles` | ユーザー解放済み称号 |
| `rpg_activity_logs` | プロフィール表示用アクティビティ（user_id, occurred_at index） |

> **Prisma スキーマ変更は要承認。** 追加前に `prisma:validate` を実行し、マイグレーション影響を記述する。

---

## API一覧

| Method | Path | 説明 |
|---|---|---|
| GET | `/api/profile/rpg` | 自分の RPG プロフィール取得 |
| GET | `/api/users/{userId}/profile/rpg` | 他ユーザー向け（公開情報のみ） |
| GET | `/api/rpg/badges` | バッジマスタ + 獲得状態 |
| GET | `/api/rpg/activity-logs` | 活動ログ（カーソルページング） |
| PATCH | `/api/rpg/privacy` | 公開設定更新 |
| PATCH | `/api/rpg/title` | 現在称号変更 |
| POST | `/internal/rpg/exp-events` | EXP付与（サーバー内部専用） |
| GET | `/api/rpg/monthly-report` | 月次レポート（Lv6+） |

エラーコード: `RPG_400` / `RPG_401` / `RPG_403_LOCKED_BY_LEVEL` / `RPG_409_DUPLICATE_EVENT` / `RPG_429_DAILY_EXP_CAP_REACHED` / `RPG_500`

---

## Files Likely Affected

### 新規作成
- `prisma/schema.prisma` — RPG 関連テーブル追加（要承認）
- `app/api/profile/rpg/route.ts`
- `app/api/users/[userId]/profile/rpg/route.ts`
- `app/api/rpg/badges/route.ts`
- `app/api/rpg/activity-logs/route.ts`
- `app/api/rpg/privacy/route.ts`
- `app/api/rpg/title/route.ts`
- `app/api/rpg/monthly-report/route.ts`
- `app/internal/rpg/exp-events/route.ts`
- `lib/rpg/expService.ts` — EXP付与・上限判定・レベルアップ
- `lib/rpg/badgeService.ts` — バッジ付与・チェック
- `lib/rpg/activityLogService.ts`
- `lib/rpg/statsCalculator.ts` — ステータス5指標計算
- `components/profile/RpgProfileTab.tsx`
- `components/profile/RpgHeader.tsx`
- `components/profile/RpgStatusRadar.tsx`
- `components/profile/RpgBadgeList.tsx`
- `components/profile/RpgActivityLog.tsx`
- `components/profile/RpgPrivacySettings.tsx`
- `components/profile/RpgTitleSelector.tsx`
- `components/shared/LevelUpModal.tsx`
- `components/shared/ExpToast.tsx`

### 既存ファイル（EXPイベント連携のため修正）
- 支援完了フロー（`app/api/contributions/route.ts` 周辺）
- ログインフック
- コメント / リアクション API

---

## Acceptance Criteria

- プロフィールで Lv / EXP / 称号が表示される
- 指定アクションで EXP が正しく加算される
- 1日上限 EXP（300）を超えて加算されない
- レベル条件を満たすと自動で Lv が上昇する
- レベルアップ時に解放機能が有効化される
- バッジ条件達成時に自動で獲得される
- 活動ログに主要イベントが記録される
- 公開設定に応じて他ユーザー表示が変化する
- UI 文言が日本語で統一されている
- 不正な短時間連打で EXP が不正加算されない

---

## Risks

| リスク | 対策 |
|---|---|
| EXP設計が偏ると課金優位になり不公平感 | 行動系EXPを重視。ABテストでEXP配分を検証 |
| 通知/演出過多で疲労感 | 演出は抑制デフォルト。ON/OFF 設定を将来追加 |
| 公開情報が多すぎるとプライバシー懸念 | 公開設定の初期値を安全側（非公開）に設定 |
| Prisma スキーマ変更の影響範囲 | 追加のみ・既存テーブル変更なし。要承認フロー |
| EXP集計のパフォーマンス | `rpg_daily_exp_summaries` で上限判定を O(1) に |

---

## Validation

```bash
# 型・lint チェック
npm run typecheck
npm run lint

# Prisma スキーマ確認（追加後）
npm run prisma:validate

# 単体テスト
TS_NODE_COMPILER_OPTIONS='{"module":"CommonJS","moduleResolution":"Node"}' \
  node --require ts-node/register --require ./tests/register-alias.cjs --test tests/rpg.test.ts

# ビルド確認
npm run build
```

手動確認:
1. サポーターとしてログイン → EXP +10 付与確認
2. プロジェクトを支援 → EXP +30（初回なら +60）確認
3. 1日 300 EXP 上限到達後は加算されないことを確認
4. バッジ条件を満たした後に一覧でカラー表示を確認
5. 公開設定でレベル非公開 → 他ユーザービューで非表示を確認

---

## 監視指標（リリース後）

- DAU/WAU の変化
- 7日継続率・30日継続率
- 1人あたり平均 EXP / 日
- レベル分布の偏り
- バッジ獲得率
- API エラー率（特に 409, 429）
- プロフィール閲覧数（self / public）
