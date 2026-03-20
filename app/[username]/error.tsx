"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";

import { RouteErrorState } from "@/components/shared/RouteErrorState";

export default function UsernameRouteError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const pathname = usePathname();
  const fallbackHref = useMemo(() => {
    const username = pathname.split("/").filter(Boolean)[0];
    return username ? `/${username}` : "/";
  }, [pathname]);

  return (
    <div className="pt-2">
      <RouteErrorState
        error={props.error}
        title="公開ページを表示できませんでした"
        body="プロフィールや応援情報の読み込みで問題が起きました。再試行するか、このクリエイターの公開ページへ戻ってください。"
        fallbackHref={fallbackHref}
        fallbackLabel="公開ページへ戻る"
        onRetry={props.reset}
        logLabel="USERNAME_ROUTE_ERROR"
      />
    </div>
  );
}
