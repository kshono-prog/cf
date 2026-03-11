# Creator Workspace Information Architecture

## Purpose

現状機能を `ホーム / 運営 / 公開 / 詳細設定` に再分類し、Phase 0 UX の次アクションとして使える `画面棚卸し表 + 導線マップ + 実装タスク分解` を固定する。

この文書の目的は機能追加ではなく、既存機能の見せ方と入口を整理することにある。

## Product Assumptions

最初の1ユーザー:

- 毎週活動していて、支援も集めたい個人クリエイター

最重要ジョブ:

- 今週やることを決める
- 支援ページを整える
- 支援者への告知やお礼を進める

最初の継続利用理由:

- 毎週ログインすると、次にやること、承認待ち、下書きが揃っている

## Information Architecture Rule

- トップレベルは `今週の運営 / 支援ページ / 支援者対応 / 詳細設定` の 4 つまで
- `ホーム` は画面名ではなく体験上の最上位入口として扱う
- 1画面1主目的を守る
- internal term は UI の前面に出さない
- 高リスク操作は routine action と同列に置かない
- advanced / beta / audit 寄り機能は通常導線から外す

## Screen Inventory

| 現在の画面・機能 | 主なファイル | 現在の見え方 | 再分類先 | 主利用者 | ここで達成させること | 扱い |
| --- | --- | --- | --- | --- | --- | --- |
| 公開プロフィール | `app/[username]/page.tsx` | 支援ページ | 公開 | Supporter | クリエイターを理解して支援する | 維持。公開導線の基点 |
| 公開イベント | `app/[username]/events/page.tsx` | 公開情報の派生 | 公開 | Supporter | 活動やイベントを確認する | 維持。ただし支援導線より後段 |
| 未接続状態 | `components/mypage/UnconnectedMyPageView.tsx` | マイページ入口 | ホーム | Creator | ウォレット接続して導線に入る | 維持。初回導線の前段 |
| NoUser 登録画面 | `components/mypage/NoUserMyPageView.tsx` | 登録フォーム | ホーム | Creator | プロフィール土台を作る | 維持。一本道導線の1段目 |
| UserOnly 申請画面 | `components/mypage/UserOnlyMyPageView.tsx` | 情報更新 + 申請 | ホーム | Creator | 申請前の最終確認と creator apply | 維持。一本道導線の2段目 |
| creatorReady 入口 | `components/mypage/CreatorReadyAccountView.tsx` | 全部入りマイページ | ホーム | Creator | 今週やることを1つ選ぶ | 主役化。トップ画面にする |
| 今日やること overview | `components/mypage/CreatorReadyWorkspaceOverview.tsx` | creatorReady 上部カード | ホーム | Creator | 次の行動を選ぶ | 主役化。常に fold 上に置く |
| プロフィール編集 | `components/mypage/CreatorProfileSection.tsx` | 運営ワークスペース内 | 支援ページ | Creator | 公開情報を整える | `支援ページ` 側へ寄せる |
| 公開リンク確認 | `components/mypage/CreatorPublicLinkSection.tsx` | accordion 内の補助情報 | 支援ページ | Creator | 公開面を確認する | `支援ページ` に統合 |
| Project 作成・編集 | `components/mypage/ProjectSection.tsx` | 通貨別管理 | 運営 | Creator | project の土台を作る | 維持。Goal と一体で見せる |
| Goal / progress / summary | `components/mypage/CurrencyGoalSettlementPanel.tsx` | Project 直下 | 運営 | Creator | 目標更新と進捗確認をする | `運営` の主機能として維持 |
| AI Office Overview/Create/Inbox | `components/mypage/AiOfficePanel.tsx` | 運営ワークスペース内の機能群 | 運営 | Creator | 下書き生成と承認待ち整理 | `支援者対応` の主機能へ改名 |
| Summary actions | `components/mypage/SummaryActionsSection.tsx` | Project 管理の一部 | 運営 | Creator | 現況確認や補助操作を行う | 一部をホームへ、一部を運営へ |
| Settlement guided flow | `components/mypage/ProjectSettlementPanel.tsx` | Goal 管理の延長で表示 | 詳細設定 | Creator operator | 目標達成後の配分作業を安全に進める | 入口を後段へ下げる |
| CCTP jobs | `components/mypage/ProjectSettlementCctpSection.tsx` | settlement 内 | 詳細設定 | Creator operator | 例外的な bridge job を確認する | advanced のまま維持 |
| manual result | `components/mypage/ProjectSettlementManualResultSection.tsx` | settlement 内 | 詳細設定 | Creator operator | 手動結果を記録する | advanced のまま維持 |
| gas support | `components/mypage/GasSupportTabs.tsx` | creatorReady の同列 section | 詳細設定 | Creator | 必要時のみ申請・確認する | 通常導線から後退 |
| event 管理 | `components/EventManager.tsx` と events APIs | 公開イベントとは別の運営面 | 詳細設定 | Creator | イベント情報を管理する | 当面トップ導線に出さない |
| bridge APIs / CCTP APIs / distribution execute | `app/api/projects/[projectId]/bridge/*`, `app/api/projects/[projectId]/settlement/*`, `app/api/projects/[projectId]/cctp/jobs/route.ts` | UI の背後 | 詳細設定 | Creator operator | 高リスク処理を監査可能に扱う | 導線を減らし仕様は維持 |

