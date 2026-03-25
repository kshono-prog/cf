# Creator Workspace Information Architecture

関連仕様:

- [`docs/specs/ux/creator-home-redesign.md`](/Users/shounokazuaki/cf/docs/specs/ux/creator-home-redesign.md)

## Purpose

ユーザー属性（ファン / クリエイター）で体験を完全に分岐させ、クリエイター向けワークスペースを `今日の仕事 / 設定・準備` の2モードに再構築する。

この文書の目的は機能追加ではなく、既存機能の見せ方と入口を整理することにある。

## User Role Separation（最重要原則）

| 属性 | URL | 目的 | 設計思想 |
|---|---|---|---|
| ファン・初見 | `/[username]` | クリエイターを理解して応援する | クリーン・感情的・シンプル |
| クリエイター本人 | `/[username]/mypage` | 毎日の運営とAI事務所を使う | 機能的・AI主役・優先順が明確 |

クリエイターが自分の `/[username]` にアクセスした場合は「管理ストリップ」を上部表示し、ファン目線のページそのものがプレビューとなる。

## Product Assumptions

最初の1ユーザー:

- 毎週活動していて、支援も集めたい個人クリエイター

最重要ジョブ:

- AI事務所の承認待ちを確認して処理する
- 今日やることを決める
- 支援ページを整える

最初の継続利用理由:

- 毎日ログインすると、承認待ちと次にやることがすぐ見える

## Information Architecture Rule

- クリエイターワークスペースのトップレベルは `今日の仕事 / 設定・準備` の 2モードのみ
- `今日の仕事` はAI事務所が主役。承認待ちが常に最上部
- `設定・準備` はプロフィール・プロジェクト・ウォレット・精算のみ
- `公開ページを見る` はタブではなく、ヘッダーボタン + 設定内リンク + 管理ストリップで代替
- internal term は UI の前面に出さない
- 高リスク操作は routine action と同列に置かない
- advanced / beta / audit 寄り機能は設定・準備モード末尾に固定

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

### Creator-facing workspace modes

```
[ 今日の仕事 ● ]  [ 設定・準備 ]          ← 2モードのみ
                        [ 投稿する ]  [ ファン目線を確認↗ ]  ← 常時ボタン
```

### 今日の仕事 モード（デフォルト）

優先順:
1. AI事務所 承認待ち（最上部、常に表示）
2. AIに依頼するカード（Manager / Promotion / Finance / Fan Relation）
3. 今週のサマリー（支援額・投稿数・承認済みタスク数）
4. 最近の履歴（直近の承認・却下タスク）

### 設定・準備 モード

セクション:
1. プロフィール（アイコン・名前・紹介文・SNSリンク）→ インライン編集
2. プロジェクト・目標（JPYC / USDC ）→ インライン編集
3. 公開ページの準備状況（チェックリスト + ファン目線で確認するリンク）
4. ウォレット（受取アドレス）
5. 精算 [試験中]（目標達成後の配分・送金）

### Mapping from current sections

| 現在 | 今後の置き場 | 備考 |
| --- | --- | --- |
| `ホーム` タブ | `今日の仕事` モード | AI事務所が主役に昇格 |
| `AIの提案と確認` タブ | `今日の仕事` モードに統合 | タブを廃止して主画面へ |
| `公開ページ・投稿` タブ | `設定・準備` モード（プロジェクト・プロフィール）| 投稿アクションは今日の仕事ヘッダーへ |
| `公開ページを見る` タブ | ヘッダーボタン + 設定内リンク + 管理ストリップ | タブ廃止 |
| `精算・詳細設定` タブ | `設定・準備` モード末尾 [試験中] | タブ廃止、設定内に統合 |
| `SettingsPageClient` (隠しモード) | `設定・準備` モードとして正式化 | 存在を知られない問題を解消 |
| AI Office (settings 内) | 廃止（今日の仕事モードが唯一の場所） | 重複を排除 |

## Route and Entry Map

### Public side（ファン向け）

```text
/[username]
  -> クリエイターを理解する（名前・活動・一行説明）
  -> 現在のプロジェクト進捗を確認
  -> [応援する] CTA
  -> 活動投稿フィード
  -> 支援後：「あなたの応援がどう使われたか」
```

