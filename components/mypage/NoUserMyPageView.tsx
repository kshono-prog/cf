"use client";

import React from "react";

import { MyPageShell } from "@/components/mypage/MyPageShell";
import { UserRegistrationForm } from "@/components/mypage/UserRegistrationForm";

type Props = {
  headerColor: string;
  error: string | null;
  usernameInput: string;
  displayName: string;
  profile: string;
  setUsernameInput: (v: string) => void;
  setDisplayName: (v: string) => void;
  setProfile: (v: string) => void;
  saving: boolean;
  onSubmit: (e: React.FormEvent) => void;
};

export function NoUserMyPageView(props: Props) {
  return (
    <MyPageShell headerColor={props.headerColor}>
      <div className="container-narrow space-y-4">
        <h1 className="text-lg font-semibold mb-2">ユーザー登録</h1>

        {props.error && (
          <div className="alert-warn">
            <p className="text-xs">{props.error}</p>
          </div>
        )}

        <UserRegistrationForm
          usernameInput={props.usernameInput}
          displayName={props.displayName}
          profile={props.profile}
          setUsernameInput={props.setUsernameInput}
          setDisplayName={props.setDisplayName}
          setProfile={props.setProfile}
          saving={props.saving}
          onSubmit={props.onSubmit}
        />
      </div>
    </MyPageShell>
  );
}
