# AI Manager Account 構想書 v0.1

## Status

- active implementation baseline
- additive phase 1 foundation is already shipping in schema / API / settings / creator home / AI Office
- public badged profile surface is implemented as an optional disclosed surface

## Related Docs

- [Vision](/Users/shounokazuaki/cf/docs/roadmap/vision.md)
- [Architecture](/Users/shounokazuaki/cf/docs/architecture.md)
- [Domain Model](/Users/shounokazuaki/cf/docs/domain-model.md)
- [Creator・Manager・AI Office の責任境界](/Users/shounokazuaki/cf/docs/creator-manager-ai-office-responsibility-boundaries.md)
- [Creator AI Office Overview](/Users/shounokazuaki/cf/docs/specs/creator-ai-office/overview.md)
- [AI Office x402 Rollout](/Users/shounokazuaki/cf/docs/specs/creator-ai-office/ai-office-x402-rollout.md)
- [Manager Desk 要件定義](/Users/shounokazuaki/cf/docs/specs/manager-desk/requirements.md)
- [Manager Core Schema Proposal](/Users/shounokazuaki/cf/docs/specs/manager-desk/schema-proposal.md)

## 1. Summary

`AI Manager Account` は、登録ユーザーが自分専属で作成する、
**人格・権限・行動履歴・ウォレット境界を持った AI 運営主体**です。

Creator Founding の現在地は、

- クリエイター本人のプロフィール
- 公開ページ
- Project / Goal
- 支援
- 進捗確認
- AI Office の task / draft / approval

までが成立しています。

次に載せるべきなのは、単発の AI 提案ではなく
**「誰が提案し、誰が動き、どう責任が残るか」**
を担う存在です。

この構想では、登録ユーザーは自分の owner account とは別に、
自分に属する `AI Manager Account` を 1 つ作れます。

その AI Manager は、

- 名前
- キャラクター
- 口調
- 応援スタンス
- 得意分野
- 行動権限
- 情報収集ポリシー
- 行動ログ
- ウォレット境界

を持ち、
Creator Home / AI Office / 公開ページ / 将来の Manager Desk を横断して、
**現実世界と AI 世界の接点**になります。

## 2. Product Definition

### 2-1. 一言でいうと

**登録ユーザーは、自分専属の AI マネージャーを作り、育て、一緒に活動できる。**

### 2-2. この機能が解決すること

- クリエイターが発信、整理、進捗共有、ファン対応を一人で抱え込みすぎる
- AI Office の提案が role 単位で散らばり、「人格」や「責任主体」として見えない
- ファンから見て、活動を案内し続ける存在がいない
- AI がどこまで動いてよいか、どの行動が誰の承認を通ったかが見えにくい
- 将来の外部投稿、情報収集、返信支援、エージェント行動の監査基盤がない

### 2-3. 目指す姿

Creator Founding を、
単なる支援ページ作成アプリから
**AI マネージャーと活動を続けるための Creator OS**
へ進化させる。

## 3. Goals And Non-goals

### 3-1. Goals

- クリエイターごとに、人格を持つ専属 AI 運営主体を持てる
- phase 1 は `creator ごとに 1 体固定` で始められる
- `AI Office` の role-based task 群を、1 人の AI マネージャー配下の capability として再編できる
- `提案 -> 承認 -> 実行 -> 履歴` を actor 単位で追跡できる
- `owner wallet` と `manager activity wallet` の責務境界を持てる
- `AI budget wallet` と `Platform Operations Wallet` の支払い境界を持てる
- AI 利用時の API 課金 + サイト運営維持費を billable usage として扱える
- billable usage を、owner が許可した範囲で AI が自動支払いできる
- ファン向け接点と内部運営補助を同じ人格でつなげられる
- インターネット上の情報収集を、ソース付き・ログ付きで安全に扱える

### 3-2. Non-goals

- AI が creator の代わりに重大な公開判断を自律確定すること
- 契約、支払い、分配、bridge、fund movement を AI マネージャーに委ねること
- 支援金や settlement 資金を AI 利用料の支払い原資にすること
- 人間の Manager を不要にすること
- phase 1 で複数 AI マネージャーを creator ごとに乱立させること
- phase 1 で無制限な web scraping や外部 SNS 自動投稿を許可すること

## 4. Design Principles

### 4-1. AI は人格を持っても、主権は owner に残る

AI Manager は独立した存在感を持つが、
最終主権者は creator owner である。

### 4-2. 可愛いより先に、信頼できる

キャラクター性は重要だが、

- 権限境界
- 承認フロー
- ログ
- 停止可能性

が先に成立している必要がある。

