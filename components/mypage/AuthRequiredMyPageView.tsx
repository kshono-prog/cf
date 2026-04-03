"use client";

import { MyPageShell } from "@/components/mypage/MyPageShell";
import { WorkspaceStatusNotice } from "@/components/mypage/WorkspaceFeedback";

type Props = {
  headerColor: string;
  authenticating: boolean;
  onAuthenticate: () => void;
};

export function AuthRequiredMyPageView(props: Props) {
  return (
    <MyPageShell headerColor={props.headerColor}>
      <div className="container-narrow">
        <WorkspaceStatusNotice
          tone="attention"
          title="ウォレットは接続済みです。続けるにはアプリ認証が必要です"
          description="設定、AI Office、非公開データの読み書きは署名検証済みセッションで保護されています。通常の閲覧やページ移動だけでは署名を求めません。"
        >
          <button
            type="button"
            className="btn-raised btn-raised-sm"
            onClick={props.onAuthenticate}
            disabled={props.authenticating}
          >
            {props.authenticating ? "認証を確認中です" : "アプリ認証する"}
          </button>
        </WorkspaceStatusNotice>
      </div>
    </MyPageShell>
  );
}
