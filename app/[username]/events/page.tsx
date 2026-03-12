// app/[username]/events/page.tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { EventDateTime } from "@/components/EventDateTime";
import { MyPageFooter } from "@/components/MyPageFooter";
import type { CreatorProfile } from "@/lib/profileTypes";
import {
  CREATOR_CATEGORY_LABELS,
  CREATOR_CATEGORY_OPTIONS,
  CREATOR_TYPE_LABELS,
  CREATOR_TYPE_OPTIONS,
} from "@/lib/creatorTaxonomy";

// このプロジェクトの PageProps に合わせて Promise にする
type EventsPageProps = {
  params: Promise<{ username: string }>;
  searchParams?: Promise<{ creatorType?: string; category?: string }>;
};

type EventDto = {
  id: string;
  title: string;
  description?: string | null;
  date?: string | null;
  goalAmount?: number | null;
};

type PublicEventDto = EventDto & {
  creator: {
    username: string;
    displayName?: string | null;
    avatarUrl?: string | null;
    themeColor?: string | null;
    creatorType?: string | null;
    categories?: string[];
  };
};

type RandomCreatorCard = {
  username: string;
  displayName?: string;
  profile?: string | null;
  avatarUrl?: string | null;
};

export default async function EventsPage({
  params,
  searchParams,
}: EventsPageProps) {
  const { username } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const activeCreatorType = resolvedSearchParams.creatorType ?? "";
  const activeCategory = resolvedSearchParams.category ?? "";

  const BASE_URL =
    process.env.NEXT_PUBLIC_BASE_URL || "https://nagesen-v2.vercel.app";

  // --- クリエイター情報 ---
  let creator: CreatorProfile | null = null;
  try {
    const res = await fetch(
      `${BASE_URL}/api/creators/${encodeURIComponent(username)}`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) notFound();
    creator = (await res.json()) as CreatorProfile;
  } catch (error: unknown) {
    console.error("Failed to fetch creator in events page:", error);
    notFound();
  }
  if (!creator) notFound();

  const themeColor = creator.themeColor ?? "#005bbb";
  const displayName = creator.displayName ?? username;
  const pageCategories = creator.categories ?? [];

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

  // --- [username] の公開イベント一覧 ---
  let events: EventDto[] = [];
  try {
    const eventsRes = await fetch(
      `${BASE_URL}/api/creators/${encodeURIComponent(username)}/events`,
      { next: { revalidate: 30 } }
    );

    if (eventsRes.ok) {
      const data = (await eventsRes.json()) as { events?: EventDto[] };
      events = data.events ?? [];
    } else {
      console.error(
        "Failed to fetch creator events:",
        eventsRes.status,
        await eventsRes.text()
      );
    }
  } catch (error: unknown) {
    console.error("Failed to fetch creator events:", error);
  }

  // --- [username] 以外の全ユーザー公開イベント一覧 ---
  let publicEvents: PublicEventDto[] = [];
  try {
    const publicRes = await fetch(
      `${BASE_URL}/api/events/public?exclude=${encodeURIComponent(
        username
      )}&limit=80${
        activeCreatorType
          ? `&creatorType=${encodeURIComponent(activeCreatorType)}`
          : ""
      }${
        activeCategory ? `&category=${encodeURIComponent(activeCategory)}` : ""
      }`,
      { next: { revalidate: 30 } }
    );

    if (publicRes.ok) {
      const data = (await publicRes.json()) as { events?: PublicEventDto[] };
      publicEvents = data.events ?? [];
    } else {
      console.error(
        "Failed to fetch public events:",
        publicRes.status,
        await publicRes.text()
      );
    }
  } catch (error: unknown) {
    console.error("Failed to fetch public events:", error);
  }

  // --- ランダムクリエイター一覧（既存） ---
  let randomCreators: RandomCreatorCard[] = [];
  try {
    const randomRes = await fetch(`${BASE_URL}/api/creators/random?limit=100`, {
      next: { revalidate: 60 },
    });

    if (randomRes.ok) {
      const data = (await randomRes.json()) as CreatorProfile[];
      randomCreators = data.map((c) => ({
        username: c.username,
        displayName: c.displayName,
        profile: c.profile ?? null,
        avatarUrl: c.avatarUrl ?? null,
      }));
    }
  } catch (error: unknown) {
    console.error("Failed to fetch random creators:", error);
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 force-light-theme">
      <div className="container-narrow space-y-4">
        {/* ========== 上段：[username] の公開イベント一覧 ========== */}
        <div className="space-y-3 mb-10">
          <div className="space-y-2">
            <h1 className="text-sm font-semibold">{displayName} のイベント</h1>
            {creator.creatorType || pageCategories.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {creator.creatorType ? (
                  <span className="rounded-full border border-gray-300 bg-white px-3 py-1 text-xs text-gray-700">
                    {
                      CREATOR_TYPE_LABELS[
                        creator.creatorType as keyof typeof CREATOR_TYPE_LABELS
                      ]
                    }
                  </span>
                ) : null}
                {pageCategories.map((category) => (
                  <span
                    key={category}
                    className="rounded-full border border-gray-200 bg-gray-100 px-3 py-1 text-xs text-gray-600"
                  >
                    {
                      CREATOR_CATEGORY_LABELS[
                        category as keyof typeof CREATOR_CATEGORY_LABELS
                      ]
                    }
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          {events.length === 0 ? (
            <p className="text-xs text-gray-500">
              現在、公開中のイベントはありません。
            </p>
          ) : (
            events.map((ev) => (
              <div
                key={ev.id}
                className="card p-3 space-y-1 border border-amber-200 shadow-sm"
                style={{
                  backgroundColor: "#fff6d6",
                  borderColor: "#f3d28e",
                  boxShadow: "0 2px 6px rgba(120, 53, 15, 0.12)",
                }}
              >
                <div className="text-sm font-semibold">{ev.title}</div>

                {ev.date && (
                  <div className="text-xs text-gray-500">
                    開催日時:{" "}
                    <EventDateTime
                      iso={ev.date}
                      options={{
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      }}
                    />
                  </div>
                )}

                {typeof ev.goalAmount === "number" && (
                  <div className="text-xs text-gray-500">
                    目標投げ銭: {ev.goalAmount.toLocaleString()} JPYC
                  </div>
                )}

                {ev.description && (
                  <p className="text-xs text-gray-700 whitespace-pre-wrap mt-1">
                    {ev.description}
                  </p>
                )}
              </div>
            ))
          )}
        </div>

        {/* ========== 下段：[username] 以外の全ユーザー公開イベント一覧 ========== */}
        <div className="space-y-3 mb-10">
          <div className="flex items-end justify-between">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold">みんなの公開イベント</h2>
              <p className="text-[11px] text-gray-500">
                クリエイターの種類やカテゴリで絞り込めます。
              </p>
            </div>
            <p className="text-[11px] text-gray-500">
              {publicEvents.length} 件
            </p>
          </div>

          <div className="space-y-2 rounded-2xl border border-gray-200 bg-white p-3">
            <div className="text-xs font-semibold text-gray-700">
              種類で絞り込み
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={buildFilterHref({ category: activeCategory || undefined })}
                className={`rounded-full border px-3 py-1 text-xs ${
                  !activeCreatorType
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-gray-300 bg-white text-gray-700"
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
                      : "border-gray-300 bg-white text-gray-700"
                  }`}
                >
                  {CREATOR_TYPE_LABELS[option]}
                </Link>
              ))}
            </div>

            <div className="pt-1 text-xs font-semibold text-gray-700">
              カテゴリで絞り込み
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={buildFilterHref({
                  creatorType: activeCreatorType || undefined,
                })}
                className={`rounded-full border px-3 py-1 text-xs ${
                  !activeCategory
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-gray-300 bg-white text-gray-700"
                }`}
              >
                すべて
              </Link>
              {CREATOR_CATEGORY_OPTIONS.map((option) => (
                <Link
                  key={option}
                  href={buildFilterHref({
                    creatorType: activeCreatorType || undefined,
                    category: option,
                  })}
                  className={`rounded-full border px-3 py-1 text-xs ${
                    activeCategory === option
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-gray-300 bg-white text-gray-700"
                  }`}
                >
                  {CREATOR_CATEGORY_LABELS[option]}
                </Link>
              ))}
            </div>

            {activeCreatorType || activeCategory ? (
              <div className="pt-1">
                <Link
                  href={`/${username}/events`}
                  className="text-xs text-slate-700 underline"
                >
                  絞り込みをクリア
                </Link>
              </div>
            ) : null}
          </div>

          {publicEvents.length === 0 ? (
            <p className="text-xs text-gray-500">
              条件に一致する公開イベントはまだありません。
            </p>
          ) : (
            publicEvents.map((ev) => (
              <a
                key={ev.id}
                href={`/${ev.creator.username}/events`}
                className="card p-3 bg-white hover:shadow-md transition flex gap-3"
              >
                {/* クリエイターアイコン */}
                <div className="flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={ev.creator.avatarUrl || "/icon/nagesen250.png"}
                    alt={ev.creator.displayName || ev.creator.username}
                    className="h-10 w-10 rounded-full object-cover border bg-gray-100"
                  />
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold truncate">
                      {ev.title}
                    </span>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-md text-white"
                      style={{
                        backgroundColor: ev.creator.themeColor || "#005bbb",
                      }}
                    >
                      @{ev.creator.username}
                    </span>
                  </div>

                  <p className="text-[11px] text-gray-600 truncate">
                    {ev.creator.displayName || ev.creator.username}
                  </p>

                  {ev.creator.creatorType || (ev.creator.categories?.length ?? 0) > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {ev.creator.creatorType ? (
                        <span className="rounded-full border border-gray-300 bg-gray-50 px-2 py-0.5 text-[10px] text-gray-700">
                          {
                            CREATOR_TYPE_LABELS[
                              ev.creator.creatorType as keyof typeof CREATOR_TYPE_LABELS
                            ]
                          }
                        </span>
                      ) : null}
                      {ev.creator.categories?.slice(0, 3).map((category) => (
                        <span
                          key={`${ev.id}-${category}`}
                          className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[10px] text-gray-600"
                        >
                          {
                            CREATOR_CATEGORY_LABELS[
                              category as keyof typeof CREATOR_CATEGORY_LABELS
                            ]
                          }
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {ev.date && (
                    <p className="text-[11px] text-gray-500">
                      <EventDateTime
                        iso={ev.date}
                        options={{
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        }}
                      />
                    </p>
                  )}

                  {typeof ev.goalAmount === "number" && (
                    <p className="text-[11px] text-gray-500">
                      目標: {ev.goalAmount.toLocaleString()} JPYC
                    </p>
                  )}

                  {ev.description && (
                    <p className="text-xs text-gray-700 line-clamp-2 whitespace-pre-wrap">
                      {ev.description}
                    </p>
                  )}
                </div>
              </a>
            ))
          )}
        </div>

        {/* 登録クリエイター一覧（ランダム）— 既存 */}
        {randomCreators.length > 0 && (
          <section className="mt-4">
            <h2 className="text-sm font-semibold mb-2">クリエイター一覧</h2>
            <p className="text-[11px] text-gray-500 mb-3">
              このアプリに登録されているクリエイターを表示しています。
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {randomCreators.map((c) => (
                <a
                  key={c.username}
                  href={`/${c.username}`}
                  className="card p-3 flex gap-3 items-start bg-white hover:shadow-md transition"
                >
                  <div className="flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={c.avatarUrl || "/icon/nagesen250.png"}
                      alt={c.displayName || c.username}
                      className="h-12 w-12 rounded-full object-cover border bg-gray-100"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {c.displayName || c.username}
                    </p>
                    <p className="text-[11px] text-gray-600 line-clamp-3 whitespace-pre-line">
                      {c.profile || "プロフィールは準備中です。"}
                    </p>
                    <p className="mt-1 text-[10px] text-gray-400">
                      @{c.username}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Krypto Kyoto PR ブロック（既存） */}
        <div className="mt-6 flex justify-center">
          <div className="relative w-full p-4 sm:p-5 bg-gray-50 dark:bg-gray-50 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-300 text-left">
            <span
              className="absolute -top-2 -left-2 text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm text-white"
              style={{ backgroundColor: themeColor }}
            >
              PR
            </span>

            <p className="text-xs font-semibold uppercase tracking-wide text-rose-700 mb-1">
              EVENT
            </p>

            <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-3">
              Krypto Kyoto Jazz Night – Songbird TAeKO at 能舞台サロン
            </h3>

            <div className="mb-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/KryptoKyotoEvent.webp"
                alt="Krypto Kyoto Jazz Night イベントイメージ"
                className="w-full object-cover rounded-xl shadow-sm"
              />
            </div>

            <p className="text-sm text-gray-700 leading-relaxed mb-3">
              世界水準のジャズと厳選されたドリンクを、京都・能舞台の洗練された空間で。
              伝統と革新が静かに交差する、かけがえのない一夜へ。
            </p>

            <p className="text-sm text-gray-700 leading-relaxed mb-3">
              ニューヨークのジャズシーンで活躍する国際的ジャズボーカリスト、
              <strong> Songbird TAeKO</strong>{" "}
              が、平安神宮にほど近い京都・岡崎の邸宅サロン
              「能舞台サロン」にて、しっとりとした歌声とともに特別な夜をお届けします。
            </p>

            <div className="grid gap-3 sm:grid-cols-2 text-[13px] text-gray-700 mb-3">
              <div>
                <h4 className="text-xs font-semibold text-gray-800 mb-1">
                  スケジュール
                </h4>
                <p className="leading-relaxed">
                  ・18:00 Doors Open
                  <br />
                  ・19:00 1st Set Begins
                  <br />
                  ・20:10 2nd Set Begins
                </p>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-gray-800 mb-1">
                  料金（オープニング価格）
                </h4>
                <p className="leading-relaxed">
                  ・ライブチャージ：4,400円（税込）＋1ドリンク
                  <br />
                  ・会員割引：プレミアム年会員 50%オフ／スタンダード年会員
                  25%オフ
                  <br />
                  ・オプション：グルテンフリー宵醸（よいかも）弁当
                  2,800円（税込）
                </p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-3">
              <a
                href="https://kryptokyoto.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-rose-600 text-white text-sm font-medium hover:bg-rose-500 transition"
              >
                🎟️ イベント詳細・ご予約はこちら
              </a>

              <a
                href="https://kryptokyoto.com/wp-content/uploads/sites/4/2025/11/32af97ae31465d6ac80d3568df6bcf1d.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-gray-200 text-gray-800 text-sm font-medium hover:bg-gray-300 transition"
              >
                📄 プレスリリース（PDF）
              </a>
            </div>

            <p className="mt-3 text-[11px] text-gray-500 leading-relaxed">
              ※
              お弁当は事前予約制・数量限定です。詳細は公式サイトをご確認ください。
            </p>
          </div>
        </div>
        <MyPageFooter />
      </div>
    </div>
  );
}