### 4-3. role を捨てず、persona の下に束ねる

現在の `Manager / Promotion / Finance / Fan Relation` は消さない。
これらは `AI Manager Account` の capability set として再利用する。

### 4-4. 提案先行、低リスクのみ段階的自動化

最初から full autonomy にしない。

- phase 1: proposal-first
- phase 2: owner approval required
- phase 3: limited internal auto execution

の順で広げる。

### 4-5. ウォレットは権限境界であり、受益者変更ではない

AI Manager 用ウォレットを導入しても、
それはまず

- 行動記録
- 署名責任
- 将来の agent accountability

のために使う。

既存の creator/project の支援受益構造は変えない。

### 4-6. AI の利用には、明示された対価が伴う

AI Manager がアプリ内機能や AI API を利用する場合、
その利用は無償の魔法ではなく
**billable operational work** として扱う。

課金対象は最低限、

- AI provider API 実費
- Creator Founding のサイト運営維持費

の 2 つを分けて記録できる必要がある。

### 4-7. 支援資金と AI 利用料を混ぜない

AI 利用料の支払いは、

- contribution
- settlement
- distribution
- bridge の途中資産

とは分離する。

AI Manager の自動支払いは、
owner が許可した billable usage budget の中でのみ成立する。

### 4-8. テスト段階は無料範囲と予算消費を併存する

初期のテスト段階では、

- 無料で使える service range
- `AI budget wallet` 残高を使う billable range

を併存させる。

`AI budget wallet` に残高がない場合、
AI Manager は無料範囲でのみ動く。

残高がある場合のみ、
許可された billable capability を AI Manager の裁量で利用できる。

初期の無料範囲は次に固定する。

- 内部ブリーフィング
- ごく軽い簡易下書き

## 5. Role Positioning

### 5-1. Actor の整理

### Creator Owner Account

- 作品と活動方針の最終主体
- AI Manager の作成者
- 権限付与者
- 重大行動の最終承認者

### Human Manager

- 現場、営業、対外調整、実行管理の主体
- `Manager Desk` を使う人間 actor
- AI Manager の補助を受けられるが、置き換えられない

### AI Office

- task / summary / draft / planner を支える共通基盤
- `AI Manager Account` を動かす実務エンジン

### AI Manager Account

- creator に属する AI actor
- 人格、口調、役割、許可範囲を持つ
- AI Office の role-based capability を束ねる公開可能な顔

### 5-2. 既存の三者構造との関係

既存の `Creator / Manager / AI Office` を壊さず、
`AI Manager Account` は **AI Office の actorized surface** として位置づける。

つまり、

- `AI Office` は基盤
- `AI Manager Account` はその基盤上で creator ごとに立つ人格アカウント

という関係にする。

これにより、

- 人間 Manager と名前が衝突しにくい
- 現行 `AgentTask` 基盤を流用しやすい
- 公開ページで「誰が話しているか」を示しやすい

## 6. Core User Experience

### 6-1. 登録後の新しい流れ

1. owner が通常の creator account を作る
2. Project / Goal / 公開ページの土台を整える
3. `AI Manager を作成する` を開始する
4. AI Manager の名前、性格、口調、見た目、役割を決める
5. owner wallet を control wallet として紐づける
6. manager activity wallet を作るか、後回しにするか選ぶ
7. capability と permission を設定する
8. `AI budget wallet` へ JPYC を入れるか、無料範囲のみで始めるか選ぶ
9. 利用上限、課金方法、自動支払いポリシーを設定する
10. `Platform Operations Wallet` への支払い条件を確認する
11. `今日の提案 / 投稿下書き / 返信案 / 情報収集` を AI Manager から受け取る
12. 承認したものだけ実行し、usage と payment を含む行動ログを残す

### 6-2. ファンから見える体験

AI Manager は必要に応じて公開面にも現れる。

例:

- 「Luna が今週の制作ログをまとめました」
- 「Nagi から支援者へのお礼メッセージ案があります」
- 「Atlas がイベント募集情報を整理しました」

ただし公開時には常に、

- AI であること
- owner 管理下であること
- 自動生成か承認済みか

が分かる表示を必須にする。

## 7. Responsibility Model

| 項目 | Creator Owner | Human Manager | AI Manager Account |
| --- | --- | --- | --- |
| 表現の最終判断 | owns | advise | draft only |
| Project / Goal 方針 | owns | advise | summarize / suggest |
| ファン向け文面 | approve | optionally review | draft / later limited send |
| 対外先との交渉 | approve when needed | owns | brief / draft / research |
| 公開投稿 | approve | optionally review | propose / later limited publish |
| 会議準備 | review | co-own | prepare |
| 情報収集 | define policy | optionally guide | execute within policy |
| 分配 / bridge / fund movement | owns | review | forbidden |

