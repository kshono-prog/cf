# Creator Founding

Creator Founding は、クリエイターの活動・支援・運営タスクをまとめて扱う  
**クリエイター向け AI事務所の土台**です。

現時点では、JPYC / USDC を使った支援体験と、Project / Goal / Settlement、  
AI task による運営補助を MVP として扱います。

送金はすべてユーザー自身のウォレットで実行され、本サービスは  
資金の保管・仲介・代理送金を一切行いません。

---

## コンセプト

- 応援は「支払い」ではなく「継続を支える行為」
- 1 円・即時・国境を越える
- クリエイターの活動を **Project 単位**で可視化する
- 将来的には **承認付き半自動運営の AI事務所** に育てる

---

## 現在の提供範囲

### MVP

- クリエイタープロフィール公開
- Project / Goal / Contribution 管理
- Settlement / Distribution の基盤
- AI task（`ANALYZE`, `PROPOSE`, `TRANSLATE`）
- AI task 基盤（validator / output schema / executor registry）

### Beta

- AI Office の拡張
- metrics 収集と分析
- Gas support
- Event 機能
- 高度な bridge / CCTP 運用

---

## 主なMVP機能

### 1. クリエイタープロフィール

- 表示名 / プロフィール文
- アバター画像
- テーマカラー（ページ全体に反映）
- SNS / Web / YouTube リンク
- 投げ銭受取ウォレットアドレス

#### 編集（mypage）

- View / Edit を明確に分離
- 保存中状態の制御
- アバター preview URL の revoke 管理

---

### 2. Project（支援単位）

Creator は Project を作成することで、以下を有効化できます。

- プロジェクトタイトル / 説明
- purposeMode（OPTIONAL / REQUIRED）
- 投げ銭（Contribution）の集計
- 目標金額（Goal）の管理

Project は「目標・内訳・進捗」を束ねる最小単位です。

---

### 3. 投げ銭（Contribution）

- 対応通貨：JPYC / USDC
- 対応チェーン：
  - Polygon（Mainnet / Amoy）
  - Avalanche（Mainnet / Fuji）
- ウォレット接続：AppKit / wagmi

#### フロー

1. ユーザーがウォレットから ERC20 transfer
2. txHash を localStorage に保存
3. `/api/contributions` に POST（PENDING）
4. receipt 検証（reverify）
5. CONFIRMED → DB 集計に反映

---

### 4. 進捗・目標管理

#### DB ベース進捗（Phase1）

- CONFIRMED のみを集計
- 総額 / 目標額 / 達成率を表示
- 目標到達時は自動で達成確定を試行
- 失敗時は手動 Achieve ボタンで確定可能

#### オンチェーン残高（補助）

- creator.address の JPYC 残高を直接参照
- DB 進捗とは独立した参考情報

---

### 5. Settlement / Distribution 基盤

- Goal 達成後の settlement 状態管理
- 配分 plan / 実行結果の保存
- bridge / distribution の監査用状態保持

---

### 6. AI task（運営補助）

- `ANALYZE`: metrics を元に活動分析
- `PROPOSE`: 次の企画や投稿方針を提案
- `TRANSLATE`: 翻訳案を生成
- `AgentTask` による承認前提の task 運用

---

### 7. Reverify（復帰・自動検証）

- iOS / アプリ内ブラウザでの遷移対策
- PENDING tx の自動再検証
- Cooldown / 最大件数制御
- StrictMode 二重実行ガード対応

---

## 画面構成

| パス                 | 内容                                 |
| -------------------- | ------------------------------------ |
| `/[username]`        | クリエイター公開ページ               |
| `/[username]/mypage` | プロフィール / Project / AI task 管理 |
| `/api/*`             | Creator / Project / Contribution / AgentTask API |

---

## 技術スタック

### Frontend

- Next.js（App Router）
- TypeScript（any 不使用）
- Tailwind CSS
- wagmi / viem / ethers v6
- AppKit（Wallet UI）

### Backend

- Next.js Route Handlers
- Prisma
- PostgreSQL（Supabase）

### Blockchain

- Polygon
- Avalanche

---

## データモデル（要約）

### CreatorProfile

- username（unique）
- displayName
- walletAddress
- themeColor
- activeProjectIdJpyc / activeProjectIdUsdc

### Project

- ownerAddress
- title / description
- purposeMode
- status
- creatorProfileId
- Goal（Project 側が正本）

### Contribution

- projectId
- txHash
- chainId / currency
- amount
- status（PENDING / CONFIRMED）

---

## 制限事項・注意点

- 本サービスは **個人学習目的の UI ツール**
- 送金・資金管理・返金処理は行いません
- JPYC / USDC の発行主体とは無関係です
- 投げ銭は **無償の応援**であり、金銭的・物品的な対価は発生しません
- 完全自動運営ではなく、当面は **承認付き半自動** を前提にします

---

## 開発・運用メモ

- 表示は原則 `cache: "no-store"`（保存後の即時反映を優先）
- Project が存在しない場合、進捗 UI は表示されません
- PENDING が残る場合は reverify / refresh で回収します

### Seed メモ

- `npm run db:seed` は `CreatorProfile + Project + 通貨別 activeProjectId + optional Goal` を作れます
- `SEED_PROJECT_CURRENCY=JPYC|USDC` で seed project の通貨を指定できます
- `SEED_GOAL_TARGET_AMOUNT` を指定すると `Project.goal` が作成されます
- `SEED_GOAL_DEADLINE` は ISO 文字列で指定できます
- `docs/runbooks/project-goal-smoke-check.md` に public / mypage / AI snapshot の smoke check 手順があります

### Legacy goal cleanup

- `node scripts/backfillLegacyGoalsToProjects.cjs` で外部 `users.json` の `goalTargetJpyc` を `Project.goal` へ backfill できます
- `LEGACY_USERS_JSON=/abs/path/users.json` を付けると別ファイルを指定できます
- `goalTitle` は現行 schema に保存先がないため、script は `target amount` と `deadline` だけを移します

### Active project cleanup

- 新規 project 作成と seed は通貨別 `activeProjectIdJpyc / activeProjectIdUsdc` を正本として更新します
- generic `activeProjectId` は schema から削除済みです
- migration 適用前に通貨別 active project が埋まっていることを確認してから deploy してください

---

## 直近の開発方針

- MVP と beta 機能境界を明確にする
- `AccountPageClient` の責務を分割する
- lint / type / build を安定化する
- 新しい AI task を1つ追加して、AgentTask 拡張フローを検証する

---

## ライセンス

Private / Experimental  
商用利用・再配布は想定していません。
