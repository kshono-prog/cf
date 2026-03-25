# Execution Plan

## Purpose

この文書は、[Roadmap](/Users/shounokazuaki/cf/docs/roadmap/roadmap.md) の戦略を、
**短期・中期・長期の実行順**として扱いやすくするための実行計画です。

前提は次です。

- 今は「将来どのAIが来ても活かせる運営基盤」を先に作る
- AI はまず `提案 / 要約 / 整理 / 下書き` から入れる
- 人間が使える運営OSを先に成立させる
- 高リスクな自動化は固定しすぎない

## Planning Frame

### Short-term

0-90日。方向性を実装可能な単位へ落とし、Creator Home と Manager Desk の土台を作る期間。

### Mid-term

90-180日。人間中心の運営OSを実際に使える状態にし、AI補助を structured data の上に載せる期間。

### Long-term

180日以降。Trust / Stage / Skill、CRM、Business Layer、Ecosystem Layer を順に接続し、AI進化で価値が増幅する構造へ広げる期間。

## Short-term Plan

### Goal

Vision を実装へ移すための最初の足場を作る。

### Workstreams

1. `Issue / PR 分解`
   Creator Home、Manager Desk、責任境界、core data models を `1 Issue = 1 PR` に落とす。

2. `Core schema proposal`
   `ManagerAssignment / ManagerNote / ExternalContact / ActionLog` の Prisma schema proposal、API 契約、migration impact、rollback concern を整理し、phase 1 の additive schema と minimal APIs を実装する。

3. `Creator Home first slice`
   `Hero / Daily Briefing`、`Project Progress` card、`AI Manager` cards、`Today / This Week`、`Settings / Edit` collapse を既存 `AccountPageClient` 上で実装する。

4. `Manager Desk read model`
   `Dashboard / Creator Detail` に必要な overview read model を定義する。

5. `Meeting / Planner minimum contract`
   `Meeting`、follow-up、shared timeline の最小 contract を決める。

### Exit Criteria

- Creator Home の first slice がコードとして存在する
- manager core models の additive schema / migration / API がコードとして存在する
- Manager Desk MVP に必要な read model が見えている
- 次に実装する順番が issue 単位で明文化されている

## Mid-term Plan

### Goal

人間が日常的に使える運営OSを成立させる。

### Workstreams

1. `Manager core models implementation`
   承認後に `ManagerAssignment / ManagerNote / ExternalContact / ActionLog` を実装する。

2. `Manager Desk MVP`
   `Dashboard / Creator Detail` を実装し、複数 Creator の状況把握・優先順位づけ・対外接点確認を可能にする。

3. `Meeting / Planner / follow-up`
   会議、決定事項、次アクション、期限、共有タイムラインを Creator Home / Manager Desk に接続する。

4. `AI operational assistance`
   `AI Daily Briefing`、`Manager Note summarization`、`task extraction`、`follow-up suggestion` を structured data 上で動かす。

5. `Lightweight CRM behavior`
   `ExternalContact` を status / temperature / next action 中心の軽量 CRM として育てる。

### Exit Criteria

- Creator が `状態 → 判断 → 行動` を home で進められる
- Manager が少人数で複数 Creator を追える
- 会議 / note / contact / action history が構造化されている
- AI提案が実務に接続し、採用 / 保留 / 却下の流れを持てる

## Long-term Plan

### Goal

Creator Founding を、信頼・成長・関係性・事業性まで扱える創作活動OSへ広げる。

### Workstreams

1. `Trust / Stage / Skill`
   Stage Map、Skill / Maturity Map、Self / External / Evidence separation、Missing Items Tracker を導入する。

2. `CRM expansion`
   Supporter CRM、Opportunity CRM、External Contact pipeline を接続する。

3. `Business Layer`
   finance / expense / split / contract / billing の最小土台を加える。

4. `Ecosystem Layer`
   Collaborator、Venue、Media、Opportunity Provider、Discovery / Recommendation を広げる。

5. `AI acceleration`
   より深い文脈理解、meeting copilot、対外先別最適化、半自動営業補助などを段階的に強める。

### Exit Criteria

- popularity だけでなく stage / trust / maturity で見られる
- relationship data が support / opportunity / business flows に接続する
- AI進化がそのままプロダクト価値の増幅につながる

## What We Intentionally Keep Light

- 完全自律エージェント
- AI依存の単一評価
- 巨大 marketplace の早期固定
- 独自AIモデル前提の設計

今はこれらを重く作り込まず、将来の AI 進化を取り込める接続点だけを整える。

## Current Recommended Order

1. [AI operational assistance on structured context](/Users/shounokazuaki/cf/docs/tasks/todo/2026-03-ai-operational-assistance-structured-context.md)
2. [Manager Desk follow-up slices](/Users/shounokazuaki/cf/docs/tasks/todo/2026-03-manager-desk-follow-up-slices.md)
3. [Creator Home deferred sections](/Users/shounokazuaki/cf/docs/tasks/todo/2026-03-creator-home-deferred-sections.md)
4. structured meeting decisions -> follow-up task minimum flow
5. Trust / Stage / CRM groundwork
