"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";

import { RouteErrorState } from "@/components/shared/RouteErrorState";

export default function MyPageRouteError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const pathname = usePathname();
  const fallbackHref = useMemo(() => {
    const username = pathname.split("/").filter(Boolean)[0];
    return username ? `/${username}/mypage` : "/";
  }, [pathname]);

  return (
    <div className="pt-2">
      <RouteErrorState
        error={props.error}
        title="MyPage を表示できませんでした"
        body="設定や運営画面の読み込みで問題が起きました。再試行するか、MyPage の入口へ戻ってください。"
        fallbackHref={fallbackHref}
        fallbackLabel="MyPage へ戻る"
        onRetry={props.reset}
        logLabel="MYPAGE_ROUTE_ERROR"
      />
    </div>
  );
}
