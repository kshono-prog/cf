# AM-40: AI Manager 応援アクション導線 MVP

**Phase**: MVP
**Status**: ready
**依存**: 既存 `AI Manager` 公開面 / 既存 `Contribution` フロー / 既存 `purposeId` deep-link

---

## Goal

公開プロフィールと AI Manager 紹介ページ上で、
「AIマネージャーと一緒に creator 活動を応援する」という意味づけを追加する。

既存の支援導線を壊さず、
supporter が `何を応援するか` を理解したうえで支援し、
AI Manager がその支援の文脈を案内していると分かる状態を作る。

この issue では、機能コンセプト全体を一度に実装しない。
まずは **支援前の意味づけと公開導線** を MVP として成立させる。

---

## Scope

### 1. 公開面に `AI Manager 応援アクション` カードを追加

- 公開プロフィールの `AI Manager` カード、またはその近傍に
  `AIマネージャーと一緒に応援する` セクションを追加
- `/<creator>/manager/<slug>` の AI Manager 紹介ページにも同等の導線を追加
- copy は次を明確にする
  - 支援先はあくまで creator / project である
  - AI Manager は支援金の受益者ではない
  - AI Manager は「次に進めたいことの案内役・整理役」である

### 2. 既存 `Purpose` を `応援テーマ` として見せる

- 既存 `Purpose` をそのまま内部用語で見せるのではなく、
  supporter に分かる `応援テーマ` として表示する
- 対象は、現在募集中の project から最大 3 件まで
- 表示内容:
  - テーマ名
  - 1 行 helper copy
  - `このテーマで応援する` CTA
- CTA は既存支援導線に deep-link し、`projectId` / `purposeId` を引き継ぐ

### 3. `いま応援がどう活きるか` の補助説明を出す

- 各テーマに対して、AI Manager 視点の短い補助文を出す
- 例:
  - `制作を続けるための準備や整理に使いたい応援です`
  - `次の発信や報告につながる応援です`
  - `イベント準備や現場対応を前に進めるための応援です`
- helper copy は既存 Purpose の label / description を優先し、
  不足時のみ rule-based な短文で補う

### 4. 公開面に `最近の支援活動` とのつながりを持たせる

- 既存の public-safe `recent support activity summary` を、
  新しい応援アクション導線の近くで再利用する
- 「支援すると何が起きるか」が 0 からの想像にならないよう、
  直近の活動証跡を 1 件以上見せる
- データがない場合は、
  `支援が入ると AIマネージャーが進め方や近況共有を案内します`
  などのプレースホルダー文言を表示する

### 5. 用語と境界の安全化

- `AI が支援金を使う` という誤解を生む copy は避ける
- `還元` よりも `活動報告` `進捗共有` `次に進めたいこと` を優先する
- AI disclosure を既存 public policy と矛盾なく表示する

---

## Non-Goals

- 新しい payment rail や wallet 境界の追加
- `Contribution` とは別の「AI Manager 専用課金」導線
- AI による自動支出、自動分配、自動 bridge 実行
- supporter 向けの金銭的リターン設計
- 新規 `AgentTask` type の追加
- 新規 Prisma schema 追加
- owner / manager 向け内部運用 UI の追加

---

## Files Likely Affected

```ts
components/profile/AiManagerSupportActionCard.tsx     // 新規: 公開面で使い回す共有カード
components/profile/PublicProfileAiManagerCard.tsx     // 公開プロフィール導線の接続
components/profile/PublicAiManagerProfilePageBody.tsx // AI Manager 紹介ページ導線の接続
components/layout/PublicWorkspaceRightRail.tsx        // 表示位置の調整が必要な場合
lib/aiManager/supportActionThemes.ts                  // 新規: Purpose -> 応援テーマ変換
lib/publicPageData.ts                                 // 公開面へ必要データを渡す場合
components/profile/ProfileWalletClient.tsx            // deep-link 着地の微調整が必要な場合
```

---

## Acceptance Criteria

- [ ] 公開 AI Manager が表示される creator では、公開面に `AIマネージャーと一緒に応援する` 導線が出る
- [ ] 導線には既存 project / purpose をもとにした `応援テーマ` が最大 3 件表示される
- [ ] 各テーマ CTA から既存支援導線へ遷移でき、`purposeId` が維持される
- [ ] copy で「支援先は creator / project」「AI Manager は案内役」が明示される
- [ ] 直近の public-safe な支援活動、または妥当なプレースホルダーが表示される
- [ ] Purpose が 0 件でも generic な `creator を応援する` CTA でフォールバックする
- [ ] owner-only 情報、billing 情報、wallet 情報、内部運用状態は一切公開しない

---

## Risks

- `AI Manager に支援している` と誤解されるリスク
  - copy で受益者を creator / project と明示する
- Purpose 名が内部用語のままだと supporter に伝わりづらいリスク
  - UI では `応援テーマ` として再ラベルし、短い helper copy を添える
- `支援したら必ず特典が返る` ように読まれるリスク
  - 報酬表現ではなく、活動支援・進捗共有・公開案内に寄せる
- 公開プロフィールと AI Manager 紹介ページで実装が二重化するリスク
  - shared card / shared mapper で構造を揃える

---

## Validation

```bash
npm run lint
npm run typecheck
npm run build
```

手動確認:
- 公開 AI Manager あり / なしで表示分岐を確認
- Purpose あり / なしで CTA と helper copy を確認
- CTA から既存支援導線へ遷移し、`purposeId` が保たれることを確認
- 公開面に owner-only 情報が混入していないことを確認
- モバイル幅でカードが破綻しないことを確認
