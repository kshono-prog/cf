"use client";

import { RouteErrorState } from "@/components/shared/RouteErrorState";

export default function RootError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-[var(--bg)] px-3 pb-[78px] pt-[96px] text-[var(--text)] sm:px-6 sm:pb-[96px] sm:pt-[120px]">
      <div className="mx-auto w-full max-w-[760px]">
        <RouteErrorState
          error={props.error}
          title="ページを開けませんでした"
          body="時間をおいて再度お試しください。続く場合はトップページから入り直すと復帰できることがあります。"
          fallbackHref="/"
          fallbackLabel="トップへ戻る"
          onRetry={props.reset}
          logLabel="APP_ROUTE_ERROR"
        />
      </div>
    </div>
  );
}
