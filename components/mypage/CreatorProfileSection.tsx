// components/mypage/CreatorProfileSection.tsx
"use client";

import React from "react";
import { CreatorProfileEditForm } from "./CreatorProfileEditForm";
import { CreatorProfileViewCard } from "./CreatorProfileViewCard";
import { useCreatorReadyWorkspace } from "@/components/mypage/CreatorReadyWorkspaceContext";

type Props = {
  extraSections?: React.ReactNode;
};

export function CreatorProfileSection(props: Props) {
  const workspace = useCreatorReadyWorkspace();

  if (!workspace.editingProfile) {
    return <CreatorProfileViewCard />;
  }

  return <CreatorProfileEditForm extraSections={props.extraSections} />;
}
