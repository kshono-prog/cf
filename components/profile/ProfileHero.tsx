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
    <section className="panel-card overflow-hidden">
      <div className="h-20 bg-[linear-gradient(135deg,#ffffff,rgba(240,241,244,0.92)_45%,rgba(229,231,235,0.72))]" />
      <div className="-mt-8 px-4 pb-3.5 sm:px-5 sm:pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="inline-flex rounded-full border border-white bg-white p-1 shadow-sm">
              <Avatar
                src={props.avatarUrl}
                alt={`${props.displayName} のアイコン`}
                fallbackText={getInitials(props.displayName)}
                size={58}
              />
            </div>
            <div className="mt-2.5">
              <h1 className="text-[1.25rem] font-semibold tracking-tight text-[var(--text)] sm:text-[1.4rem]">
                {props.displayName}
              </h1>
              <p className="mt-0.5 text-[12px] text-[var(--text-subtle)]">@{props.username}</p>
            </div>
            {props.profile ? (
              <p className="line-clamp-3 mt-2 max-w-2xl whitespace-pre-wrap text-[12px] leading-5 text-[var(--text)]">
                {props.profile}
              </p>
            ) : null}
            {socialEntries.length > 0 || shouldShowExternalUrl ? (
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                {socialEntries.map((entry) => (
                  <Link
                    key={entry.key}
                    href={entry.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--line)] bg-white text-[var(--text-subtle)] transition hover:border-[var(--text-subtle)] hover:text-[var(--text)]"
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
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--line)] bg-white text-[var(--text-subtle)] transition hover:border-[var(--text-subtle)] hover:text-[var(--text)]"
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
              <div className="mt-2.5 border-t border-[var(--line)] pt-2.5">
                {props.communityContent}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
