"use client";

import Image from "next/image";
import Link from "next/link";

import { Avatar } from "@/components/shared/Avatar";
import {
  SOCIAL_ICON_CONFIG,
  type SocialLinks,
} from "@/lib/profileTypes";
import {
  CREATOR_TYPE_LABELS,
  ECOSYSTEM_ROLE_LABELS,
  type EcosystemRole,
} from "@/lib/creatorTaxonomy";
import type { CreatorType } from "@/lib/creatorTaxonomy";

type ProfileHeroProps = {
  username: string;
  displayName: string;
  avatarUrl: string | null | undefined;
  profile: string | null | undefined;
  externalUrl: string | null | undefined;
  themeColor?: string | null | undefined;
  socials?: SocialLinks | null | undefined;
  creatorType?: CreatorType | null | undefined;
  ecosystemRole?: EcosystemRole | null | undefined;
  communityContent?: React.ReactNode;
  impactContent?: React.ReactNode;
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
  const heroBackgroundStyle = props.themeColor
    ? {
        backgroundImage: `linear-gradient(135deg, ${props.themeColor}, color-mix(in srgb, ${props.themeColor} 58%, white) 45%, color-mix(in srgb, ${props.themeColor} 28%, white))`,
      }
    : undefined;

  return (
    <section className="sheet-section overflow-hidden">
      <div
        className="h-40 bg-[var(--surface-subtle)] sm:h-48"
        style={heroBackgroundStyle}
      />
      <div className="-mt-11 px-4 pb-3.5 sm:-mt-14 sm:px-5 sm:pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="avatar-circle inline-flex rounded-full border-2 border-[var(--surface)] bg-[var(--surface)] p-1 shadow-sm">
              <Avatar
                src={props.avatarUrl}
                alt={`${props.displayName} のアイコン`}
                fallbackText={getInitials(props.displayName)}
                size={76}
              />
            </div>
            <div className="mt-2.5">
              <h1 className="text-[1.25rem] font-semibold tracking-tight text-[var(--text)] sm:text-[1.4rem]">
                {props.displayName}
              </h1>
              <p className="mt-0.5 text-[12px] text-[var(--text-subtle)]">@{props.username}</p>
              {(props.creatorType || props.ecosystemRole) ? (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {props.creatorType ? (
                    <span className="surface-chip">
                      {CREATOR_TYPE_LABELS[props.creatorType]}
                    </span>
                  ) : null}
                  {props.ecosystemRole ? (
                    <span className="surface-chip">
                      {ECOSYSTEM_ROLE_LABELS[props.ecosystemRole]}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
            {props.profile ? (
              <p className="mt-2 max-w-2xl whitespace-pre-wrap text-[12px] leading-5 text-[var(--text)]">
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
                    className="inline-flex h-8 w-8 items-center justify-center text-[var(--text-subtle)] transition hover:text-[var(--text)]"
                    aria-label={entry.label}
                  >
                    <Image
                      src={entry.icon}
                      alt={entry.label}
                      width={16}
                      height={16}
                      className="social-icon h-4 w-4"
                    />
                  </Link>
                ))}
                {shouldShowExternalUrl ? (
                  <Link
                    href={props.externalUrl!}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-8 w-8 items-center justify-center text-[var(--text-subtle)] transition hover:text-[var(--text)]"
                    aria-label="外部リンク"
                  >
                    <Image
                      src="/icon/icon-link.svg"
                      alt="外部リンク"
                      width={16}
                      height={16}
                      className="social-icon h-4 w-4"
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
            {props.impactContent ? (
              <div className="mt-3 border-t border-[var(--line)] pt-3">
                {props.impactContent}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
