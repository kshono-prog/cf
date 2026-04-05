# Creator Founding UI 仕様書

> 方針: fintech 的な信頼感とクリエイター向けの温度感を両立する。  
> 上品・やわらか・余白で見せる。Web3 の派手さを抑え、モバイルファースト。

---

## 1. 配色

### カラートークン（`app/globals.css` 定義済み）

```css
/* ライトモード */
--bg: #f4f7fb;           /* ページ背景：わずかに青みがかった白 */
--surface: #ffffff;      /* カード・パネル背景 */
--surface-subtle: #edf2f9; /* ホバー・サブ領域 */
--surface-muted: #e2eaf4;  /* 非活性・区切り */
--line: #d5dfe9;         /* ボーダー・セパレーター */
--text: #0f1f35;         /* 本文：深いネイビー */
--text-subtle: #5a6e84;  /* サブテキスト */
--muted: #8fa3b8;        /* プレースホルダー・ラベル補助 */
--accent: #2563eb;       /* アクションカラー：ブルー */
--accent-subtle: rgba(37,99,235,0.08);  /* アクセント薄敷き */
--accent-muted: rgba(37,99,235,0.18);   /* アクセントボーダー */
--support: #16a34a;      /* 成功・増加・完了 */
--danger: #e11d48;       /* エラー・警告 */
--warning: #d97706;      /* 注意・保留 */
```

```css
/* ダークモード */
--bg: #0a0f1a;
--surface: #111827;
--accent: #60a5fa;       /* ダークでは少し明るく */
```

### 使用ルール

| 用途 | トークン | 補足 |
|---|---|---|
| ページ背景 | `--bg` | カード外はこの色のみ |
| カード・パネル | `--surface` | 白 1色、グラデ不使用 |
| 主要アクション | `--accent` | ボタン・リンク・選択状態 |
| AI 提案エリア | `--accent-subtle` + `--accent-muted` ボーダー | 専用色として固定 |
| 達成・増加 | `--support` | テキストのみ（背景は使わない） |
| エラー | `--danger` | インラインのみ、大面積に使わない |
| グラデーション | 使用しない | ヒーローカードの例外は1箇所のみ |
| ネオン・蛍光 | 使用禁止 | Web3 感を避ける |

### ヒーローカード（唯一の例外）

```css
background: linear-gradient(135deg, var(--accent) 0%, #1d4ed8 100%);
```

青系2色のみ。彩度が高い他色・ゴールド・紫・グリーンは混入しない。

---

## 2. 文字サイズ階層

フォントスタック: `-apple-system, "SF Pro Text", "Hiragino Sans", "Noto Sans JP", sans-serif`

| 役割 | サイズ | ウェイト | 備考 |
|---|---|---|---|
| ページタイトル | 22–26px | 800 | モバイル 20px |
| セクション見出し | 17–18px | 700 | |
| カード見出し | 15–16px | 700 | |
| 本文・フィード | 14–15px | 400–500 | `line-height: 1.65` |
| サブテキスト | 13px | 400 | `color: var(--text-subtle)` |
| ラベル・バッジ | 11–12px | 600–700 | 全角仮名を推奨、英語 ALL CAPS は最小限 |
| 金額・数値 | 本文と同サイズ+ | 700–800 | tabular-nums |

### 文字間・行間

- 見出し: `letter-spacing: -0.3px` 〜 `-0.5px`（詰め気味でシャープに）
- 本文: `letter-spacing: 0`（標準）
- ラベル英語: `letter-spacing: 0.06em`（広め）
- 日本語本文: `line-height: 1.65`（窮屈にしない）

---

## 3. セクションごとの見せ方

### 3-1. ページレイアウト（X スタイル）

```
[左サイドバー 240px] | [メインフィード 最大600px] | [右パネル 320px]
```

- `1024px+`: 3カラム表示
- `768–1023px`: サイドバー（アイコン72px）+ フィードのみ
- `〜767px`: サイドバー非表示 → ボトムナビ + フィード全幅

### 3-2. ヒーロー（デイリーダイジェスト）

- フィード最上部に配置。ブルーグラデーション背景
- 「おはようございます、○○さん」の日本語挨拶を先頭に
- 今日の収益・ファン数の2指標のみ（過剰に詰めない）
- **右パネルに数値サマリーを分離**し、ヒーローは感情的な歓迎文に集中させる

