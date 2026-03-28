"use client";

import { RouteErrorState } from "@/components/shared/RouteErrorState";

export default function GlobalError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
        <div className="mx-auto w-full max-w-[760px] px-3 pb-[78px] pt-[60px] sm:px-6 sm:pb-[96px]">
          <RouteErrorState
            error={props.error}
            title="アプリの表示を続けられませんでした"
            body="ページ全体で問題が起きています。再読み込みするか、トップページから入り直してください。"
            fallbackHref="/"
            fallbackLabel="トップへ戻る"
            onRetry={props.reset}
            logLabel="APP_GLOBAL_ERROR"
          />
        </div>
      </body>
    </html>
  );
}