## Target Navigation

### Creator-facing top nav

- `今週の運営`
- `支援ページ`
- `支援者対応`
- `詳細設定`

### Mapping from current sections

| 現在 | 今後の置き場 | 備考 |
| --- | --- | --- |
| `日々の運営ワークスペース` | `今週の運営` と `支援者対応` に分割 | project/goal と AI Office を分ける |
| `公開ページとリンク` | `支援ページ` | 公開確認とプロフィール編集を統合 |
| `ガス代支援` | `詳細設定` | 常用導線から外す |
| settlement main flow | `詳細設定` ただし goal 達成時のみホームに通知 | 入口だけホームに出す |
| AI Office | `支援者対応` | Overview/Create/Inbox は維持、名称だけ変える |

## Route and Entry Map

### Public side

```text
公開プロフィール
  -> Goal / 活動内容を理解
  -> 支援ウォレット導線
  -> 支援完了
```

### First-time creator flow

```text
マイページ到達
  -> ウォレット接続
  -> ユーザー登録
  -> プロフィール確認
  -> クリエイター申請
  -> 初回ホーム
  -> Goal 作成
  -> 公開ページ確認
```

### Weekly creator flow

```text
今週の運営
  -> 今やること 1 件を見る
  -> 支援状況を確認
  -> 必要なら次へ分岐
     -> 支援ページ
     -> 支援者対応
     -> 詳細設定
```

### Support-page maintenance flow

```text
支援ページ
  -> プロフィールを整える
  -> Goal を更新する
  -> 公開ページを確認する
  -> 公開状態を維持する
```

### Supporter-response flow

```text
支援者対応
  -> 承認待ちを確認
  -> 告知またはお礼の下書きを作る
  -> 承認 / 却下する
  -> 必要なら再編集する
```

### High-risk operations flow

```text
ホーム上の通知
  -> 目標達成 or 配分準備完了
  -> 詳細設定へ移動
  -> settlement guided flow
  -> bridge / draft / preflight / execute / review
```

## Home Composition

`今週の運営` は次の順で固定する。

1. `今やること`
2. `承認待ち`
3. `支援状況`
4. `公開ページの確認`
5. `必要なら詳細設定へ`

### Home に出すもの

- quick action 1件
- AI Office 承認待ち件数
- project / goal health
- 直近の公開ページ確認導線
- 目標達成済み project があるときだけ settlement notice

### Home から外すもの

- gas support の直接操作
- CCTP jobs 一覧
- manual result 記録
- bridge 詳細
- 開発者向け status 表示
- task type raw 名称

## Content Renaming Rules

| 内部用語 | UI 用語 |
| --- | --- |
| creatorReady | 今週の運営 |
| AI Office | 支援者対応 |
| Overview | いまの状況 |
| Create | 下書きを作る |
| Inbox | 承認待ち |
| Project / Goal 管理 | 支援ページの設定 |
| Settlement | 配分と精算 |
| Bridge | 資金移動 |
| Gas support | ガス代支援 |
| CCTP | 高度な資金移動 |

## Implementation Breakdown

以下は `1 Issue = 1 PR` で切る前提の実装順。

### Issue 1: 画面棚卸しとラベル固定

Goal:

- 既存画面を `ホーム / 運営 / 公開 / 詳細設定` へ正式に分類する
- UI に出すラベルを固定する

Files:

- `docs/specs/ux/phase0-phase1-roadmap.md`
- `docs/specs/ux/creator-workspace-information-architecture.md`
- `TASKS.md`

