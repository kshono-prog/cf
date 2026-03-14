"use client";

import Image from "next/image";
import Link from "next/link";

import { Avatar } from "@/components/shared/Avatar";
import {
  SOCIAL_ICON_CONFIG,
  type SocialLinks,
} from "@/lib/profileTypes";

type ProfileHeroProps = {
  username: string;
  displayName: string;
  avatarUrl: string | null | undefined;
  profile: string | null | undefined;
  externalUrl: string | null | undefined;
  socials?: SocialLinks | null | undefined;
  communityContent?: React.ReactNode;
};

function getInitials(value: string): string {
  const normalized = value.trim();
  if (!normalized) return "?";
  return normalized.slice(0, 1).toUpperCase();
}

export function ProfileHero(props: ProfileHeroProps) {
  const socialEntries = SOCIAL_ICON_CONFIG.flatMap((item) => {
    const url = props.socials?.[item.key];
    if (!url) return [];
    return [{ key: item.key, label: item.label, icon: item.icon, url }];
  });
  const shouldShowExternalUrl =
    !!props.externalUrl &&
    !socialEntries.some((entry) => entry.url === props.externalUrl);

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
            {socialEntries.length > 0 || shouldShowExternalUrl ? (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                {socialEntries.map((entry) => (
                  <Link
                    key={entry.key}
                    href={entry.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)] bg-white text-[var(--text-subtle)] transition hover:border-[var(--text-subtle)] hover:text-[var(--text)]"
                    aria-label={entry.label}
                  >
                    <Image
                      src={entry.icon}
                      alt={entry.label}
                      width={16}
                      height={16}
                      className="h-4 w-4"
                    />
                  </Link>
                ))}
                {shouldShowExternalUrl ? (
                  <Link
                    href={props.externalUrl ?? "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)] bg-white text-[var(--text-subtle)] transition hover:border-[var(--text-subtle)] hover:text-[var(--text)]"
                    aria-label="外部リンク"
                  >
                    <Image
                      src="/icon/icon-link.svg"
                      alt="外部リンク"
                      width={16}
                      height={16}
                      className="h-4 w-4"
                    />
                  </Link>
                ) : null}
              </div>
            ) : null}
            {props.communityContent ? (
              <div className="mt-4 border-t border-[var(--line)] pt-4">
                {props.communityContent}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
