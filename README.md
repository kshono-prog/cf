# Creator Founding

Creator Founding は、**Creator・Manager・AI Office** を核として、
創る人、支える人、運営する人が信頼を積み上げながら、ともに成長できる
**創作活動の事務所基盤**です。

現時点のプロダクトは、公開プロフィール、Project / Goal / Contribution、Settlement / Distribution、AI Office を持つ運営基盤として動いています。
ここから、Creator Home と Manager Desk を中心にした人間中心の運営OSへ進化させます。

送金はすべてユーザー自身のウォレットで実行され、本サービスは資金の保管・仲介・代理送金を行いません。

## モットー

**すべての人に開く。信頼を積み上げる。ともに成長する。**

## これは何か

Creator Founding は、単なる投げ銭アプリでも、単なるAIチャットでも、単なるプロフィール作成ツールでもありません。

目指しているのは、次の三者構造です。

- Creator: 創作と最終意思決定の主体
- Manager: 現場・対外・実行・調整の主体
- AI Office: 整理・提案・記録・補助の主体

この三者が役割分担することで、創作活動を「個人の孤独な努力」から、「支援・運営・協業・機会・継続が循環する構造」へ変えていきます。

## 現在の到達点

- 公開プロフィールは、支援・進捗・活動を見せる public surface として成立している
- `mypage` は、Project / Goal / Summary / Settlement を統合する Creator 運営ハブの原型になっている
- AI Office は、承認付きの下書き・整理・提案フローとして動いている
- Settlement は、高リスク領域として明示的な review 境界を維持している

## 次に進む方向

次に進むべき優先順位は次です。

1. Creator Home を「設定中心」から「状態 / 提案 / 行動中心」のホームへ再設計する
2. `ManagerAssignment / ManagerNote / ExternalContact / ActionLog` の schema と API 契約を固める
3. Manager Desk の Dashboard / Creator Detail を実装できる read model を整える
4. Meeting / Planner / follow-up の最小運営フローを追加する
5. AI Daily Briefing や note summarization を structured data 上に載せる

## Core Docs

まずは次を読むと、現在の方向性と優先順位が揃います。

- [Documentation Guide](/Users/shounokazuaki/cf/docs/README.md)
- [Vision](/Users/shounokazuaki/cf/docs/roadmap/vision.md)
- [Project Constitution](/Users/shounokazuaki/cf/docs/project-constitution.md)
- [Roadmap](/Users/shounokazuaki/cf/docs/roadmap/roadmap.md)
- [Execution Plan](/Users/shounokazuaki/cf/docs/roadmap/execution-plan.md)
- [Project State](/Users/shounokazuaki/cf/PROJECT_STATE.md)
- [Tasks](/Users/shounokazuaki/cf/TASKS.md)

## 主要仕様

- [Architecture](/Users/shounokazuaki/cf/docs/architecture.md)
- [Domain Model](/Users/shounokazuaki/cf/docs/domain-model.md)
- [Creator・Manager・AI Office の責任境界](/Users/shounokazuaki/cf/docs/creator-manager-ai-office-responsibility-boundaries.md)
- [Creator Home 再設計案](/Users/shounokazuaki/cf/docs/specs/ux/creator-home-redesign.md)
- [Manager Desk 要件定義](/Users/shounokazuaki/cf/docs/specs/manager-desk/requirements.md)
- [Manager Desk データモデル定義](/Users/shounokazuaki/cf/docs/specs/manager-desk/data-models.md)
- [AI Office task output contracts](/Users/shounokazuaki/cf/docs/specs/creator-ai-office/task-output-contracts.md)

## 現在の主要サーフェス

| パス | 役割 |
| --- | --- |
| `/[username]` | 公開プロフィール / 支援導線 / 活動表示 |
| `/[username]/mypage` | Creator Home の原型 / Project / Goal / AI Office / Settlement |
| `/creators` | クリエイター発見ページ |
| `/api/*` | Creator / Project / Contribution / AgentTask / metrics などの API |

## 現在の中核データ

- `CreatorProfile`
- `Project`
- `Goal`
- `Contribution`
- `AgentTask`
- `Settlement`
- `DistributionRun`
- `BridgeRun`

次の中核データとして、`ManagerAssignment / ManagerNote / ExternalContact / ActionLog` を追加する方向です。

## 安全境界

- 完全自動運営は行わない
- 高リスクなお金まわり・配分・ブリッジは常に人間承認前提
- 対外公開・応募・契約・支払い・分配は AI 単独で確定しない
- Manager 専用の現場知や対外温度感は、責任境界を守って扱う

## 技術スタック

### Frontend

- Next.js 15 App Router
- TypeScript
- Tailwind CSS
- wagmi / viem

### Backend

- Next.js Route Handlers
- Prisma
- Supabase Postgres

### Blockchain

- Polygon
- Avalanche

## 検証の基本

- `npm run lint`
- `npm run typecheck`
- `npm run build`

## Testing

Playwright + Vitest を使って、公開ページと `mypage` の最小スモークを安全に保護しています。方針は mock 中心で、外部ウォレット実接続や本物 RPC への依存はテストに持ち込みません。

- Unit: `npm run test:unit`
- Unit watch: `npm run test:unit:watch`
- E2E: `npm run test:e2e`
- E2E UI: `npm run test:e2e:ui`
- Combined CI-like run: `npm run test:ci`

CI では `pull_request` と `push` でテスト workflow が自動実行され、失敗時は `playwright-report/`, `test-results/`, `coverage/` を artifact として保存します。Playwright の調査は HTML report を開き、必要なら trace・screenshot・video の順で確認すると原因を追いやすい構成です。

詳細な運用ルールは [docs/testing.md](/Users/shounokazuaki/cf/docs/testing.md) を参照してください。

Prisma schema を変更する場合は、migration impact と rollback concern を必ず説明します。

## ライセンス

Private / Experimental
