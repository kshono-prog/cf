"use client";

import dynamic from "next/dynamic";
import type { CreatorProfile } from "@/lib/profileTypes";

const ProfileClient = dynamic(() => import("@/components/ProfileClient"), {
  ssr: false,
  loading: () => (
    <div className="px-4 pb-6 text-sm text-gray-500">追加情報を読み込み中…</div>
  ),
});

type ProfileClientSectionProps = {
  username: string;
  creator: Omit<CreatorProfile, "address"> & { address?: string | null };
  projectId: string | null;
};

export function ProfileClientSection({
  username,
  creator,
  projectId,
}: ProfileClientSectionProps) {
  return (
    <ProfileClient
      username={username}
      creator={creator}
      projectId={projectId}
      layout="content"
    />
  );
}
