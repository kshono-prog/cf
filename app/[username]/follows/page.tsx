import Link from "next/link";
import { notFound } from "next/navigation";

import { PublicWorkspaceShell } from "@/components/layout/PublicWorkspaceShell";
import { Avatar } from "@/components/shared/Avatar";
import { getCreatorFollowLists } from "@/lib/creatorFollow";
import { loadPublicPageData } from "@/lib/publicPageData";

type Params = {
  username: string;
};

type SearchParams = {
  tab?: string | string[];
};

function resolveTab(value: string | string[] | undefined): "followers" | "following" {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "following" ? "following" : "followers";
}

function countLabel(value: number): string {
  return value.toLocaleString("ja-JP");
}

export default async function FollowsPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) {
  const { username } = await params;
  const { tab: rawTab } = await searchParams;
  const activeTab = resolveTab(rawTab);
  const [data, publicPageData] = await Promise.all([
    getCreatorFollowLists(username),
    loadPublicPageData(username),
  ]);
  if (!data) notFound();

  const items = activeTab === "following" ? data.following : data.followers;
  const title = activeTab === "following" ? "フォロー中" : "フォロワー";

  return (
    <PublicWorkspaceShell
      username={username}
      currentPage="follows"
      creator={publicPageData.creator}
      supportShortcutHref={`/${username}#support-projects`}
      publicAiManager={publicPageData.publicAiManager}
      supportProfileView={publicPageData.supportProfileView}
    >
    <div className="space-y-4">
      <section className="surface-card p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-lg font-semibold text-[var(--text)]">
              {data.creator.displayName} さんの{title}
            </div>
            <p className="mt-1 text-sm leading-6 text-[var(--text-subtle)]">
              フォロー関係を一覧で確認できます。
            </p>
          </div>
          <Link href={`/${username}#community`} className="btn-secondary">
            プロフィールへ戻る
          </Link>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Link
            href={`/${username}/follows?tab=followers`}
            className={activeTab === "followers" ? "action-pill-active" : "chip-button"}
          >
            フォロワー {countLabel(data.counts.followers)}
          </Link>
          <Link
            href={`/${username}/follows?tab=following`}
            className={activeTab === "following" ? "action-pill-active" : "chip-button"}
          >
            フォロー中 {countLabel(data.counts.following)}
          </Link>
        </div>
      </section>

      <section className="surface-card p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="text-base font-semibold text-[var(--text)]">{title}</div>
          <div className="text-sm text-[var(--text-subtle)]">{countLabel(items.length)} 件</div>
        </div>

        {items.length === 0 ? (
          <div className="mt-4 surface-subtle px-4 py-4 text-sm text-[var(--text-subtle)]">
            まだ表示できるユーザーはいません。
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {items.map((item) => (
              <Link
                key={item.id}
                href={`/${item.username}`}
                className="surface-subtle flex items-center gap-3 px-4 py-4 transition hover:bg-[var(--surface)]"
              >
                <Avatar
                  src={item.avatarUrl}
                  alt={`${item.displayName} のアイコン`}
                  fallbackText={item.displayName.slice(0, 1) || "?"}
                  size={48}
                />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-[var(--text)]">
                    {item.displayName}
                  </div>
                  <div className="mt-1 truncate text-xs text-[var(--text-subtle)]">
                    @{item.username}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
    </PublicWorkspaceShell>
  );
}