### 7-1. AI Manager が担う責務

- 日次ブリーフィング
- 投稿案、告知案、返信案の生成
- 活動進捗の要約
- ファン向けお礼や近況共有の草案
- 公開ページ改善提案
- 関連イベント、話題、募集情報の収集
- 収集した情報の要約と relevance 整理
- 自分が行った提案・実行の履歴説明

### 7-2. AI Manager が担ってはいけない責務

- creator の価値観を上書きすること
- 対外先へ無断送信すること
- 資金移動を提案以上に進めること
- 人間関係の温度感を断定すること
- インターネット上の未確認情報を事実として公開すること

## 8. Permission Model

### 8-1. Permission Tier

```ts
type AiManagerExecutionMode =
  | "PROPOSE_ONLY"
  | "APPROVAL_REQUIRED"
  | "AUTO_INTERNAL"
  | "AUTO_EXTERNAL_FUTURE";
```

### 定義

- `PROPOSE_ONLY`
  - 提案や下書きだけを作る
- `APPROVAL_REQUIRED`
  - owner 承認後のみ実行できる
- `AUTO_INTERNAL`
  - Creator Founding 内の低リスク更新だけ自動で進められる
- `AUTO_EXTERNAL_FUTURE`
  - 将来用。phase 1 では使わない

### 8-2. Action Policy Matrix

| action | default mode | notes |
| --- | --- | --- |
| 日次ブリーフィング生成 | `AUTO_INTERNAL` | 内部表示のみ。必ず log を残す |
| 投稿下書き生成 | `PROPOSE_ONLY` | publish とは分離 |
| 返信案生成 | `PROPOSE_ONLY` | 対外送信は含まない |
| 公開ページ改善提案 | `PROPOSE_ONLY` | 設定変更は owner 承認 |
| CF 内投稿 publish | `APPROVAL_REQUIRED` | phase 1 は owner 明示承認必須 |
| CF 内返信 publish | `APPROVAL_REQUIRED` | phase 2 の opt-in 候補 |
| 外部 SNS 投稿 | `APPROVAL_REQUIRED` | phase 2 以降のみ |
| web research | `AUTO_INTERNAL` | source URL / fetchedAt / query を必須記録 |
| 支払い、分配、bridge | blocked | scope outside |

### 8-3. Quiet Hours And Brand Guardrails

権限は action type だけでなく、
次のポリシーで絞る。

- 深夜投稿禁止
- 外部送信時は必ず owner review
- 特定トピック禁止
- 特定チャネル禁止
- 最大送信頻度
- ソース付きでない主張の公開禁止

## 9. Account And Wallet Model

### 9-1. Identity 分離

phase 1 では、次の 2 アカウントを明示する。

- `Owner Account`
- `AI Manager Account`

`AI Manager Account` は creator に属し、
独立人格として表示されるが、所有権は owner にある。

公開 identity は一般 user と完全同一にしない。
`AI Manager Account` は `/<creator>/manager/<slug>` を持つ creator 配下の public operator page として扱い、
訪問者に「この creator は AIマネージャーと実際に活動している」と伝えるショーケースにする。

### 9-2. Wallet 分離

### Owner Wallet

- 既存の creator owner wallet
- AI Manager 作成の前提
- 権限付与、停止、公開承認の主体

### Manager Activity Wallet

- AI Manager の行動記録用 wallet / account
- 将来の署名付き action log や agent-to-agent activity の土台
- デフォルトでは受益 wallet ではない
- 支援受取や分配先としては使わない

### AI Budget Wallet

- owner が AI Manager のために事前入金する予算 wallet
- 初期通貨は `JPYC`
- AI Manager の billable capability 利用時の支払い原資
- 残高がない場合は無料 service range のみ利用可能
- contribution / settlement / distribution の原資とは分離する

### Platform Operations Wallet

- Creator Founding 運営が保有する受取先 wallet
- AI Manager の billable usage の支払い先
- `AI provider API 実費 + サイト運営維持費` を受け取る
- phase 2 以降の x402 payee wallet 候補
- contribution / settlement / distribution の受取先とは分離する

### 9-3. Service Billing And Auto-pay

AI Manager が有料 capability を利用する場合、
1 回の利用ごとに次の charge を持つ。

- `providerCostUsd`
  - OpenAI など外部 AI API の実費
- `platformFeeUsd`
  - Creator Founding のサイト運営維持費
- `totalChargeUsd`
  - 上記合計

初期の課金体験は、

