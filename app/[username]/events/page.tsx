import Link from "next/link";
import { notFound } from "next/navigation";

import { EventDateTime } from "@/components/EventDateTime";
import { MyPageFooter } from "@/components/MyPageFooter";
import { PublicWorkspaceShell } from "@/components/layout/PublicWorkspaceShell";
import {
  CREATOR_TYPE_LABELS,
  CREATOR_TYPE_OPTIONS,
  EVENT_CATEGORY_LABELS,
  EVENT_CATEGORY_OPTIONS,
} from "@/lib/creatorTaxonomy";
import { loadEventsPageData } from "@/lib/eventsPageData";
import { FEATURED_EVENTS_PROMOTION } from "@/lib/eventsFeaturedPromotion";
import { loadPublicPageData } from "@/lib/publicPageData";

type EventsPageProps = {
  params: Promise<{ username: string }>;
  searchParams?: Promise<{ creatorType?: string; category?: string }>;
};

export default async function EventsPage({
  params,
  searchParams,
}: EventsPageProps) {
  const { username } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const activeCreatorType = resolvedSearchParams.creatorType ?? "";
  const activeCategory = resolvedSearchParams.category ?? "";

  const [{ creator, events, publicEvents, randomCreators }, publicPageData] =
    await Promise.all([
      loadEventsPageData({
        username,
        activeCreatorType,
        activeCategory,
      }),
      loadPublicPageData(username),
    ]);

  if (!creator) notFound();

  const displayName = creator.displayName ?? username;

  function buildFilterHref(next: {
    creatorType?: string;
    category?: string;
  }): string {
    const params = new URLSearchParams();
    if (next.creatorType) params.set("creatorType", next.creatorType);
    if (next.category) params.set("category", next.category);
    const query = params.toString();
    return query ? `/${username}/events?${query}` : `/${username}/events`;
  }

  return (
    <PublicWorkspaceShell
      username={username}
      currentPage="events"
      creator={publicPageData.creator}
      supportShortcutHref={`/${username}#support-projects`}
      publicAiManager={publicPageData.publicAiManager}
      supportProfileView={publicPageData.supportProfileView}
    >
    <div className="space-y-6">
        <section className="panel-card space-y-4 p-4 sm:p-5">
          <div className="space-y-2">
            <h1 className="text-lg font-semibold sm:text-xl">
              {displayName} のイベント
            </h1>
            <p className="text-sm leading-6 text-[var(--text-subtle)]">
              いま公開されているイベントをまとめて見られます。
            </p>
            {creator.creatorType ? (
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1 text-xs text-[var(--text-subtle)]">
                  {
                    CREATOR_TYPE_LABELS[
                      creator.creatorType as keyof typeof CREATOR_TYPE_LABELS
                    ]
                  }
                </span>
              </div>
            ) : null}
          </div>

          {events.length === 0 ? (
            <p className="text-sm text-[var(--text-subtle)]">
              現在、公開中のイベントはありません。
            </p>
          ) : (
            <div className="space-y-3">
              {events.map((event) => (
                <article
                  key={event.id}
                  className="rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] p-4 shadow-sm"
                >
                  <div className="text-sm font-semibold text-[var(--text)]">
                    {event.title}
                  </div>

                  {event.date ? (
                    <div className="mt-1 text-sm text-[var(--text-subtle)]">
                      開催日時:{" "}
                      <EventDateTime
                        iso={event.date}
                        options={{
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        }}
                      />
                    </div>
                  ) : null}

                  {typeof event.goalAmount === "number" ? (
                    <div className="mt-1 text-sm text-[var(--text-subtle)]">
                      目標投げ銭: {event.goalAmount.toLocaleString()} JPYC
                    </div>
                  ) : null}

                  {event.categories.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {event.categories.map((category) => (
                        <span
                          key={`${event.id}-${category}`}
                          className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-2 py-0.5 text-xs text-[var(--text-subtle)]"
                        >
                          {
                            EVENT_CATEGORY_LABELS[
                              category as keyof typeof EVENT_CATEGORY_LABELS
                            ]
                          }
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {event.description ? (
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--text)]">
                      {event.description}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="panel-card space-y-4 p-4 sm:p-5">
          <div className="flex items-end justify-between gap-3">
            <div className="space-y-1">
              <h2 className="text-base font-semibold">みんなの公開イベント</h2>
              <p className="text-sm text-[var(--text-subtle)]">
                イベントカテゴリで絞り込めます。
              </p>
            </div>
            <p className="text-sm text-[var(--text-subtle)]">
              {publicEvents.length} 件
            </p>
          </div>

          <div className="space-y-2 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3">
            <div className="pt-1 text-xs font-semibold text-[var(--text)]">
              カテゴリで絞り込み
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={buildFilterHref({})}
                className={`rounded-full border px-3 py-1 text-xs ${
                  !activeCategory
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-[var(--line)] bg-[var(--surface)] text-[var(--text-subtle)]"
                }`}
              >
                すべて
              </Link>
              {EVENT_CATEGORY_OPTIONS.map((option) => (
                <Link
                  key={option}
                  href={buildFilterHref({ category: option })}
                  className={`rounded-full border px-3 py-1 text-xs ${
                    activeCategory === option
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-[var(--line)] bg-[var(--surface)] text-[var(--text-subtle)]"
                  }`}
                >
                  {EVENT_CATEGORY_LABELS[option]}
                </Link>
              ))}
            </div>

            {activeCategory ? (
              <div className="pt-1">
                <Link
                  href={buildFilterHref({
                    creatorType: activeCreatorType || undefined,
                  })}
                  className="text-xs text-slate-700 underline"
                >
                  絞り込みをクリア
                </Link>
              </div>
            ) : null}
          </div>

          {publicEvents.length === 0 ? (
            <p className="text-sm text-[var(--text-subtle)]">
              条件に一致する公開イベントはまだありません。
            </p>
          ) : (
            <div className="space-y-3">
              {publicEvents.map((event) => (
                <Link
                  key={event.id}
                  href={`/${event.creator.username}/events`}
                  className="surface-subtle flex gap-3 px-4 py-4 transition hover:bg-[var(--surface)]"
                >
                  <div className="flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={event.creator.avatarUrl || "/icon/nagesen250.png"}
                      alt={event.creator.displayName || event.creator.username}
                      className="h-10 w-10 rounded-full border border-[var(--line)] bg-[var(--surface)] object-cover"
                    />
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold">
                        {event.title}
                      </span>
                      <span
                        className="rounded-md px-2 py-0.5 text-xs font-bold text-white"
                        style={{
                          backgroundColor: event.creator.themeColor || "#005bbb",
                        }}
                      >
                        @{event.creator.username}
                      </span>
                    </div>

                    <p className="truncate text-sm text-[var(--text-subtle)]">
                      {event.creator.displayName || event.creator.username}
                    </p>

                    {event.creator.creatorType || event.categories.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {event.creator.creatorType ? (
                          <span className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-2 py-0.5 text-xs text-[var(--text-subtle)]">
                            {
                              CREATOR_TYPE_LABELS[
                                event.creator.creatorType as keyof typeof CREATOR_TYPE_LABELS
                              ]
                            }
                          </span>
                        ) : null}
                        {event.categories.slice(0, 3).map((category) => (
                          <span
                            key={`${event.id}-${category}`}
                            className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-2 py-0.5 text-xs text-[var(--text-subtle)]"
                          >
                            {
                              EVENT_CATEGORY_LABELS[
                                category as keyof typeof EVENT_CATEGORY_LABELS
                              ]
                            }
                          </span>
                        ))}
                      </div>
                    ) : null}

                    {event.date ? (
                      <p className="text-sm text-[var(--text-subtle)]">
                        <EventDateTime
                          iso={event.date}
                          options={{
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          }}
                        />
                      </p>
                    ) : null}

                    {typeof event.goalAmount === "number" ? (
                      <p className="text-sm text-[var(--text-subtle)]">
                        目標: {event.goalAmount.toLocaleString()} JPYC
                      </p>
                    ) : null}

                    {event.description ? (
                      <p className="line-clamp-2 whitespace-pre-wrap text-sm text-[var(--text)]">
                        {event.description}
                      </p>
                    ) : null}

                    <p className="pt-1 text-xs font-medium text-[var(--accent)]">
                      {event.creator.displayName || event.creator.username} さんのイベント一覧を見る
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="panel-card space-y-4 p-4 sm:p-5">
          <div className="space-y-2">
            <h2 className="text-base font-semibold">クリエイター一覧</h2>
            <p className="text-sm text-[var(--text-subtle)]">
              クリエイターの種類で絞り込めます。
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={buildFilterHref({ category: activeCategory || undefined })}
              className={`rounded-full border px-3 py-1 text-xs ${
                !activeCreatorType
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-[var(--line)] bg-[var(--surface)] text-[var(--text-subtle)]"
              }`}
            >
              すべて
            </Link>
            {CREATOR_TYPE_OPTIONS.map((option) => (
              <Link
                key={option}
                href={buildFilterHref({
                  creatorType: option,
                  category: activeCategory || undefined,
                })}
                className={`rounded-full border px-3 py-1 text-xs ${
                  activeCreatorType === option
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-[var(--line)] bg-[var(--surface)] text-[var(--text-subtle)]"
                }`}
              >
                {CREATOR_TYPE_LABELS[option]}
              </Link>
            ))}
          </div>

          <p className="text-sm text-[var(--text-subtle)]">
            このアプリに登録されているクリエイターを表示しています。
          </p>

          {randomCreators.length === 0 ? (
            <p className="text-sm text-[var(--text-subtle)]">
              条件に合うクリエイターはまだいません。
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {randomCreators.map((creatorCard) => (
                <Link
                  key={creatorCard.username}
                  href={`/${creatorCard.username}`}
                  className="surface-subtle flex items-start gap-3 px-4 py-4 transition hover:bg-[var(--surface)]"
                >
                  <div className="flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={creatorCard.avatarUrl || "/icon/nagesen250.png"}
                      alt={creatorCard.displayName || creatorCard.username}
                      className="h-12 w-12 rounded-full border border-[var(--line)] bg-[var(--surface)] object-cover"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {creatorCard.displayName || creatorCard.username}
                    </p>
                    {creatorCard.creatorType ? (
                      <p className="mt-1 text-xs text-[var(--text-subtle)]">
                        {
                          CREATOR_TYPE_LABELS[
                            creatorCard.creatorType as keyof typeof CREATOR_TYPE_LABELS
                          ]
                        }
                      </p>
                    ) : null}
                    <p className="line-clamp-3 whitespace-pre-line text-sm text-[var(--text-subtle)]">
                      {creatorCard.profile || "プロフィールは準備中です。"}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-subtle)]">
                      @{creatorCard.username}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="panel-card relative space-y-4 p-4 text-left sm:p-5">
          <span className="absolute -left-2 -top-2 rounded-md bg-rose-600 px-2 py-0.5 text-xs font-bold text-white shadow-sm">
            PR
          </span>

          <div className="text-xs font-semibold uppercase tracking-wide text-rose-700">
            EVENT
          </div>

          <h2 className="text-base font-semibold text-[var(--text)] sm:text-lg">
            {FEATURED_EVENTS_PROMOTION.title}
          </h2>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={FEATURED_EVENTS_PROMOTION.imageSrc}
            alt={FEATURED_EVENTS_PROMOTION.imageAlt}
            className="w-full rounded-xl object-cover shadow-sm"
          />

          <div className="space-y-3">
            {FEATURED_EVENTS_PROMOTION.summary.map((paragraph) => (
              <p key={paragraph} className="text-sm leading-relaxed text-[var(--text)]">
                {paragraph}
              </p>
            ))}
          </div>

          <div className="grid gap-3 text-sm text-[var(--text)] sm:grid-cols-2">
            <div>
              <h3 className="mb-1 text-xs font-semibold text-[var(--text)]">
                スケジュール
              </h3>
              <div className="space-y-1 leading-relaxed">
                {FEATURED_EVENTS_PROMOTION.scheduleLines.map((line) => (
                  <p key={line}>・{line}</p>
                ))}
              </div>
            </div>
            <div>
              <h3 className="mb-1 text-xs font-semibold text-[var(--text)]">
                料金（オープニング価格）
              </h3>
              <div className="space-y-1 leading-relaxed">
                {FEATURED_EVENTS_PROMOTION.pricingLines.map((line) => (
                  <p key={line}>・{line}</p>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href={FEATURED_EVENTS_PROMOTION.primaryHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-rose-500"
            >
              {FEATURED_EVENTS_PROMOTION.primaryLabel}
            </a>

            <a
              href={FEATURED_EVENTS_PROMOTION.secondaryHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-subtle)] px-3 py-1.5 text-sm font-medium text-[var(--text)] transition hover:opacity-90"
            >
              {FEATURED_EVENTS_PROMOTION.secondaryLabel}
            </a>
          </div>

          <p className="text-xs leading-relaxed text-[var(--text-subtle)]">
            ※ {FEATURED_EVENTS_PROMOTION.footnote}
          </p>
        </section>

        <MyPageFooter />
      </div>
    </PublicWorkspaceShell>
  );
}
