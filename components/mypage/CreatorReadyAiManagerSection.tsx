"use client";

import type {
  CreatorReadyAiManagerCard,
  CreatorReadyHomeAction,
} from "@/components/mypage/creatorReadyHomeAiHelpers";

type Props = {
  loading: boolean;
  cards: CreatorReadyAiManagerCard[];
  onOpenSettings: () => void;
};

function toneStyles(
  tone: CreatorReadyAiManagerCard["tone"]
): {
  wrapper: string;
  badge: string;
} {
  switch (tone) {
    case "attention":
      return {
        wrapper: "border-amber-200 bg-amber-50/80",
        badge: "border-amber-200 bg-white text-amber-800",
      };
    case "recommended":
      return {
        wrapper: "border-emerald-200 bg-emerald-50/80",
        badge: "border-emerald-200 bg-white text-emerald-800",
      };
    default:
      return {
        wrapper: "border-slate-200 bg-slate-50/80",
        badge: "border-slate-200 bg-white text-slate-700",
      };
  }
}

function ActionButton(props: {
  action: CreatorReadyHomeAction;
  onOpenSettings: () => void;
}) {
  if (props.action.kind === "settings") {
    return (
      <button type="button" className="btn-secondary" onClick={props.onOpenSettings}>
        {props.action.label}
      </button>
    );
  }

  return (
    <a href={props.action.href} className="btn-secondary">
      {props.action.label}
    </a>
  );
}

export function CreatorReadyAiManagerSection(props: Props) {
  return (
    <section className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-950">AI Manager</div>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            AI Office の提案を、チャットではなく運営カードとして先に確認できます。
          </p>
        </div>
        <div className="text-[11px] text-slate-500">
          {props.loading ? "AI が状況を整理中です" : "いま実務につながる提案だけを表示"}
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {props.cards.map((card) => {
          const styles = toneStyles(card.tone);
          return (
            <article
              key={card.id}
              className={`rounded-2xl border p-4 shadow-sm ${styles.wrapper}`}
            >
              <div className="flex flex-wrap items-start gap-2">
                {card.badge ? (
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${styles.badge}`}
                  >
                    {card.badge}
                  </span>
                ) : null}
              </div>
              <div className="mt-3 text-sm font-semibold text-slate-950">
                {card.title}
              </div>
              <div className="mt-2 text-xs leading-5 text-slate-700">
                {card.body}
              </div>
              <div className="mt-4">
                <ActionButton
                  action={card.action}
                  onOpenSettings={props.onOpenSettings}
                />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
