import type { RewardTierProductionStatus } from "@/lib/rewardTierProgress";

type Props = {
  status: RewardTierProductionStatus;
  className?: string;
};

const STYLE: Record<
  RewardTierProductionStatus,
  { label: string; className: string }
> = {
  NOT_STARTED: {
    label: "受付中",
    className: "bg-slate-100 text-slate-700 border-slate-200",
  },
  READY_TO_START: {
    label: "制作開始準備完了",
    className: "bg-amber-100 text-amber-800 border-amber-200",
  },
  IN_PROGRESS: {
    label: "制作中",
    className: "bg-sky-100 text-sky-800 border-sky-200",
  },
  COMPLETED: {
    label: "提供完了",
    className: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  CANCELED: {
    label: "受付終了",
    className: "bg-slate-100 text-slate-500 border-slate-200",
  },
};

export function RewardTierProductionBadge({ status, className }: Props) {
  const meta = STYLE[status];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${meta.className} ${className ?? ""}`}
    >
      {meta.label}
    </span>
  );
}
