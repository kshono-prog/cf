"use client";

import type { ReactNode } from "react";

type CommunityGuideCardProps = {
  title: string;
  body: string;
  actions?: ReactNode;
  centered?: boolean;
  maxWidthClassName?: string;
};

type CommunityGuideLoadingProps = {
  title: string;
  body?: string;
  centered?: boolean;
  maxWidthClassName?: string;
};

function joinClassNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

export function CommunityGuideCard({
  title,
  body,
  actions,
  centered = false,
  maxWidthClassName,
}: CommunityGuideCardProps) {
  const containerClassName = joinClassNames(
    centered ? "mx-auto text-center" : null,
    maxWidthClassName
  );

  return (
    <section className="surface-subtle px-4 py-4 sm:px-5">
      <div className={containerClassName}>
        <h2 className="text-sm font-semibold text-[var(--text)]">{title}</h2>
        <p className="mt-1 text-xs leading-6 text-[var(--text-subtle)]">{body}</p>
        {actions ? <div className="mt-3 flex flex-wrap justify-center gap-2">{actions}</div> : null}
      </div>
    </section>
  );
}

export function CommunityGuideLoadingCard({
  title,
  body,
  centered = false,
  maxWidthClassName,
}: CommunityGuideLoadingProps) {
  const containerClassName = joinClassNames(
    centered ? "mx-auto text-center" : null,
    maxWidthClassName
  );

  return (
    <section className="surface-subtle px-4 py-4 sm:px-5">
      <div className={containerClassName}>
        <div
          className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-[var(--line)] border-t-[var(--accent)]"
          aria-hidden="true"
        />
        <div className="text-sm font-semibold text-[var(--text)]">{title}</div>
        {body ? (
          <p className="mt-1 text-xs leading-6 text-[var(--text-subtle)]">{body}</p>
        ) : null}
      </div>
    </section>
  );
}
