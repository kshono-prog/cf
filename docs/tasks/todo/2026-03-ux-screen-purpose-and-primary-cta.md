# Task

Phase 0 UX: 主要画面の役割と primary CTA を固定する

## Goal

`public profile / noUser / userOnly / creatorReady / AI Office / settlement` について、画面の主目的、見せる順番、primary CTA を明文化する。

## Scope

- 現状 UI の役割を棚卸しする
- 各画面で `何を達成させる画面か` を1文で定義する
- 各画面で primary CTA を1つ決める
- advanced action と primary action の分離方針を決める
- Phase 0-1 UX spec を更新する

## Non-Goals

- コンポーネント実装の変更
- 色や余白の最終 polish

## Files Likely Affected

- `docs/specs/ux/phase0-phase1-roadmap.md`
- `docs/roadmap/backlog.md`
- `TASKS.md`

## Acceptance Criteria

- 主要6画面の目的が文書で固定されている
- 主要6画面の primary CTA が決まっている
- 次の UI 実装 task で参照できる

## Risks

- 実装都合の分類をそのまま温存してしまう
- primary CTA が複数残って判断基準が弱いままになる

## Validation

- docs の差分レビュー
- 主要画面の current UI と spec の整合確認