### 3-3. フィード

- X スタイルのカード列。アバター + 本文 + アクション行
- カード間の区切りは `border-bottom: 1px solid var(--line)` のみ（影・余白なし）
- hover: `background: var(--surface-subtle)` のみ。translateY はしない
- フィード内のカードは `box-shadow` を使わない（右パネルのみ使用可）

### 3-4. AI マネージャー提案

- フィード内にカード形式で挿入（固定位置はなし、文脈に応じて流す）
- `background: var(--accent-subtle)` + 左ボーダー `3px solid var(--accent)`
- 「✨ 今日の提案」ラベルを先頭に
- CTA は「下書きを作成 →」1つのみ。「無視」「実行済み」は小さいテキストリンク

### 3-5. 進捗バー（ゴール・プロジェクト）

- フィード内インライン。カード内に埋め込むか、投稿カード内に添付する
- バー: `height: 6px`、`border-radius: 999px`
- グラデーション: `linear-gradient(90deg, var(--accent), #60a5fa)`
- shimmer アニメーションは1箇所のみ（ページ全体での過剰アニメを避ける）
- パーセンテージは右上にバッジで表示（`background: var(--accent-subtle)`）

### 3-6. 右パネル

- `border-radius: 16px` のカード形式
- `box-shadow: var(--shadow-card)` を使用（フィードとの差別化）
- セクション: 「今月のサマリー」「AIタスク（承認待ち）」「トップサポーター」
- 各セクション間は `margin-bottom: 16px`

### 3-7. 左サイドバー

- 背景: `var(--surface)` + 右ボーダー `1px solid var(--line)`
- アクティブ項目: `color: var(--accent)` + 太字（背景色は付けない）
- 項目 hover: `background: var(--surface-subtle)`、`border-radius: 9999px`
- プロフィール欄は最下部（Twitter と同様）

---

## 4. ボタンルール

### 種別

| 種別 | 外観 | 用途 |
|---|---|---|
| **Primary** | 塗り・`--accent`・白文字・pill 形 | ページ内1つが原則 |
| **Secondary** | 枠線・`--accent` カラー・透明背景 | サブアクション |
| **Ghost** | 枠線なし・`--text-subtle`・hover で subtle 背景 | 低優先アクション |
| **Danger** | 枠線・`--danger` カラー | 削除・取消のみ |

### サイズ

```css
/* 標準（CTA） */
padding: 10px 22px;
font-size: 14px;
font-weight: 700;
border-radius: var(--radius-pill); /* 9999px */

/* 小（インライン） */
padding: 5px 14px;
font-size: 12px;
font-weight: 700;
border-radius: var(--radius-pill);

/* FAB（モバイル） */
width: 46px; height: 46px;
border-radius: 50%;
font-size: 22px;
```

### ルール

- **ページ内の Primary ボタンは最大2つ**（例: 「投稿する」「確認」）
- ラベルは日本語を基本。「Submit」「Post」「Save」は使わない
- hover: `opacity: 0.88` + `translateY(-1px)` （Primary のみ）
- disabled: `opacity: 0.4`、カーソル `not-allowed`
- アイコン付きの場合は左にアイコン、テキストは右

---

## 5. フォームルール

### フィールド

```css
border: 1px solid var(--line);
border-radius: var(--radius-input); /* 10px */
padding: 10px 14px;
font-size: 14px;
background: var(--surface);
color: var(--text);
transition: border-color 0.15s, box-shadow 0.15s;

/* focus */
border-color: var(--accent);
box-shadow: 0 0 0 3px var(--accent-subtle);
outline: none;
```

### ラベル

- **ラベルは常にフィールドの上**（placeholder 単独でのラベル代用禁止）
- ラベル: `font-size: 13px`, `font-weight: 600`, `color: var(--text-subtle)`
- ラベルとフィールドの間: `margin-bottom: 6px`
- 必須表示: `（必須）` をラベル末尾に追記（アスタリスク`*`のみは避ける）

### バリデーション

- エラーメッセージ: フィールド直下、`font-size: 12px`, `color: var(--danger)`
- エラー状態のフィールド: `border-color: var(--danger)`, `box-shadow: 0 0 0 3px rgba(225,29,72,0.1)`
- 成功状態は原則表示しない（フォーム送信後のトーストで完結）

### テキストエリア

