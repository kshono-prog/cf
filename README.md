# Creator Founding

Creator Founding は、JPYC / USDC を用いてクリエイターを直接応援できる  
**非 custodial（ノンカストディアル）型の投げ銭 UI プロジェクト**です。

送金はすべてユーザー自身のウォレットで実行され、本サービスは  
資金の保管・仲介・代理送金を一切行いません。

---

## コンセプト

- 応援は「支払い」ではなく「継続を支える行為」
- 1 円・即時・国境を越える
- クリエイターの活動を **Project 単位**で可視化する

---

## 主な機能

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

### 5. Reverify（復帰・自動検証）

- iOS / アプリ内ブラウザでの遷移対策
- PENDING tx の自動再検証
- Cooldown / 最大件数制御
- StrictMode 二重実行ガード対応

---

## 画面構成

| パス                 | 内容                                 |
| -------------------- | ------------------------------------ |
| `/[username]`        | クリエイター公開ページ               |
| `/[username]/mypage` | プロフィール / Project 管理          |
| `/api/*`             | Creator / Project / Contribution API |

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
- goalTitle / goalTargetJpyc
- activeProjectId

### Project

- ownerAddress
- title / description
- purposeMode
- status
- creatorProfileId

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

---

## 開発・運用メモ

- 表示は原則 `cache: "no-store"`（保存後の即時反映を優先）
- Project が存在しない場合、進捗 UI は表示されません
- PENDING が残る場合は reverify / refresh で回収します

---

## 今後の予定（Roadmap）

- Allocation（分配）API
- Avalanche ICTT / ICM を用いた L1 連携
- Event / Purpose 単位の支援可視化
- Creator Map（支援関係の可視化）
- ハッカソン / PoC 向け最小構成化

---

## ライセンス

Private / Experimental  
商用利用・再配布は想定していません。
