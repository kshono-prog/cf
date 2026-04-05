import type { ManagerDeskCreatorDetailData } from "@/lib/managerDesk/readModelTypes";

type Props = {
  creatorDisplayName: string;
  viewerRole: ManagerDeskCreatorDetailData["viewerRole"];
  aiManager: ManagerDeskCreatorDetailData["aiManager"];
};

const ARCHETYPE_LABELS: Record<
  NonNullable<Props["aiManager"]>["archetype"],
  string
> = {
  GENTLE_SUPPORTER: "やさしい伴走型",
  PRODUCER: "プロデューサー型",
  ANALYST: "分析型",
  PROMOTER: "広報特化型",
  FAN_GUIDE: "ファン案内型",
};

const STATUS_LABELS: Record<NonNullable<Props["aiManager"]>["status"], string> = {
  DRAFT: "下書き",
  ACTIVE: "稼働中",
  PAUSED: "停止中",
  ARCHIVED: "保管済み",
};

const VISIBILITY_LABELS: Record<
  NonNullable<Props["aiManager"]>["publicVisibility"],
  string
> = {
  OWNER_ONLY: "owner only",
  PUBLIC_BADGED: "public badged",
  PRIVATE: "private",
};

const TONE_LABELS: Record<NonNullable<Props["aiManager"]>["tone"], string> = {
  POLITE: "丁寧",
  FRIENDLY: "フレンドリー",
  ELEGANT: "上品",
  ENERGETIC: "熱量高め",
  COOL: "クール",
};

const SUPPORT_STYLE_LABELS: Record<
  NonNullable<Props["aiManager"]>["supportStyle"],
  string
> = {
  ENCOURAGING: "応援重視",
  CALM: "落ち着いた整理",
  DATA_DRIVEN: "分析寄り",
  PROMOTIONAL: "広報寄り",
};

const CAPABILITY_LABELS: Record<
  NonNullable<Props["aiManager"]>["allowedBillableCapabilities"][number],
  string
> = {
  POST_DRAFTING: "投稿下書き",
  FAN_REPLY_ASSIST: "ファン返信補助",
  PROGRESS_SUMMARY: "進捗要約",
  WEB_RESEARCH: "Web収集",
};

function formatUpdatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "未更新";
  return date.toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getOperatingModeLabel(
  mode: NonNullable<Props["aiManager"]>["operatingMode"]
): string {
  if (mode === "BILLABLE_ACTIVE") return "billable 稼働可";
  if (mode === "FREE_ONLY") return "無料範囲のみ";
  return "停止中";
}

function getViewerNotice(viewerRole: Props["viewerRole"]): {
  title: string;
  description: string;
} {
  if (viewerRole === "CREATOR_OWNER") {
    return {
      title: "Manager Desk では AI Manager を read-only で確認します",
      description:
        "owner として閲覧していますが、この面では編集しません。人格設定や予算操作は Creator Home の AIマネージャー設定から行います。",
    };
  }

  return {
    title: "Human Manager は AI Manager を閲覧のみできます",
    description:
      "human manager は AI Manager の人格、公開状態、稼働モードを確認できます。設定変更、予算操作、公開範囲変更は owner only です。",
  };
}