- テスト段階では無料範囲あり
- 追加利用は `AI budget wallet` の残高から消費
- 通貨は `JPYC`

を基本とする。

支払い先は原則として
**固定の `Platform Operations Wallet` または検証済み x402 payee** に限定する。

### 9-4. Auto-pay Boundary

AI Manager が自動支払いできるのは、次をすべて満たす場合のみ。

- owner が `AUTO_PAY_WITH_CAP` を有効化している
- 支払い対象が billable AI capability に限定されている
- payee が `Platform Operations Wallet` または検証済み x402 endpoint である
- `perAction` / `daily` / `monthly` cap を超えない
- 支払い原資が `AI budget wallet` として分離されている
- `AI budget wallet` に利用可能残高がある

初期 cap は次で開始する。

- `perAction`: `100 JPYC`
- `daily`: `300 JPYC`
- `monthly`: `3000 JPYC`

次には使えない。

- contribution 資金
- project settlement 資金
- distribution 原資
- bridge 対象資産
- owner 未承認の任意 wallet transfer

### 9-5. Phase 別の wallet 取扱い

### Phase 1

- owner wallet のみ必須
- manager activity wallet は optional
- `AI budget wallet` は optional
- wallet がなくても `AI Manager Account` 自体は作れる
- activity wallet 未設定時は internal account id で監査する
- budget wallet 未設定または残高不足時は無料範囲のみ利用
- 無料範囲は `内部ブリーフィング + ごく軽い簡易下書き`
- billable usage は usage meter + 請求プレビュー中心
- 自動支払いはまだ optional preview 扱いでもよい
- 自動実行は内部ブリーフィングのみに留める
- 外部 SNS 連携は対象外

### Phase 2

- policy-limited delegated wallet を optional で追加
- 外部アクションの署名メタデータを残す
- `Platform Operations Wallet` への自動支払いを有効化できる
- x402 が使える surface では x402 を優先する

### Phase 3

- smart account / session key / policy engine を検討
- ただし fund movement には使わない前提を維持する
- billable AI usage のみ機械決済を広げる

## 10. Capability Model

`AI Manager Account` は単一 bot ではなく、
複数 capability を持つ persona account として扱う。

### 10-1. 初期 capability

- `BRIEFING`
- `POST_DRAFTING`
- `FAN_REPLY_ASSIST`
- `PROGRESS_SUMMARY`
- `WEB_RESEARCH`
- `PAGE_IMPROVEMENT`

### 10-2. 既存 role との対応

| current role | future meaning under AI Manager Account |
| --- | --- |
| `MANAGER` | daily operations / planning / prioritization capability |
| `PROMOTION` | post / announcement / growth capability |
| `FINANCE` | safe explanatory and planning capability only |
| `FAN_RELATION` | fan communication and supporter care capability |

この対応により、
既存の `AgentTask` と executor 群を大きく崩さずに、
上位概念として `AI Manager Account` を導入できる。

### 10-3. Billable Capability Rule

すべての capability を自動課金対象にしない。

近い将来の billable candidate は次に留める。

- `POST_DRAFTING`
- `FAN_REPLY_ASSIST`
- `PROGRESS_SUMMARY`
- `WEB_RESEARCH`

phase 1 の billable scope も、この 4 つのみとする。

次は billable であっても
**自動資金移動や custody-like behavior と混同しないため**
対象外とする。

- bridge
- distribution
- settlement execution
- arbitrary wallet transfer

## 11. Data Model Proposal

### 11-1. 新しい論理モデル

### `AIManagerAccount`

人格としての AI マネージャー本体。

```ts
type AIManagerAccount = {
  id: string;
  creatorProfileId: bigint;
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "ARCHIVED";
  displayName: string;
  slug: string | null;
  avatarAssetUrl: string | null;
  intro: string | null;
  archetype:
    | "GENTLE_SUPPORTER"
    | "PRODUCER"
    | "ANALYST"
    | "PROMOTER"
    | "FAN_GUIDE";
  publicVisibility: "PRIVATE" | "OWNER_ONLY" | "PUBLIC_BADGED";
  primaryLanguage: string;
  createdAt: string;
  updatedAt: string;
};
```

### `AIManagerPersonaPolicy`

人格・口調・禁止事項・応援スタンス。

```ts
type AIManagerPersonaPolicy = {
  aiManagerAccountId: string;
  tone: "POLITE" | "FRIENDLY" | "ELEGANT" | "ENERGETIC" | "COOL";
  supportStyle: "ENCOURAGING" | "CALM" | "DATA_DRIVEN" | "PROMOTIONAL";
  specialties: string[];
  forbiddenTopics: string[];
  brandGuardrails: string[];
  disclosurePolicy: "ALWAYS_DISCLOSE_AI" | "DISCLOSE_ON_PUBLIC_ACTION";
};
```

