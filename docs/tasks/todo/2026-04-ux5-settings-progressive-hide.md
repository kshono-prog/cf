# UX-5: 設定画面の段階的非表示

**Phase**: Phase 2
**Status**: TODO
**依存**: UX-1, UX-2（インライン実行で設定が完結できること）

---

## Goal

「最初から全部設定」をなくす。
必要な瞬間に必要な設定だけ表示し、
詳細設定は「上級者メニュー」に格納して初期ユーザーの抵抗感を下げる。

---

## Scope

### Phase 1（今回の対象）: 設定導線を弱める
- Creator Home の「設定・準備」モードへのトグルを目立たなくする
- 代わりに「AIマネージャーを呼ぶ」CTA を主動線に昇格
- プロフィール・Goal 設定は Top3 タスク経由のインライン実行を優先

### Phase 2（将来）: Just-in-time 設定表示
- AI タスク実行時に不足している設定だけをインラインで要求する
- 例: 「Goal を設定してから分析できます」→ その場で Goal 入力フォームを展開

### Phase 3（将来）: 上級者メニューへ格納
- 詳細設定（精算 / ブリッジ / AI Manager 詳細設定）を折りたたみセクションへ移動
- 「上級設定を開く」ボタンの後ろに隠す

---

## Non-Goals

- 設定機能の削除（削除はしない、隠すだけ）
- AI 自動設定（設定の実行は常に人間が行う）
- 精算 / ブリッジ関連の UX 変更（高リスク領域のため変更なし）

---

## Files Likely Affected

```
components/mypage/CreatorReadyWorkspaceRouteContent.tsx  # トグル UI 変更
components/mypage/SettingsPageClient.tsx                  # 詳細設定の折りたたみ
components/mypage/CreatorReadyHomeRoute.tsx               # CTA の昇格
app/[username]/mypage/AccountPageClient.tsx               # モード切替ロジック
```

---

## Phase 1 実装詳細

| 変更点 | Before | After |
|---|---|---|
| Home の主動線 | 今日の仕事 / 設定・準備 トグル（等価） | AIマネージャーボタン が主役 |
| 設定への導線 | ナビゲーションで目立つ | 「詳細設定を開く」小さいリンク |
| プロフィール編集 | 設定タブで直接表示 | Top3 タスク → インライン実行 |

---

## Acceptance Criteria

- [ ] Creator Home の第一印象が「AIマネージャー → 行動」に変わっている
- [ ] 設定機能は削除されておらず、リンクからアクセス可能
- [ ] プロフィール未設定のユーザーには設定リンクが引き続き表示される（非表示化の対象外）
- [ ] 精算 / ブリッジ / 詳細財務設定は触らない

---

## Risks

- 設定を完全に隠すと初期ユーザーが詰まる
  → Phase 1 は「弱める」だけ。「見えなくする」は Phase 3 まで行わない
- 設定への導線が分かりにくくなるユーザーからのフィードバック
  → A/B テストを想定した feature flag コントロールを検討する

---

## Validation

```bash
npm run lint
npm run typecheck
npm run build
```

手動確認:
- 初回訪問ユーザー（プロフィール未設定）で設定導線が壊れていないこと
- 精算・ブリッジ導線が引き続き到達可能なこと
- 「詳細設定を開く」リンクから設定画面に到達できること
