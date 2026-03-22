# AI Provider 設定

## プロバイダー優先順

`lib/ai/` は Gemini → OpenAI → Anthropic の順でフォールバックする。

| 優先度 | プロバイダー | モデル | API キー | 無料枠 |
|--------|------------|--------|---------|--------|
| 1 | Google Gemini | `gemini-2.0-flash-lite` | `GEMINI_API_KEY` | あり（Google AI Studio） |
| 2 | OpenAI | `gpt-4.1-nano` | `OPENAI_API_KEY` | 限定クレジット |
| 3 | Anthropic | `claude-haiku-4-5-20251001` | `ANTHROPIC_API_KEY` | なし（従量課金） |

キーが未設定のプロバイダーは自動スキップされる。少なくとも 1 つ設定すれば動作する。

## 環境変数設定

`.env.local` に以下を追加する。

```
GEMINI_API_KEY=your-gemini-key
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
```

## モデルの変更方法

各プロバイダーのモデル ID は対応ファイルの先頭定数で管理している。

| プロバイダー | ファイル | 定数名 |
|------------|--------|-------|
| Gemini | `lib/ai/geminiProvider.ts` | `MODEL_ID` |
| OpenAI | `lib/ai/openaiProvider.ts` | `MODEL_ID` |
| Anthropic | `lib/ai/anthropicProvider.ts` | `MODEL_ID` |

変更例:

```typescript
// lib/ai/geminiProvider.ts
const MODEL_ID = "gemini-2.0-flash-lite"; // ← ここを更新
```

## ModelUnavailableError への対応

モデルが廃止または削除された場合、`ModelUnavailableError` がスローされる。サーバーログに以下のメッセージが出力される。

```
[ai] ⚠ Model unavailable (gemini/gemini-2.0-flash-lite). Update the model ID in lib/ai/geminiProvider.ts. Falling back to next provider.
```

対応手順:

1. ログの `lib/ai/xxxProvider.ts` を確認する
2. 対応するファイルを開き、`MODEL_ID` を最新のモデル ID に更新する
3. 次のプロバイダーへのフォールバックが自動で機能するため、緊急対応は不要

## generateText / generateJson の使い方

```typescript
import { generateJson, generateText } from "@/lib/ai";

// JSON を期待する場合
const result = await generateJson<{ summary: string }>(
  "プロンプトテキスト",
  {
    systemPrompt: "システムプロンプト",
    maxTokens: 256,
    temperature: 0.7,
  }
);
// result は null（全プロバイダー失敗）または { summary: string }

// テキストを期待する場合
const text = await generateText("プロンプト");
```

`generateJson` は markdown コードフェンス（` ```json ` 等）を自動除去してから JSON.parse する。
パース失敗時は `null` を返すため、呼び出し側は必ずフォールバックを用意する。