### `AIManagerCapabilityGrant`

capability ごとの権限設定。

```ts
type AIManagerCapabilityGrant = {
  id: string;
  aiManagerAccountId: string;
  capability:
    | "BRIEFING"
    | "POST_DRAFTING"
    | "FAN_REPLY_ASSIST"
    | "PROGRESS_SUMMARY"
    | "WEB_RESEARCH"
    | "PAGE_IMPROVEMENT";
  executionMode:
    | "PROPOSE_ONLY"
    | "APPROVAL_REQUIRED"
    | "AUTO_INTERNAL"
    | "AUTO_EXTERNAL_FUTURE";
  status: "ENABLED" | "DISABLED";
  quietHoursStart: number | null;
  quietHoursEnd: number | null;
};
```

### `AIManagerWalletLink`

wallet 境界の定義。

```ts
type AIManagerWalletLink = {
  id: string;
  aiManagerAccountId: string;
  walletAddress: string | null;
  walletRole: "OWNER_CONTROL" | "MANAGER_ACTIVITY";
  custodyType: "OWNER_CONTROLLED" | "POLICY_CONTROLLED";
  status: "PENDING" | "ACTIVE" | "REVOKED";
  createdAt: string;
  revokedAt: string | null;
};
```

### `AIManagerBillingPolicy`

owner が与える billable usage 予算と支払い方針。

```ts
type AIManagerBillingPolicy = {
  aiManagerAccountId: string;
  billingMode: "MANUAL_TOPUP" | "AUTO_PAY_WITH_CAP";
  preferredRail: "X402" | "INTERNAL_LEDGER_FALLBACK";
  sourceWalletAddress: string | null;
  currency: "JPYC";
  freeTierEnabled: boolean;
  freeTierScope: "BRIEFING_AND_LIGHT_DRAFTS";
  monthlyJpycCap: string;
  dailyJpycCap: string;
  perActionJpycCap: string;
  allowedBillableCapabilities: Array<
    "POST_DRAFTING" | "FAN_REPLY_ASSIST" | "PROGRESS_SUMMARY" | "WEB_RESEARCH"
  >;
  status: "ACTIVE" | "PAUSED";
};
```

### `PlatformBillingDestination`

運営の受取先定義。

```ts
type PlatformBillingDestination = {
  id: string;
  destinationType: "PLATFORM_OPERATIONS";
  rail: "X402" | "INTERNAL_LEDGER";
  currency: "JPYC";
  walletAddress: string | null;
  endpointUrl: string | null;
  active: boolean;
};
```

### `AIManagerAction`

AI Manager が何をしたかの実行ログ。

```ts
type AIManagerAction = {
  id: string;
  aiManagerAccountId: string;
  creatorProfileId: bigint;
  projectId: bigint | null;
  actionType:
    | "BRIEFING_GENERATED"
    | "POST_DRAFT_CREATED"
    | "REPLY_DRAFT_CREATED"
    | "WEB_RESEARCH_COMPLETED"
    | "PUBLIC_POST_REQUESTED"
    | "PUBLIC_POST_PUBLISHED"
    | "APPROVAL_REQUESTED"
    | "APPROVAL_GRANTED"
    | "APPROVAL_REJECTED";
  status: "LOGGED" | "WAITING_APPROVAL" | "DONE" | "REJECTED";
  summary: string;
  outputRefId: string | null;
  approvedByWalletAddress: string | null;
  createdAt: string;
};
```

### `AIManagerUsageRecord`

AI Manager の有料利用メーター。

```ts
type AIManagerUsageRecord = {
  id: string;
  aiManagerAccountId: string;
  aiManagerActionId: string | null;
  capability:
    | "POST_DRAFTING"
    | "FAN_REPLY_ASSIST"
    | "PROGRESS_SUMMARY"
    | "WEB_RESEARCH";
  provider: string;
  model: string | null;
  providerCostUsd: string;
  platformFeeUsd: string;
  totalChargeUsd: string;
  billingState:
    | "METERED"
    | "PAYMENT_PENDING"
    | "SETTLED"
    | "FAILED"
    | "WAIVED";
  createdAt: string;
};
```

### `AIManagerPaymentAttempt`

自動支払いまたは x402 決済の試行記録。