export function ManagerDeskAiManagerReadOnlySection({
  creatorDisplayName,
  viewerRole,
  aiManager,
}: Props) {
  const viewerNotice = getViewerNotice(viewerRole);

  return (
    <section
      id="ai-manager-governance"
      className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-subtle)]">
            AI Manager / Boundary
          </div>
          <div className="text-sm text-[var(--text-subtle)]">
            AI Manager の稼働状態と、owner / manager / AI の責務境界をここで確認します。
          </div>
        </div>
        <span className="status-badge status-badge-neutral">read only</span>
      </div>

      <div className="mt-3 rounded-xl border border-[var(--line)] bg-[var(--surface-muted)] p-3">
        <div className="text-sm font-semibold text-[var(--text)]">{viewerNotice.title}</div>
        <p className="mt-1 text-sm leading-6 text-[var(--text-subtle)]">
          {viewerNotice.description}
        </p>
      </div>

      {aiManager ? (
        <div className="mt-4 grid gap-4 xl:grid-cols-[1.1fr,0.9fr]">
          <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-muted)] p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="status-badge status-badge-neutral">
                {STATUS_LABELS[aiManager.status]}
              </span>
              <span className="status-badge status-badge-neutral">
                {VISIBILITY_LABELS[aiManager.publicVisibility]}
              </span>
              <span className="status-badge status-badge-neutral">
                {getOperatingModeLabel(aiManager.operatingMode)}
              </span>
            </div>
            <div className="mt-3 text-lg font-semibold text-[var(--text)]">
              {aiManager.displayName}
            </div>
            <div className="mt-1 flex flex-wrap gap-2 text-xs text-[var(--text-subtle)]">
              <span>{ARCHETYPE_LABELS[aiManager.archetype]}</span>
              <span>・</span>
              <span>{TONE_LABELS[aiManager.tone]}</span>
              <span>・</span>
              <span>{SUPPORT_STYLE_LABELS[aiManager.supportStyle]}</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--text-subtle)]">
              {aiManager.intro?.trim() ||
                `${creatorDisplayName} の運営補助を支える AI Manager です。`}
            </p>
            <div className="mt-3 text-xs text-[var(--text-subtle)]">
              disclosure:{" "}
              {aiManager.disclosurePolicy === "ALWAYS_DISCLOSE_AI"
                ? "常に AI 明記"
                : "公開行動時に AI 明記"}
            </div>
            <div className="mt-1 text-xs text-[var(--text-subtle)]">
              更新: {formatUpdatedAt(aiManager.updatedAt)}
            </div>
          </div>

          <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-subtle)]">
              Allowed Scope
            </div>
            <div className="mt-3 space-y-3 text-sm text-[var(--text-subtle)]">
              <div>
                <div className="font-medium text-[var(--text)]">billable capability</div>
                <div className="mt-1 flex flex-wrap gap-2">
                  {aiManager.allowedBillableCapabilities.length > 0 ? (
                    aiManager.allowedBillableCapabilities.map((capability) => (
                      <span
                        key={capability}
                        className="rounded-full border border-[var(--line)] bg-[var(--surface-muted)] px-3 py-1 text-xs font-medium text-[var(--text)]"
                      >
                        {CAPABILITY_LABELS[capability]}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs">billable capability は未許可です。</span>
                  )}
                </div>
              </div>
              <div>
                <div className="font-medium text-[var(--text)]">free tier</div>
                <div className="mt-1">
                  {aiManager.freeTierScope === "BRIEFING_AND_LIGHT_DRAFTS"
                    ? "内部ブリーフィング + ごく軽い簡易下書き"
                    : "無料範囲は未設定"}
                </div>
              </div>
              <div>
                <div className="font-medium text-[var(--text)]">manager access</div>
                <div className="mt-1">
                  人間 Manager は閲覧のみで、人格設定・予算・公開範囲は変更できません。
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface-muted)] p-4 text-sm text-[var(--text-subtle)]">
          AI Manager はまだ作成されていません。作成後はこの面で人格、公開状態、稼働モードを read-only で確認できます。
        </div>
      )}

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <article className="rounded-xl border border-[var(--line)] bg-[var(--surface-muted)] p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-subtle)]">
            Creator Owner
          </div>
          <div className="mt-2 text-sm font-semibold text-[var(--text)]">
            創作と最終意思決定
          </div>
          <p className="mt-2 text-sm leading-6 text-[var(--text-subtle)]">
            公開するか、出演するか、表現をどうするかの最終判断は creator owner が持ちます。
          </p>
        </article>
        <article className="rounded-xl border border-[var(--line)] bg-[var(--surface-muted)] p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-subtle)]">
            Human Manager
          </div>
          <div className="mt-2 text-sm font-semibold text-[var(--text)]">
            現場と対外の実行責任
          </div>
          <p className="mt-2 text-sm leading-6 text-[var(--text-subtle)]">
            対外調整、会場確認、営業、進行管理、トラブル時の現実判断は human manager が担います。
          </p>
        </article>
        <article className="rounded-xl border border-[var(--line)] bg-[var(--surface-muted)] p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-subtle)]">
            AI Manager
          </div>
          <div className="mt-2 text-sm font-semibold text-[var(--text)]">
            整理・提案・補助
          </div>
          <p className="mt-2 text-sm leading-6 text-[var(--text-subtle)]">
            ブリーフィング、下書き、進捗整理、情報収集を担います。対外確約や重要判断の確定は行いません。
          </p>
        </article>
      </div>
    </section>
  );
}
