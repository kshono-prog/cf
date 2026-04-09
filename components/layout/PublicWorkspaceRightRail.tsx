import Link from "next/link";

import { PublicProfileAiManagerCard } from "@/components/profile/PublicProfileAiManagerCard";
import { PublicProfileCreatorVoiceCard } from "@/components/profile/PublicProfileCreatorVoiceCard";
import { Avatar } from "@/components/shared/Avatar";
import type { SupportProfileView } from "@/lib/supportProfileView";
import type { SerializedPublicAiManagerProfile } from "@/lib/serializers/aiManager";
import type { CreatorProfile } from "@/types/creator";

type Props = {
  username: string;
  creator: CreatorProfile;
  supportShortcutHref?: string | null;
  publicAiManager?: SerializedPublicAiManagerProfile | null;
  supportProfileView?: SupportProfileView | null;
};

function getFallbackInitial(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "C";
  return trimmed.slice(0, 1).toUpperCase();
}

function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength).trimEnd()}…`;
}

export function PublicWorkspaceRightRail({
  username,
  creator,
  supportShortcutHref = null,
  publicAiManager = null,
  supportProfileView = null,
}: Props) {
  const displayName = creator.displayName ?? username;
  const profileText = creator.profile?.trim() ?? "";
  const summary = profileText ? truncateText(profileText, 120) : null;

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-[24px] border border-[var(--line)] bg-[var(--surface)] px-5 py-5 shadow-[0_18px_48px_rgba(15,23,42,0.05)]">
        <div className="flex items-start gap-3">
          <Avatar
            src={creator.avatarUrl}
            alt={`${displayName} のアイコン`}
            fallbackText={getFallbackInitial(displayName)}
            size={56}
          />
          <div className="min-w-0 flex-1">
            <div className="truncate text-base font-semibold text-[var(--text)]">
              {displayName}
            </div>
            <div className="mt-1 truncate text-sm text-[var(--text-subtle)]">
              @{username}
            </div>
          </div>
        </div>

        {summary ? (
          <p className="mt-4 text-sm leading-6 text-[var(--text-subtle)]">
            {summary}
          </p>
        ) : (
          <p className="mt-4 text-sm leading-6 text-[var(--text-subtle)]">
            公開プロフィール、投稿、応援導線をこの右カラムからすぐ確認できます。
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={`/${username}`} className="btn-secondary">
            公開プロフィール
          </Link>
          {supportShortcutHref ? (
            <Link href={supportShortcutHref} className="btn-secondary">
              応援へ
            </Link>
          ) : null}
        </div>
      </section>

      {publicAiManager ? (
        <PublicProfileAiManagerCard
          creatorUsername={username}
          creatorDisplayName={displayName}
          aiManager={publicAiManager}
        />
      ) : null}

      {supportProfileView ? (
        <PublicProfileCreatorVoiceCard
          displayName={displayName}
          supportProfileView={supportProfileView}
          ecosystemRole={creator.ecosystemRole ?? null}
        />
      ) : null}
    </div>
  );
}