```ts
type AIManagerPaymentAttempt = {
  id: string;
  usageRecordId: string;
  rail: "X402" | "INTERNAL_LEDGER";
  payerWalletAddress: string | null;
  payeeWalletAddress: string | null;
  txHash: string | null;
  status: "PENDING" | "CONFIRMED" | "FAILED";
  failureReason: string | null;
  createdAt: string;
};
```

### `AIManagerBudgetBalance`

AI Manager が消費できる事前入金残高。

```ts
type AIManagerBudgetBalance = {
  aiManagerAccountId: string;
  currency: "JPYC";
  availableAmount: string;
  reservedAmount: string;
  updatedAt: string;
};
```

### `AIManagerBudgetTransaction`

owner の top-up / deduction と、AI usage settlement による残高変動の監査線。

```ts
type AIManagerBudgetTransaction = {
  id: string;
  aiManagerAccountId: string;
  usageRecordId: string | null;
  direction: "CREDIT" | "DEBIT";
  transactionType:
    | "OWNER_TOP_UP"
    | "OWNER_DEDUCTION"
    | "USAGE_SETTLEMENT";
  currency: "JPYC";
  amount: string;
  resultingAvailableAmount: string;
  note: string | null;
  actorAddress: string | null;
  createdAt: string;
};
```

### `AIManagerSourceRecord`

web research の証跡。

```ts
type AIManagerSourceRecord = {
  id: string;
  aiManagerActionId: string;
  sourceType: "WEB" | "INTERNAL" | "MANUAL_NOTE";
  title: string | null;
  url: string | null;
  publisher: string | null;
  fetchedAt: string;
  snippet: string | null;
  confidenceLabel: "LOW" | "MEDIUM" | "HIGH";
};
```

### 11-2. 現行 schema との接続方針

phase 1 では、
新モデルを一気に実装するより
既存資産を次のように束ねるのが現実的。

| existing model | phase 1 role in AI Manager Account world |
| --- | --- |
| `AiAgent` | capability worker。将来 `aiManagerAccountId` を持つ候補 |
| `AgentTask` | 提案 / approval / execution request の work unit |
| `AgentTaskAuditLog` | approval / handoff / follow-through log |
| `ActionLog` | cross-surface activity history |
| `Post` / `Reply` | AI Manager が関与した公開行動の出力先 |
| `ManagerAssignment` | human manager relationship。AI Manager とは別概念 |
| `AiPromotionJob.executionCostUsd / billable / billingStatus` | usage metering 設計の先行フィールド |

### 11-3. 推奨 migration 方針

- additive only
- まず `AIManagerAccount` を導入し、creator ごとに 1 primary record を作れるようにする
- 次に `AiAgent` に `aiManagerAccountId` を追加し、既存 role-based agent を配下へ寄せる
- `AgentTask` には `aiManagerAccountId` と `capability` snapshot を追加する
- `Post` / `Reply` は現行 `aiAgentId` を維持しつつ、将来 `aiManagerAccountId` を併存追加する
- billable usage は `UsageRecord -> PaymentAttempt` の 2 段階で additive に入れる
- x402 payee registry は settlement 系 registry と分離する
- `AI budget wallet` 残高 read model を持ち、budget 不足時は無料範囲へフォールバックする

この順序なら rollback も比較的容易で、
既存 role-based UI を急に壊さない。

## 12. Screen And Surface Spec

### 12-1. Creator Home

### 新規セクション

- `My AI Manager` card
- 今日の気分 / 重点 / 提案
- 直近の AI Manager activity
- `承認待ち` 件数

### 主な CTA

- `AI Manager を作る`
- `Luna に今日の提案を出してもらう`
- `承認待ちを見る`
- `設定を開く`

### 12-2. AI Manager Creation Flow

初回 wizard は 6 step を推奨する。

1. `Identity`
   - 名前
   - アイコン
   - archetype
2. `Voice`
   - 口調
   - 温度感
   - 応援スタンス
3. `Work Scope`
   - 投稿下書き
   - 返信案
   - 情報収集
   - ページ改善
4. `Permission`
   - 提案のみ
   - 承認後実行
   - quiet hours
5. `Wallet & Accountability`
   - owner wallet 確認
   - manager activity wallet 設定
   - disclosure policy
6. `Billing`
   - JPYC 予算の入金
   - `100 / 300 / 3000 JPYC` cap の確認
   - capability ごとの課金許可
   - x402 優先か internal ledger fallback か
   - 残高ゼロ時は無料範囲のみで動くことの確認

### 12-3. AI Office

AI Office は `AI Manager` の仕事場になる。

追加要件:

- task 起票時に `どの AI Manager が行うか` を明示する
- role ではなく `manager persona + capability` で見せる
- 承認待ち一覧に `人格名` と `action boundary` を表示する
- research task には source list を必須表示する
- billable task には `provider cost / platform fee / total` を表示する
- auto-pay 対象 task には `cap 内かどうか` を表示する
- 残高不足時は `無料範囲のみ` の notice を出す

### 12-4. Public Profile

phase 1 は optional surface とする。

phase 1 implementation:

- `PUBLIC_BADGED` かつ `ACTIVE` の AI Manager のみ表示
- 公開プロフィール上で `AI Manager` disclosure card を表示
- owner-only の budget / wallet / billing ledger は公開しない

表示候補:

- `Managed by Luna` badge
- AI Manager の短い自己紹介
- AI Manager がまとめた最新進捗
- public-safe な recent support activity summary
- AI であることの disclosure
- `/<creator>/manager/<slug>` の専用紹介ページ
- 専用紹介ページには creator の current project progress と support CTA を含める

公開面の原則:

- AI と明示する
- owner 管理下と明示する
- 自動生成か承認済みかを分ける
- 独立 user page ではなく creator 配下の showcase にする
- 「本当に creator を支えている」証拠を置く

### 12-5. Manager Desk

Human Manager がいる場合の追加表示:

- creator ごとの AI Manager 状況
- 最近の AI 提案採用率
- AI が収集した外部情報の要約
- human manager から AI Manager への補足 guidance

phase 1 implementation:

- Creator Detail に `AI Manager / Boundary` read-only section を表示
- human manager は人格、公開状態、稼働モード、許可 capability を閲覧のみできる
- owner / manager / AI の責務境界を同一画面で明示する
- 予算残高、wallet address、budget ledger、設定編集は manager に公開しない

ただし、phase 1 では
persona 編集権限は owner のみとし、
human manager は閲覧と運営補助に留める。

### 12-6. Review And Log Surface

AI Manager には専用の activity log が必要。

最低限見たいもの:

- いつ何を提案したか
- 何が承認されたか
- 何が却下されたか
- どの情報源を参照したか
- どの wallet / actor で承認されたか
- いくら課金されたか
- どの rail で支払われたか

## 13. Research And Internet Collection Policy

AI Manager に web 収集を持たせる場合、
phase 1 から次を必須にする。

- source URL を保存する
- fetchedAt を保存する
- query / 収集意図を保存する
- AI の要約と原文ソースを分離する
- 未確認情報を断定口調で公開しない
- 禁止ドメイン / 許可ドメイン設定を持てる
- robots / terms に反する取得を前提にしない

phase 1 の確定方針:

- Web収集は `手動トリガー時のみ`
- 自動巡回や常時監視は行わない
- 後続 phase で `許可ドメイン制` へ広げるかを再判断する

公開前の要件:

- 重要な事実主張を含む文面は source 参照可能であること
- 日付依存情報には freshness を明示すること

billable research の要件:

- usage meter を残す
- `providerCostUsd / platformFeeUsd / totalChargeUsd` を分離記録する
- x402 決済時は payee と settlement result を追跡する

## 14. Roadmap

### 14-1. Phase A — Persona And Safe Accountability

目的:

- `AI Manager Account` の identity を作る
- creator ごとに 1 persona を持てるようにする
- owner wallet と permission policy を結びつける

範囲:

- AI Manager 作成 wizard
- persona / voice / guardrail 設定
- Creator Home の `My AI Manager` card
- AI Office task に manager identity 表示
- activity log の最小版
- `owner only default` visibility
- human manager は閲覧のみ

### 14-2. Phase B — Proposal-first Workflows

目的:

- AI Manager を日次運営に参加させる

範囲:

