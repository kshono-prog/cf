import { prisma } from "@/lib/prisma";
import { withPrismaRetry } from "@/lib/prismaRetry";
import {
  isCreatorType,
  isEventCategory,
  type CreatorType,
  type EventCategory,
} from "@/lib/creatorTaxonomy";

export type EventGoalAmount = string | number | null;

export type CreatorPublishedEvent = {
  id: string;
  title: string;
  description: string | null;
  date: string | null;
  goalAmount: EventGoalAmount;
  categories: EventCategory[];
};

export type PublicListedEvent = CreatorPublishedEvent & {
  creator: {
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    themeColor: string | null;
    creatorType: CreatorType | null;
  };
};

export type CreatorPublishedEventsOk = {
  events: CreatorPublishedEvent[];
};

export type CreatorPublishedEventsErr = {
  error: "EVENT_LIST_FAILED";
};

export type PublicEventsOk = {
  events: PublicListedEvent[];
};

export type PublicEventsErr = {
  error: "PUBLIC_EVENT_LIST_FAILED";
};

type CreatorLookup = {
  id: bigint;
};

type CreatorEventRow = {
  id: bigint;
  title: string;
  description: string | null;
  startAt: Date | null;
  goalAmountJpyc: bigint | number | null;
  eventCategories: string[];
};

type PublicEventRow = CreatorEventRow & {
  creatorProfile: {
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    themeColor: string | null;
    creatorType: string | null;
  };
};

type CreatorPublishedEventsDeps = {
  findCreatorByUsername: (username: string) => Promise<CreatorLookup | null>;
  findPublishedEventsByCreatorProfileId: (
    creatorProfileId: bigint
  ) => Promise<CreatorEventRow[]>;
};

type PublicEventsDeps = {
  findPublicEvents: (args: {
    excludeUsernames: string[];
    limit: number;
    category: EventCategory | null;
  }) => Promise<PublicEventRow[]>;
};

const creatorPublishedEventsDeps: CreatorPublishedEventsDeps = {
  findCreatorByUsername: async (username) =>
    withPrismaRetry(() =>
      prisma.creatorProfile.findUnique({
        where: { username },
        select: { id: true },
      })
    ),
  findPublishedEventsByCreatorProfileId: async (creatorProfileId) =>
    withPrismaRetry(() =>
      prisma.event.findMany({
        where: { creatorProfileId, isPublished: true },
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
    ),
};

const publicEventsDeps: PublicEventsDeps = {
  findPublicEvents: async ({ excludeUsernames, limit, category }) =>
    withPrismaRetry(() =>
      prisma.event.findMany({
        where: {
          isPublished: true,
          ...(category ? { eventCategories: { has: category } } : {}),
          creatorProfile: {
            is: {
              ...(excludeUsernames.length > 0
                ? { username: { notIn: excludeUsernames } }
                : {}),
            },
          },
        },
        orderBy: { startAt: "asc" },
        take: limit,
        include: {
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
    ),
};

function serializeGoalAmount(value: bigint | number | null): EventGoalAmount {
  if (value === null) return null;
  return typeof value === "bigint" ? value.toString() : value;
}

function serializeCategories(values: string[]): EventCategory[] {
  return values.filter(isEventCategory);
}

function serializeCreatorType(value: string | null): CreatorType | null {
  return typeof value === "string" && isCreatorType(value) ? value : null;
}

function serializeCreatorPublishedEvent(
  event: CreatorEventRow
): CreatorPublishedEvent {
  return {
    id: event.id.toString(),
    title: event.title,
    description: event.description,
    date: event.startAt ? event.startAt.toISOString() : null,
    goalAmount: serializeGoalAmount(event.goalAmountJpyc),
    categories: serializeCategories(event.eventCategories),
  };
}

function normalizePublicEventParams(args: {
  excludeRaw: string | null;
  limitRaw: string | null;
  categoryRaw: string | null;
}): {
  excludeUsernames: string[];
  limit: number;
  category: EventCategory | null;
} {
  const excludeUsernames = (args.excludeRaw ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const limit = Math.min(Math.max(Number(args.limitRaw ?? 50), 1), 200);
  const category =
    typeof args.categoryRaw === "string" && isEventCategory(args.categoryRaw)
      ? args.categoryRaw
      : null;

  return {
    excludeUsernames,
    limit,
    category,
  };
}

export async function fetchCreatorPublishedEventsByUsername(
  username: string,
  deps: CreatorPublishedEventsDeps = creatorPublishedEventsDeps
): Promise<{
  status: 200 | 500;
  body: CreatorPublishedEventsOk | CreatorPublishedEventsErr;
}> {
  try {
    const creator = await deps.findCreatorByUsername(username);
    if (!creator) {
      return {
        status: 200,
        body: { events: [] },
      };
    }

    const events = await deps.findPublishedEventsByCreatorProfileId(creator.id);
    return {
      status: 200,
      body: {
        events: events.map(serializeCreatorPublishedEvent),
      },
    };
  } catch {
    return {
      status: 500,
      body: { error: "EVENT_LIST_FAILED" },
    };
  }
}

export async function fetchPublicEvents(args: {
  excludeRaw: string | null;
  limitRaw: string | null;
  categoryRaw: string | null;
  deps?: PublicEventsDeps;
}): Promise<{
  status: 200 | 500;
  body: PublicEventsOk | PublicEventsErr;
}> {
  const { deps = publicEventsDeps, ...raw } = args;
  const normalized = normalizePublicEventParams(raw);

  try {
    const events = await deps.findPublicEvents(normalized);
    return {
      status: 200,
      body: {
        events: events.map((event) => ({
          ...serializeCreatorPublishedEvent(event),
          creator: {
            username: event.creatorProfile.username,
            displayName: event.creatorProfile.displayName,
            avatarUrl: event.creatorProfile.avatarUrl,
            themeColor: event.creatorProfile.themeColor,
            creatorType: serializeCreatorType(event.creatorProfile.creatorType),
          },
        })),
      },
    };
  } catch {
    return {
      status: 500,
      body: { error: "PUBLIC_EVENT_LIST_FAILED" },
    };
  }
}
