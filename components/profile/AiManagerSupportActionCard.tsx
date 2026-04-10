import Link from "next/link";

import {
  buildGenericSupportHref,
  type PublicSupportActionTheme,
} from "@/lib/aiManager/supportActionThemes";
import type { SerializedPublicAiManagerSupportActivity } from "@/lib/serializers/aiManager";

type Props = {
  creatorUsername: string;
  aiManagerDisplayName: string;
  themes?: PublicSupportActionTheme[] | null;
  recentSupportActivities?: SerializedPublicAiManagerSupportActivity[] | null;
  fallbackProjectId?: string | null;
  variant?: "sidebar" | "feature";
};

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "最近";

  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
  }).format(date);
}

export function AiManagerSupportActionCard({
  creatorUsername,
  aiManagerDisplayName,
  themes,
  recentSupportActivities,
  fallbackProjectId = null,
  variant = "sidebar",
}: Props) {
  const isFeature = variant === "feature";
  const safeThemes = Array.isArray(themes) ? themes : [];
  const safeRecentSupportActivities = Array.isArray(recentSupportActivities)
    ? recentSupportActivities
    : [];
  const genericSupportHref = buildGenericSupportHref({
    username: creatorUsername,
    projectId: fallbackProjectId,
  });
  const previewActivities = safeRecentSupportActivities.slice(0, isFeature ? 2 : 1);

  return (
    <section className="overflow-hidden rounded-[28px] border border-[var(--line)] bg-[var(--surface)] shadow-[0_20px_60px_rgba(15,23,42,0.05)]">
      <div className="border-b border-[var(--line)] bg-[linear-gradient(135deg,rgba(20,184,166,0.14),rgba(15,23,42,0.03))] px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-[var(--surface)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-800">
            AI Manager Action
          </span>
          <span className="inline-flex items-center rounded-full border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-subtle)]">
            支援先は creator / project
          </span>
        </div>
        <p className="mt-3 text-sm leading-6 text-[var(--text-subtle)]">
          {aiManagerDisplayName} は支援金の受益者ではなく、いま進めたい応援テーマや最近の動きを案内する役です。
          支援は creator の project に届きます。
        </p>
      </div>

      <div
        className={
          isFeature
            ? "grid gap-4 px-5 py-5 sm:px-6 sm:py-6 lg:grid-cols-[1.2fr,0.8fr]"
            : "space-y-4 px-5 py-5 sm:px-6 sm:py-6"
        }
      >
        <div className="space-y-3">
          <div>
            <div className="text-sm font-semibold text-[var(--text)]">
              AIマネージャーと一緒に応援する
            </div>
            <p className="mt-1 text-sm leading-6 text-[var(--text-subtle)]">
              どんな支援が今うれしいかをテーマ別に整理しています。
            </p>
          </div>

          {safeThemes.length > 0 ? (
            <div className="grid gap-3">
              {safeThemes.map((theme) => (
                <div
                  key={theme.id}
                  className="rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-full border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-subtle)]">
                      {theme.currency}
                    </span>
                    <span className="text-xs font-medium text-[var(--text-subtle)]">
                      {theme.projectTitle}
                    </span>
                  </div>
                  <div className="mt-2 text-sm font-semibold text-[var(--text)]">
                    {theme.title}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-subtle)]">
                    {theme.helper}
                  </p>
                  <div className="mt-3">
                    <Link href={theme.href} className="btn-secondary w-full sm:w-auto">
                      このテーマで応援する
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-4">
              <div className="text-sm font-semibold text-[var(--text)]">
                公開中の応援テーマを準備中です
              </div>
              <p className="mt-2 text-sm leading-6 text-[var(--text-subtle)]">
                まだ細かなテーマ分けは出ていませんが、creator の現在の project はそのまま応援できます。
              </p>
              <div className="mt-3">
                <Link href={genericSupportHref} className="btn-secondary w-full sm:w-auto">
                  creator を応援する
                </Link>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <div className="text-sm font-semibold text-[var(--text)]">
              最近の支援活動
            </div>
            <p className="mt-1 text-sm leading-6 text-[var(--text-subtle)]">
              支援が入ると、{aiManagerDisplayName} が進め方や近況共有の整理を支えます。
            </p>
          </div>

          {previewActivities.length > 0 ? (
            <div className="grid gap-3">
              {previewActivities.map((activity) => (
                <div
                  key={`${activity.taskType}-${activity.createdAt}`}
                  className="rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-[var(--text)]">
                      {activity.label}
                    </div>
                    <div className="text-xs font-medium text-[var(--text-subtle)]">
                      {formatDate(activity.createdAt)}
                    </div>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-subtle)]">
                    {activity.helper ??
                      "creator の活動を前に進めるための支援タスクを最近扱っています。"}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-4">
              <p className="text-sm leading-6 text-[var(--text-subtle)]">
                支援が入ると AIマネージャーが進め方や近況共有を案内します。公開向けの支援活動が増えると、ここに最近の動きが表示されます。
              </p>
            </div>
          )}

          <div className="pt-1">
            <Link href={genericSupportHref} className="btn-secondary w-full sm:w-auto">
              いま応援できる project を見る
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
