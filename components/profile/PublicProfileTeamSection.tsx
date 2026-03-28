import type { PublicProfileTeamData } from "@/lib/publicProfileEnhancement";

const ROLE_LABEL: Record<string, string> = {
  OWNER: "オーナー",
  MANAGER: "マネージャー",
  COLLABORATOR: "コラボレーター",
  ADVISOR: "アドバイザー",
};

const ROLE_BADGE_CLASS: Record<string, string> = {
  OWNER: "bg-blue-100 text-blue-700",
  MANAGER: "bg-amber-100 text-amber-700",
  COLLABORATOR: "bg-gray-100 text-gray-600",
  ADVISOR: "bg-purple-100 text-purple-700",
};

function roleLabel(role: string): string {
  return ROLE_LABEL[role] ?? role;
}

function roleBadgeClass(role: string): string {
  return ROLE_BADGE_CLASS[role] ?? "bg-gray-100 text-gray-600";
}

export function PublicProfileTeamSection({
  data,
}: {
  data: PublicProfileTeamData;
}) {
  return (
    <section className="panel-card p-4 sm:p-5">
      <h2 className="text-sm font-semibold text-[var(--text)]">チーム</h2>
      <p className="mt-0.5 text-xs text-[var(--text-subtle)]">
        このプロジェクトに関わるメンバーです。
      </p>
      <div className="mt-3 divide-y divide-[var(--line)]">
        {data.members.map((member) => (
          <div key={member.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 py-2.5">
            <span
              className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${roleBadgeClass(member.role)}`}
            >
              {roleLabel(member.role)}
            </span>
            <span className="text-sm font-medium text-[var(--text)]">
              {member.displayName ?? member.walletAddressAbbr ?? "—"}
            </span>
            {member.sharePercent != null ? (
              <span className="ml-auto text-xs text-[var(--text-subtle)]">
                {member.sharePercent.toFixed(1)}%
              </span>
            ) : null}
            {member.note ? (
              <p className="w-full text-xs text-[var(--text-subtle)]">{member.note}</p>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