Acceptance:

- top-level nav 名が固定されている
- internal term の置換方針が決まっている
- 次の UI task が参照できる

### Issue 2: creatorReady をホーム化する

Goal:

- `creatorReady` を機能置き場ではなく `今週の運営` ホームに変える

Files:

- `components/mypage/CreatorReadyAccountView.tsx`
- `components/mypage/CreatorReadyWorkspaceOverview.tsx`
- `components/mypage/MyPageAccordion.tsx`

Changes:

- 先頭見出しを `クリエイター管理` から `今週の運営` に変更
- first view を `今やること / 承認待ち / 支援状況 / 公開確認` の順に再編
- accordion は補助導線に下げる

Acceptance:

- fold 上で次の行動が1つ以上見える
- `支援ページ` と `支援者対応` への導線が明確
- gas support は fold 上から消える

### Issue 3: 支援ページ導線を独立させる

Goal:

- 公開面の編集と確認を `支援ページ` として一塊にする

Files:

- `components/mypage/CreatorProjectManagementSection.tsx`
- `components/mypage/CreatorProfileSection.tsx`
- `components/mypage/CreatorPublicLinkSection.tsx`
- `components/mypage/CurrencyProjectManagementBlock.tsx`

Changes:

- プロフィール編集、公開リンク、Goal 編集を同じ目的で見せる
- `公開ページを見る` を primary CTA にする
- 支援者視点の確認文言を入れる

Acceptance:

- creator が `公開情報を整える場所` と理解できる
- profile と public link が分断されない

### Issue 4: AI Office を `支援者対応` に改名する

Goal:

- `AI Office` を機能群ではなく `運営補助` の1ワークフローとして見せる

Files:

- `components/mypage/AiOfficePanel.tsx`
- `components/mypage/AiOfficeOverviewSection.tsx`
- `components/mypage/AiOfficeCreateSection.tsx`
- `components/mypage/AiOfficeInboxSection.tsx`
- `lib/uxCopy.ts`

Changes:

- 見出しを `支援者対応` に寄せる
- `いまの状況 / 下書きを作る / 承認待ち` の文言へ変更
- `今週やること` から承認待ちを直リンクする

Acceptance:

- raw task type を選ぶ印象が薄れる
- `承認待ち -> 下書き作成 -> 承認` の流れが見える

### Issue 5: 詳細設定へ高リスク機能を退避する

Goal:

- settlement / bridge / gas / event / CCTP を常用導線から外す

Files:

- `components/mypage/ProjectSettlementPanel.tsx`
- `components/mypage/ProjectSettlementAdvancedSection.tsx`
- `components/mypage/GasSupportTabs.tsx`
- `components/mypage/CreatorReadyAccountView.tsx`

Changes:

- `詳細設定` 入口を追加
- goal 達成時だけ settlement notice をホームに出す
- CCTP, manual result, gas support は詳細設定配下に固定

Acceptance:

- routine screen に高リスク操作が常駐しない
- 必要時だけ詳細設定へ移動できる

### Issue 6: 初回導線を一本道に固定する

Goal:

- `プロフィール作成 -> Goal 作成 -> 公開ページ確認` を初回導線として固定する

Files:

- `components/mypage/NoUserMyPageView.tsx`
- `components/mypage/UserOnlyMyPageView.tsx`
- `components/mypage/CreatorReadyWorkspaceOverview.tsx`
- `components/mypage/MyPageOnboardingProgress.tsx`

Changes:

- creatorReady 初回表示で `最初にやる3手` を明示
- 初回は `詳細設定` を見せない
- `公開ページを確認する` を onboarding の終点に置く

Acceptance:

- 初回ユーザーが迷わず1本で進める
- advanced 機能が途中で混ざらない

## Validation Plan

docs 段階:

- この文書と `phase0-phase1-roadmap` の整合レビュー
- 現状コンポーネントと再分類の対応確認

実装段階:

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `mypage`, `public profile`, `AI Office`, `settlement` の手動確認

## Open Decisions

- `支援ページ` に Goal 編集まで含めるか、`運営` に残すか
- events を `公開` に残すか、`詳細設定` に寄せるか
- `SummaryActionsSection` のどこまでをホームへ引き上げるか

現時点では、最小差分を優先して次で進める。

- Goal 編集は `支援ページ` に含める
- events 管理は `詳細設定` に置く
- SummaryActions はホーム通知と詳細操作に分割する
