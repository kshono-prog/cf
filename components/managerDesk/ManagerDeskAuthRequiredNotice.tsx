"use client";

import { WorkspaceStatusNotice } from "@/components/mypage/WorkspaceFeedback";

type Props = {
  authenticating: boolean;
  onAuthenticate: () => void;
};

export function ManagerDeskAuthRequiredNotice(props: Props) {
  return (
    <WorkspaceStatusNotice
      tone="attention"
      title="ウォレットは接続済みです。Manager Desk を開くにはアプリ認証が必要です"
      description="担当 Creator の非公開データは署名検証済みセッションで保護されています。ページ移動だけでは署名を求めず、ここで明示した時だけ認証します。"
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
  );
}
