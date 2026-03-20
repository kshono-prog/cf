import { unstable_cache } from "next/cache";

import { prisma } from "@/lib/prisma";
import { withPrismaRetry } from "@/lib/prismaRetry";
import {
  isCreatorType,
  isEventCategory,
  type CreatorType,
  type EventCategory,
} from "@/lib/creatorTaxonomy";

export type EventPageCreator = {
  username: string;
  displayName: string | null;
  profile: string | null;
  avatarUrl: string | null;
  themeColor: string | null;
  creatorType: CreatorType | null;
};

export type EventPageEvent = {
  id: string;
  title: string;
  description: string | null;
  date: string | null;
  goalAmount: number | null;
  categories: EventCategory[];
};

export type EventPagePublicEvent = EventPageEvent & {
  creator: {
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    themeColor: string | null;
    creatorType: CreatorType | null;
  };
};

export type EventPageRandomCreatorCard = {
  username: string;
  displayName: string | null;
  profile: string | null;
  avatarUrl: string | null;
  creatorType: CreatorType | null;
};

type CreatorRow = {
  username: string;
  displayName: string | null;
  profileText: string | null;
  avatarUrl: string | null;
  themeColor: string | null;
  creatorType: string | null;
  id: bigint;
};

function toGoalAmount(value: bigint | number | null): number | null {
  if (value === null) return null;
  return typeof value === "bigint" ? Number(value) : value;
}

function toCreatorType(value: string | null): CreatorType | null {
  return typeof value === "string" && isCreatorType(value) ? value : null;
}

function toEventCategories(values: string[]): EventCategory[] {
  return values.filter(isEventCategory);
}

const getEventPageCreatorCached = unstable_cache(
  async (username: string): Promise<CreatorRow | null> =>
    withPrismaRetry(() =>
      prisma.creatorProfile.findUnique({
        where: { username },
        select: {
          username: true,
          displayName: true,
          profileText: true,
          avatarUrl: true,
          themeColor: true,
          creatorType: true,
          id: true,
        },
      })
    ),
  ["events-page-creator"],
  { revalidate: 60 }
);

const getCreatorEventsCached = unstable_cache(
  async (creatorProfileId: string): Promise<EventPageEvent[]> => {
    const eventsRows = await withPrismaRetry(() =>
      prisma.event.findMany({
        where: {
          creatorProfileId: BigInt(creatorProfileId),
          isPublished: true,
        },
        orderBy: { startAt: "asc" },
        select: {
          id: true,
          title: true,
          description: true,
          startAt: true,
          goalAmountJpyc: true,
          eventCategories: true,
        },
      })
    );

    return eventsRows.map((event) => ({
      id: event.id.toString(),
      title: event.title,
      description: event.description ?? null,
      date: event.startAt ? event.startAt.toISOString() : null,
      goalAmount: toGoalAmount(event.goalAmountJpyc),
      categories: toEventCategories(event.eventCategories),
    }));
  },
  ["events-page-creator-events"],
  { revalidate: 30 }
);

const getPublicEventsCached = unstable_cache(
  async (
    username: string,
    categoryFilter: string | null
  ): Promise<EventPagePublicEvent[]> => {
    const publicEventRows = await withPrismaRetry(() =>
      prisma.event.findMany({
        where: {
          isPublished: true,
          ...(categoryFilter ? { eventCategories: { has: categoryFilter } } : {}),
          creatorProfile: {
            is: {
              username: { not: username },
            },
          },
        },
        orderBy: { startAt: "asc" },
        take: 80,
        select: {
          id: true,
          title: true,
          description: true,
          startAt: true,
          goalAmountJpyc: true,
          eventCategories: true,
          creatorProfile: {
            select: {
              username: true,
              displayName: true,
              avatarUrl: true,
              themeColor: true,
              creatorType: true,
            },
          },
        },
      })
    );

    return publicEventRows.map((event) => ({
      id: event.id.toString(),
      title: event.title,
      description: event.description ?? null,
      date: event.startAt ? event.startAt.toISOString() : null,
      goalAmount: toGoalAmount(event.goalAmountJpyc),
      categories: toEventCategories(event.eventCategories),
      creator: {
        username: event.creatorProfile.username,
        displayName: event.creatorProfile.displayName,
        avatarUrl: event.creatorProfile.avatarUrl,
        themeColor: event.creatorProfile.themeColor,
        creatorType: toCreatorType(event.creatorProfile.creatorType),
      },
    }));
  },
  ["events-page-public-events"],
  { revalidate: 30 }
);

const getRandomCreatorsCached = unstable_cache(
  async (creatorTypeFilter: string | null): Promise<EventPageRandomCreatorCard[]> => {
    const totalCreators = await withPrismaRetry(() =>
      prisma.creatorProfile.count({
        where: creatorTypeFilter ? { creatorType: creatorTypeFilter } : undefined,
      })
    );

    if (totalCreators === 0) return [];

    const limit = Math.min(100, totalCreators);
    const maxSkip = Math.max(totalCreators - limit, 0);
    const skip = maxSkip > 0 ? Math.floor(Math.random() * (maxSkip + 1)) : 0;

    const randomCreatorRows = await withPrismaRetry(() =>
      prisma.creatorProfile.findMany({
        where: creatorTypeFilter ? { creatorType: creatorTypeFilter } : undefined,
        skip,
        take: limit,
        orderBy: { createdAt: "asc" },
        select: {
          username: true,
          displayName: true,
          profileText: true,
          avatarUrl: true,
          creatorType: true,
        },
      })
    );

    return randomCreatorRows.map((creatorRowItem) => ({
      username: creatorRowItem.username,
      displayName: creatorRowItem.displayName,
      profile: creatorRowItem.profileText ?? null,
      avatarUrl: creatorRowItem.avatarUrl ?? null,
      creatorType: toCreatorType(creatorRowItem.creatorType),
    }));
  },
  ["events-page-random-creators"],
  { revalidate: 60 }
);

export async function loadEventsPageData(args: {
  username: string;
  activeCreatorType: string;
  activeCategory: string;
}): Promise<{
  creator: EventPageCreator | null;
  events: EventPageEvent[];
  publicEvents: EventPagePublicEvent[];
  randomCreators: EventPageRandomCreatorCard[];
}> {
  const creatorTypeFilter =
    typeof args.activeCreatorType === "string" && isCreatorType(args.activeCreatorType)
      ? args.activeCreatorType
      : null;
  const categoryFilter =
    typeof args.activeCategory === "string" && isEventCategory(args.activeCategory)
      ? args.activeCategory
      : null;

  const creatorRow = await getEventPageCreatorCached(args.username);

  if (!creatorRow) {
    return {
      creator: null,
      events: [],
      publicEvents: [],
      randomCreators: [],
    };
  }

  const creator: EventPageCreator = {
    username: creatorRow.username,
    displayName: creatorRow.displayName,
    profile: creatorRow.profileText,
    avatarUrl: creatorRow.avatarUrl,
    themeColor: creatorRow.themeColor,
    creatorType: toCreatorType(creatorRow.creatorType),
  };

  const [events, publicEvents, randomCreators] = await Promise.all([
    getCreatorEventsCached(creatorRow.id.toString()),
    getPublicEventsCached(args.username, categoryFilter),
    getRandomCreatorsCached(creatorTypeFilter),
  ]);

  return {
    creator,
    events,
    publicEvents,
    randomCreators,
  };
}
