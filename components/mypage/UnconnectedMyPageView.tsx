"use client";

import React from "react";

import { MyPageShell } from "@/components/mypage/MyPageShell";
import { UnconnectedMyPage } from "@/components/mypage/UnconnectedMyPage";
import type { OpenSections } from "@/components/mypage/MyPageAccordion";

type Props = {
  headerColor: string;
  error: string | null;
  openSections: OpenSections;
  setOpenSections: React.Dispatch<React.SetStateAction<OpenSections>>;
};

export function UnconnectedMyPageView(props: Props) {
  return (
    <MyPageShell headerColor={props.headerColor}>
      <UnconnectedMyPage
        error={props.error}
        open={props.openSections}
        setOpen={props.setOpenSections}
      />
    </MyPageShell>
  );
}