クリエイター本人がアクセスした場合:
```text
管理ストリップ（上部固定）
  -> 「これがファンに見えているページです」
  -> [プロフィールを編集] → 設定・準備モードへ
  -> [管理に戻る →] → /mypage 今日の仕事モードへ
```

### First-time creator flow

```text
/mypage → ウォレット接続
  -> ユーザー登録
  -> クリエイター申請
  -> 今日の仕事モード（初回）
     -> 設定・準備モードへ誘導（プロフィール・Goal未設定の場合）
  -> プロフィール設定
  -> Goal 作成
  -> ファン目線を確認↗（設定内リンク）
```

### Daily creator flow

```text
/mypage → 今日の仕事モード（デフォルト）
  -> 承認待ちを確認・処理
  -> 必要なら AIに依頼
  -> 投稿する
  -> 支援状況を確認
  -> （必要なら）設定・準備モードへ切り替え
```

### Settings flow

```text
/mypage → 設定・準備モード
  -> プロフィールを整える（インライン編集）
  -> Goal を更新する
  -> ファン目線で確認する↗（公開ページを新タブで開く）
  -> （目標達成時）精算を開始する
```

### High-risk operations flow

```text
今日の仕事モード上の通知（目標達成時のみ）
  -> 設定・準備モード 精算セクションへ移動
  -> settlement guided flow
  -> bridge / draft / preflight / execute / review
```

## 今日の仕事モード Composition

優先順（固定）:

1. AI事務所 承認待ち件数と一覧
2. AIに依頼するカード（4ロール）
3. 今週のサマリー
4. 最近の履歴

`今日の仕事` モードの詳細なホーム再設計は次を参照する。

- [`docs/specs/ux/creator-home-redesign.md`](/Users/shounokazuaki/cf/docs/specs/ux/creator-home-redesign.md)

### 今日の仕事 モードから外すもの

- プロフィール編集
- Goal 編集
- gas support の直接操作
- CCTP jobs 一覧
- manual result 記録
- bridge 詳細
- 開発者向け status 表示
- task type raw 名称

## Content Renaming Rules

| 内部用語 | UI 用語 |
| --- | --- |
| creatorReady ホームタブ | 今日の仕事（モード） |
| settingsPageClient / settings renderMode | 設定・準備（モード） |
| AI Office | AI事務所 |
| Overview | いまの状況 |
| Create | AIに依頼する |
| Inbox | 承認待ち |
| supporters タブ | 廃止（今日の仕事モードに統合） |
| 公開ページ・投稿 タブ | 設定・準備モード内に分割 |
| 公開ページを見る タブ | 廃止（ヘッダーボタン + 管理ストリップで代替） |
| Project / Goal 管理 | プロジェクト・目標 |
| Settlement | 精算 |
| Bridge | 資金移動 |
| Gas support | ガス代支援 |
| CCTP | 高度な資金移動 |

## Implementation Breakdown

以下は `1 Issue = 1 PR` で切る前提の実装順。

### Issue 1: ワークスペースナビを2モードに変更

Goal:

- 5タブナビを `今日の仕事 / 設定・準備` の2モードトグルに変える
- ヘッダーに `投稿する` と `ファン目線を確認↗` ボタンを固定する

Files:

- `components/mypage/creatorReadyWorkspaceConfig.ts`
- `components/mypage/CreatorReadyWorkspaceHeader.tsx`
- `components/mypage/CreatorReadyWorkspaceRouteContent.tsx`
- `lib/mypage/workspaceView.ts`

Changes:

- WORKSPACE_VIEWS を `daily-work` と `settings` の2つに削減
- header の tab row をモードトグルに変更
- 「ファン目線を確認↗」ボタンを追加（`/${username}` を新タブで開く）
- 「投稿する」ボタンを header に固定

Acceptance:

- タブが5個から2個に減る
- ヘッダーにいつでもファン目線確認ボタンがある

### Issue 2: 「今日の仕事」モードでAI事務所を主画面に

Goal:

- `今日の仕事` モードを「承認待ち→依頼→サマリー→履歴」の順で構成する
- 承認待ちが0件のときも依頼カードがすぐ見える

Files:

