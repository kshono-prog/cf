"use client";

import { buildSetupNextBestAction } from "@/lib/growth/setup";

type Props = {
  walletConnected: boolean;
  userRegistered: boolean;
  creatorApplied: boolean;
  basicProfileCompleted: boolean;
  projectCreated: boolean;
  goalSaved: boolean;
  publicPageViewedByOwner: boolean;
  shareDraftsGenerated: boolean;
  publicPageUrl: string;
  projectHref: string;
  goalHref: string;
  shareHref: string;
  onProfileAction: () => void;
};

export function NextBestActionCard(props: Props) {
  const action = buildSetupNextBestAction({
    walletConnected: props.walletConnected,
    userRegistered: props.userRegistered,
    creatorApplied: props.creatorApplied,
    basicProfileCompleted: props.basicProfileCompleted,
    projectCreated: props.projectCreated,
    goalSaved: props.goalSaved,
    publicPageViewedByOwner: props.publicPageViewedByOwner,
    shareDraftsGenerated: props.shareDraftsGenerated,
  });

  const cta =
    action.kind === "profile" ? (
      <button type="button" className="btn" onClick={props.onProfileAction}>
        {action.ctaLabel}
      </button>
    ) : action.kind === "project" ? (
      <a href={props.projectHref} className="btn">
        {action.ctaLabel}
      </a>
    ) : action.kind === "goal" ? (
      <a href={props.goalHref} className="btn">
        {action.ctaLabel}
      </a>
    ) : action.kind === "public" ? (
      <a href={props.publicPageUrl} className="btn" target="_blank" rel="noreferrer">
        {action.ctaLabel}
      </a>
    ) : (
      <a href={props.shareHref} className="btn">
        {action.ctaLabel}
      </a>
    );

  return (
    <section className="surface-card p-5 sm:p-6">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700">
        Next Best Action
      </div>
      <h2 className="mt-1 text-xl font-semibold text-[var(--text)]">
        {action.title}
      </h2>
      <p className="mt-2 text-sm leading-6 text-[var(--text-subtle)]">
        {action.description}
      </p>
      <div className="mt-4 flex flex-wrap gap-3">{cta}</div>
    </section>
  );
}