- 投稿下書き
- 返信案
- 進捗要約
- ページ改善提案
- fan relation 提案
- 承認待ちキューの persona 化
- usage metering と charge preview
- `AI budget wallet` 残高による無料/有料分岐
- 無料範囲は `内部ブリーフィング + ごく軽い簡易下書き`
- owner-facing `real wallet top-up / x402 readiness` surface を Settings に追加済み
- `AI budget wallet` の top-up 先と `Platform Operations Wallet` の settlement payee を分けて表示
- funding instructions に `verified payee registry` の `payee id / label / verification status` を含める
- real wallet top-up の `txHash / amount / source wallet` を evidence として記録し、owner-operated ledger top-up に紐づけられる
- x402 ready な usage は `PAYMENT_PENDING` として残し、owner が settlement `txHash` を確認してから `CONFIRMED / FAILED` に進める
- owner-facing reconciliation summary で `pending x402 / failed x402 / unmatched top-up evidence / latest confirmed` を常時確認できる
- Settings / Creator Home / AI Office では stale pending x402 / failed settlement / unmatched top-up evidence を `owner follow-up` としてまとめ、次の手動アクションを明示する
- payment attempt event ledger を追加し、`billing system / owner review / x402 connector` の delivery events を recent event として追えるようにする
- pending x402 queue には最後の delivery event を表示し、単なる経過時間だけでなく connector-side activity の有無も owner が読めるようにする
- reconciliation summary にも latest pending x402 event を持たせ、Home / Settings / AI Office の要約面を event-aware に保つ
- pending x402 delivery-status 自体も latest event を参照し、古い attempt でも最近 connector event がある場合は `ACTIVE / WATCH` を維持できるようにする
- server-only external x402 connector から still-pending settlement の polling check-in を受け、`PENDING_OBSERVED` event として additive に残せるようにする
- 短時間の重複 polling check-in は suppress し、event ledger をノイジーにしすぎない
- owner follow-up も latest event source を参照し、`x402 connector / owner review / funding evidence` のどこを確認すべきかを surface 上で明示する
- failed x402 follow-up も latest event source を参照し、connector failure と owner-side failure の recovery line を分ける
- payment attempt events から `duplicate replay accepted / failed -> confirmed` を recovery summary として要約し、raw event list を開かなくても最近の回復線を読めるようにする
- reconciliation card にも recent recovery の件数と最新要点を含め、未処理リスクと回復状況を同じ視線で判断できるようにする
- recent recovery は `x402 connector / owner review / billing system` の source 別件数も持ち、回復がどの境界で起きているかを上位サマリーで比較できるようにする
- server-only external x402 connector route からも同じ settlement state machine で `CONFIRMED / FAILED` を反映できる

### 14-3. Phase C — Research And External Awareness

目的:

- AI Manager をインターネット上の探索者として機能させる

範囲:

- イベント募集収集
- 話題 / ハッシュタグ収集
- 類似活動観察
- research source log
- freshness / citation UI
- x402 candidate billable surface の導入
- `Platform Operations Wallet` への machine-billable settlement

### 14-4. Phase D — Controlled Publishing

目的:

- 低リスクの公開行動を supervised でつなぐ

範囲:

- CF 内投稿 publish approval
- CF 内返信 approval
- human review queue の改善
- quiet hours / rate limit

外部 SNS はこの phase でも opt-in restricted に留める。

### 14-5. Phase E — Delegated Agent Wallet

目的:

- action accountability を wallet layer まで広げる

範囲:

- manager activity wallet
- delegated credential policy
- signed action record
- capped auto-pay policy
- internal ledger fallback

ただし、
支払い / 分配 / bridge はこの phase の対象外とする。

## 15. Key Risks

### 15-1. 人間 Manager との役割衝突

`AI Manager` という名前のため、
human manager と責任がぶつかりやすい。

対策:

- `Human Manager` と `AI Manager` を UI 上で常に区別する
- `Manager Desk` は人間の運営画面として維持する
- human manager の権限は phase 1 では閲覧のみに留める

### 15-2. キャラクター性が強すぎて境界が曖昧になる

対策:

- public disclosure を必須化する
- forbidden actions を policy に持つ

### 15-3. web 収集が誤情報を広げる

対策:

- source record を必須化する
- freshness と confidence を出す
- fact-heavy 公開は approval required に留める

### 15-4. wallet 分離が fund flow と誤解される

対策:

- manager activity wallet は payout wallet ではないと明記する
- contribution / settlement / distribution の既存責務を維持する

### 15-5. 自動課金が暴走する

対策:

- per-action / daily / monthly cap を必須化する
- allowed capability を限定する
- payee を固定 registry からしか選ばせない
- phase 1 は preview-first に留められるようにする

### 15-6. x402 が使えない環境で billing UX が破綻する

対策:

- `X402 -> internal ledger fallback` の順を明示する
- auto-pay unavailable 時は usage meter と請求プレビューだけでも成立させる

## 16. Open Questions

- Web収集を `手動トリガーのみ` から、いつ `許可ドメイン制` へ広げるか
- `AiAgent` を将来 rename するか、それとも capability worker として残すか
- manager activity wallet を internal virtual account から始めるか、smart account 前提にするか
- x402 非対応 provider 利用時に、いつ internal ledger から onchain settlement へ寄せるか

## 17. Recommended Implementation Order

1. `AI Manager Account` の abstract spec を本書で固定する
2. `phase 1 schema proposal` を別文書で additive に切る
3. Creator Home / AI Office の UI issue を分解する
4. `AiAgent -> AIManagerAccount + capability` の migration plan を決める
5. research policy と public disclosure rule を runbook 化する
