# Quarterly Plan

## 2026 Q1

テーマ: Vision 固定と AI Office / workspace 基盤整理

- Vision / Constitution / Roadmap を文書化
- Creator / Manager / AI Office の責任境界を固定
- `AccountPageClient` / workspace split / AI Office surface を整理
- lint / type / build の最低限安定化
- public profile / Creator workspace / settlement の責務境界を整理

完了条件:

- 上位方針と責任境界が docs で共有されている
- `今日の仕事 / 設定・準備` の基盤がある
- AI Office が承認付き task surface として安定している

## 2026 Q2

テーマ: 人間中心の運営OSの土台を作る

- Creator Home first slice を実装する
- Manager core models（`ManagerAssignment / ManagerNote / ExternalContact / ActionLog`）を設計・実装する
- Manager Desk の `Dashboard / Creator Detail` を整える
- Meeting / Planner / follow-up の最小導線を追加する
- Creator / Manager / AI Office の shared timeline に必要な read model を整える

完了条件:

- Creator が `状態 → 判断 → 行動` を home で進められる
- Manager が複数 Creator を一覧で追える
- 現場知 / contact / action history が構造化され始めている

### 2026 Q2 AI Manager 詳細計画（AM-31〜AM-39）

#### 4月 — 運用可視化の仕上げ

狙い: 既存の x402 / pending / recovery 実装を「オーナーが迷わない UI」に仕上げる。

| # | タイトル | 概要 |
|---|---|---|
| AM-31 | Pending Timeline Card（owner-facing） | PENDING_OBSERVED を含む pending イベントを時系列カード化（Settings / AI Office 共通）。latest event source / label / time が一覧で見え、pending age と freshness を同時把握できる。 |

根拠: pending queue / event-aware はあるが、owner-facing timeline 馴染ませが未完。AM-30 までの event 基盤を UI に降ろす自然な次工程。

#### 5月 — 運用アクション接続

狙い: 可視化したリスクを「行動」に直結させる。人間中心OS・AI は補助という設計原則に一致。

| # | タイトル | 概要 |
|---|---|---|
| AM-34 | One-click Reconciliation Actions | 各 pending / failed 行から owner confirm / mark failed / request evidence へ直接遷移。queue 上から 2 クリック以内で操作画面に到達し、実行後に event ledger が更新される。 |
| AM-35 | Connector Health Digest（Daily / Weekly） | connector check-in の滞留・重複抑制・fail 率を要約表示。callback 待ち / やや滞留 / 長時間滞留の件数推移と duplicate replay 受理件数を一覧化。 |

根拠: owner reconciliation / delivery health / idempotent replay は実装済み。集約ビュー化と導線短縮が次の効果。

#### 6月 — Manager 統合・信頼表面化

狙い: AI Manager 運用データを Manager Desk と公開面に橋渡しし、信頼の可視化まで一歩進める。

| # | タイトル | 概要 |
|---|---|---|
| AM-36 | Manager Desk AI Manager 専用タブ | Manager Desk Creator Detail に AI Manager 用タブを追加（read-only 中心）。pending / recovery / follow-up の要約を 1 画面化し、責任境界コピーを併記。 |
| AM-38 | Opportunity / Contact へのリスク連携 | x402 滞留・失敗が続く場合に Contact Pipeline / Opportunity へ注意フラグを連携。creator 単位の financial ops risk flag とフラグ解除条件を定義。 |
| AM-39 | Public-safe Trust Signal（限定公開） | 公開ページ / manager showcase 向けに「安全な運用品質指標」を検討・実験。内部値は露出しない。公開可能な粒度の定義を文書化してから実装判断。 |

根拠: read-only section は既存。Manager が複数 Creator のリスクを横断追跡できるよう CRM 拡張方針と整合させる。

## 2026 Q3

テーマ: 構造化データの上に AI補助を載せる

- AI Daily Briefing
- Manager Note summarization
- task extraction / follow-up suggestion
- contact / meeting / action history を使った missing-items detection
- Creator Home / Manager Desk で AI 提案理由を見せる

完了条件:

- AI が structured context を読み、実務に使える補助を返せる
- 提案は reviewable で、誰が動くかが曖昧にならない
- Creator / Manager の現実フローに AI が自然に乗る

## 2026 Q4

テーマ: Trust / Stage と軽量 CRM / Business Layer を接続する

- Trust / Stage / Skill の骨子導入
- Supporter CRM / Opportunity CRM の最小版
- finance / expense / split groundwork
- Creator / Manager / external relationship をまたぐ進行管理の整理

完了条件:

- 人気順ではなく stage / maturity / trust で見られる土台がある
- Supporter / Opportunity / Contact が別々ではなく流れで扱える
- Business Layer へ進む最低限の土台ができる
