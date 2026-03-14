"use client";

import Link from "next/link";

import { Avatar } from "@/components/shared/Avatar";

type ProfileHeroProps = {
  username: string;
  displayName: string;
  avatarUrl: string | null | undefined;
  profile: string | null | undefined;
  externalUrl: string | null | undefined;
  supportLabel: string;
  onSupport: () => void;
};

function getInitials(value: string): string {
  const normalized = value.trim();
  if (!normalized) return "?";
  return normalized.slice(0, 1).toUpperCase();
}

export function ProfileHero(props: ProfileHeroProps) {
  return (
    <section className="surface-card overflow-hidden">
      <div className="h-28 bg-[linear-gradient(135deg,#ffffff,rgba(240,241,244,0.92)_45%,rgba(229,231,235,0.72))]" />
      <div className="-mt-10 px-5 pb-5 sm:px-6 sm:pb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="inline-flex rounded-full border border-white bg-white p-1 shadow-sm">
              <Avatar
                src={props.avatarUrl}
                alt={`${props.displayName} のアイコン`}
                fallbackText={getInitials(props.displayName)}
                size={72}
              />
            </div>
            <div className="mt-4">
              <h1 className="text-2xl font-semibold tracking-tight text-[var(--text)]">
                {props.displayName}
              </h1>
              <p className="mt-1 text-sm text-[var(--text-subtle)]">@{props.username}</p>
            </div>
            {props.profile ? (
              <p className="mt-3 max-w-2xl whitespace-pre-wrap text-sm leading-7 text-[var(--text)]">
                {props.profile}
              </p>
            ) : null}
            {props.externalUrl ? (
              <Link
                href={props.externalUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-2 text-sm text-[var(--accent)]"
              >
                外部リンク
                <span aria-hidden="true">↗</span>
              </Link>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button type="button" className="btn" onClick={props.onSupport}>
              {props.supportLabel}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