```css
min-height: 100px;
resize: vertical;
/* その他は input と同様 */
```

### セレクト・ドロップダウン

- ネイティブ `<select>` を使用（カスタム UI は最小限）
- 外観は input と統一

---

## 6. カードルール

### 使用指針

フィードカード（X スタイル）と右パネルカードは**別物として扱う**。

| 種別 | 影 | ボーダー | padding |
|---|---|---|---|
| フィードアイテム | なし | `border-bottom` のみ | `14px 20px` |
| 右パネルカード | `var(--shadow-card)` | `1px solid var(--line)` | `0`（内部で制御） |
| AI 提案インライン | なし | 左 `3px solid var(--accent)` | `12px 14px` |
| モーダル・ダイアログ | `0 8px 32px rgba(0,0,0,0.12)` | なし | `24px` |

### 「カード乱用禁止」原則

- 情報を囲みたいだけの目的でカードを使わない
- 3つ以上の情報がひとまとまりを成すときのみカード化を検討する
- 右パネル・モーダル以外では `box-shadow` を使わない
- カードのネスト（カード内カード）禁止

### radius

```css
/* 右パネルカード */
border-radius: 16px; /* var(--radius-card) */

/* インラインカード（AI提案・進捗バー枠） */
border-radius: 12px;

/* モーダル */
border-radius: 20px;
```

### hover

- フィードアイテム: `background: var(--surface-subtle)` のみ
- 右パネルカードの行: `background: var(--surface-subtle)` のみ
- `translateY`・`box-shadow` 変化はフィード内で使用しない（パネル内は可）

---

## 7. モバイルルール

### ブレークポイント

| 幅 | レイアウト |
|---|---|
| `〜767px` | フルスクリーンフィード + ボトムナビ |
| `768–1023px` | アイコンサイドバー（72px）+ フィード |
| `1024px+` | 3カラム（サイドバー240px + フィード + 右パネル320px） |

### ボトムナビ（モバイル）

```css
position: fixed; bottom: 0; left: 0; right: 0;
height: 54px;
padding-bottom: env(safe-area-inset-bottom); /* iPhone 対応 */
background: var(--surface);
border-top: 1px solid var(--line);
display: flex; justify-content: space-around; align-items: center;
```

- 項目数: **5つ固定**（ホーム / 探す / 投稿FAB / 通知 / プロフィール）
- アクティブ: `color: var(--accent)` + 上部に2px ライン
- FAB: `width: 46px; height: 46px; border-radius: 50%; background: var(--accent)`
- ラベルテキスト: `font-size: 10px`（日本語2–4文字に収める）

### モバイル固有ルール

- タップターゲット: 最小 `44×44px`
- フォントサイズ: `font-size: 16px` 以上（iOS でのズーム防止）
- フォームは `font-size: 16px` を下回らない（`<input>` に適用）
- 横スクロール禁止。全要素 `max-width: 100%`
- フィード padding: `14px 16px`（PC より狭め）
- compose ボックスはモバイルでは FAB タップ → モーダルで開く（inline は非表示）
- ボトムナビ分の余白: `padding-bottom: calc(54px + env(safe-area-inset-bottom))`

### モバイルで省略するもの

| 要素 | 扱い |
|---|---|
| 右パネル（サマリー・AIタスク） | 折りたたんで「分析」タブへ移動 |
| compose ボックス（inline） | FAB → ボトムシート |
| サイドバーのラベル | アイコンのみに縮小 |
| フィードタブ | スクロール可能な水平タブに変更 |

---

## 付録: 避けるべきUIパターン

| NG | 理由 |
|---|---|
| グラデーション多用 | Web3感・安っぽさ |
| `box-shadow` をフィード内で使う | 重くなる・視線が分散する |
| カード内カード | 情報の入れ子が読みにくい |
| placeholder をラベル代わりに使う | 入力後に何のフィールドか不明 |
| Primary ボタンを3つ以上並べる | 何を押すべきか判断できない |
| 英語ラベルの羅列 | 一般ユーザーへの距離感・冷たさ |
| ネオン・蛍光色 | Web3・ゲーム感が出る |
| 常時ループするアニメーション | 注意を奪い信頼感を損なう |
| `border-radius` の不統一 | 精度の低い印象を与える |
| ウォレット接続を初期画面に大きく出す | 一般ユーザーへの心理的障壁 |