- `components/mypage/CreatorReadyHomeRoute.tsx`
- `components/mypage/CreatorReadyWorkspaceOverview.tsx`
- `components/mypage/CreatorWorkspaceAiOfficePanel.tsx`
- `components/mypage/CreatorReadyAiApprovalSection.tsx`

Changes:

- AI事務所（承認待ち一覧 + 依頼カード）を最上部に固定
- 今週のサマリー（支援額・投稿数・承認済みタスク数）を承認待ちの下へ
- 旧 quick actions / beta actions / project health を下部または削除
- settlement notice は目標達成時のみ表示（現状維持）

Acceptance:

- ページを開いた瞬間にAI事務所の承認待ちが見える
- 承認待ちが0件でも依頼カードが最上部に表示される

### Issue 3: 「設定・準備」モードとして SettingsPageClient を正式化

Goal:

- `SettingsPageClient` を `設定・準備` モードとして正式な入口に昇格させる
- AI Office パネルを設定から除去し、リンクのみに変更
- プロフィール編集をインライン表示に変える
- 公開ページの準備状況 + 「ファン目線で確認する」ボタンを設定内に追加

Files:

- `components/mypage/SettingsPageClient.tsx`
- `components/mypage/CreatorSettingsAiOfficeSection.tsx`
- `components/mypage/CreatorSettingsBasicInfoSection.tsx`
- `components/mypage/CreatorSettingsProjectSection.tsx`

Changes:

- `CreatorSettingsAiOfficeSection` の `CreatorWorkspaceAiOfficePanel` をリンクボタン1つに差し替え
- プロフィール編集フォームをページ末尾に出現させず、`基本情報` セクション内のインライン展開に変更
- `公開ページの準備状況` セクションを追加（チェックリスト + 「ファン目線で確認する↗」リンク）
- 精算セクションを末尾に配置し [試験中] バッジを付ける

Acceptance:

- 設定ページにAI事務所の重複がない
- プロフィール編集ボタンを押すと同じ場所でフォームが開く
- 「ファン目線で確認する」ボタンが設定モード内に存在する

### Issue 4: 公開ページにクリエイター管理ストリップを追加

Goal:

- クリエイター本人が `/[username]` にアクセスした際、上部に管理ストリップを表示する
- これにより公開ページそのものがファン目線プレビューとして機能する

Files:

- `components/ProfileClient.tsx`
- `components/profile/CreatorManagementStrip.tsx`（新規）

Changes:

- `viewerAddress === creator.address` のとき上部ストリップを表示
- ストリップの内容: 「これがファンに見えているページです」+ [設定・準備を開く] + [管理に戻る→]
- ストリップはファンのページ表示には影響しない（条件付き）

Acceptance:

- クリエイターが自分の公開ページを開くと管理ストリップが表示される
- ファンが同じURLを開いてもストリップは表示されない
- 管理ストリップから `/mypage` に直接戻れる

### Issue 5: 投稿アクションを「今日の仕事」ヘッダーに統合

Goal:

- 「投稿する」を `公開ページ・投稿` タブに依存させず、どのモードからでも操作できる

Files:

- `components/mypage/CreatorReadyWorkspaceHeader.tsx`
- `components/mypage/CreatorReadySupportPageRoute.tsx`（投稿部分の参照先変更）

Changes:

- ヘッダーの「投稿する」ボタンを PostComposer へのクイックアクションに接続
- `公開ページ・投稿` タブの「投稿」部分を設定モードから除去（またはリンクのみ）

Acceptance:

- 「投稿する」がどのモードからでも1クリックで到達できる

### Issue 6: 初回導線を設定・準備モードに寄せる

Goal:

- 初回 creatorReady 到達時は `設定・準備` モードを先に促す（プロフィール・Goal未設定の場合）
- 設定完了後に `今日の仕事` モードに案内する

Files:

- `components/mypage/CreatorReadyWorkspaceOverview.tsx`
- `components/mypage/CreatorReadyAccountView.tsx`

Changes:

- プロフィール・Goal が未設定の場合は `設定・準備` モードへの誘導バナーを表示
- 設定完了チェックを `今日の仕事` モード上部の通知として出す

Acceptance:

- 初回ユーザーが何をすべきか明確
- 設定済みのユーザーには誘導バナーが出ない

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
