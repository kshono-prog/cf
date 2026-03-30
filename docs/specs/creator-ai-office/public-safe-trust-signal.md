# AM-39: Public-safe Trust Signal

## 目的

公開ページ（`/[username]/manager/[slug]`）に表示できる「運用品質の信頼指標」を定義する。
外部の訪問者が AI マネージャーの透明性・安定性・運用スタイルを把握できるようにしながら、
内部財務・決済情報は一切露出しない。

---

## 公開可能（Safe）なシグナル

| フィールド | 型 | 理由 |
|---|---|---|
| `disclosurePolicy` | `ALWAYS_DISCLOSE_AI \| DISCLOSE_ON_PUBLIC_ACTION` | owner が意図的に設定した公開姿勢。財務情報を含まない |
| `archetype` | enum | 人格タイプ。公開プロフィールの核心 |
| `tone` | enum | コミュニケーションスタイル。公開済み |
| `supportStyle` | enum | 支援スタイル。公開済み |
| `specialties` | string[] | owner が入力した得意分野。公開済み |
| `updatedAt` | string (ISO) | 設定更新日。「最近メンテされているか」の間接的な鮮度指標 |
| `primaryLanguage` | string | 対応言語。公開済み |

### `disclosurePolicy` のラベルと説明

| 値 | 表示ラベル | ユーザー向け説明 |
|---|---|---|
| `ALWAYS_DISCLOSE_AI` | 常に AI であることを明示 | この AI マネージャーは、すべての公開発信で AI であることを自動的に明記します |
| `DISCLOSE_ON_PUBLIC_ACTION` | 公開行動時に AI を明示 | 公開への直接的なアクション時に AI であることを明記します |

---

## 公開不可（Unsafe）なシグナル

以下は `SerializedPublicAiManagerProfile` には含まれていないが、念のため明示する。

| 情報 | 理由 |
|---|---|
| `billingPolicyStatus` | 財務運営状態。停止中かどうかを外部に見せない |
| `status` (ACTIVE/PAUSED) | 内部運営状態。停止中は公開ページ自体が表示されない（`serializePublicAiManagerProfile` が `null` を返す） |
| x402 pending 件数・金額 | 決済内部状態 |
| `budgetWalletAddress` | ウォレットアドレス |
| `managerActivityWalletAddress` | 同上 |
| AgentTask 件数・成功率 | 内部運用指標。外部に見せる根拠がない |
| `freeTierScope` / `allowedBillableCapabilities` | 課金構成の詳細 |

---

## 実装方針

### `PublicAiManagerProfilePageBody` への追加

`SerializedPublicAiManagerProfile` から取れるフィールドのみを使い、
**「透明性ポリシー」セクション**を追加する。

- `disclosurePolicy` → ラベル + 説明文を表示
- `updatedAt` → 「設定最終更新」として表示（年月日のみ）
- セクションタイトル: **Trust Signal**

### `PublicProfileAiManagerCard` への追加

コンパクトカードには `disclosurePolicy` バッジのみ追加する（1 行）。

---

## 変更対象ファイル

- `components/profile/PublicAiManagerProfilePageBody.tsx` — Trust Signal セクション追加
- `components/profile/PublicProfileAiManagerCard.tsx` — disclosurePolicy バッジ追加

## 変更しないファイル

- `lib/serializers/aiManager.ts` — 型変更なし
- Prisma schema — 変更なし
- API routes — 変更なし
