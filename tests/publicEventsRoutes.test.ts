import assert from "node:assert/strict";
import test from "node:test";

import {
  fetchCreatorPublishedEventsByUsername,
  fetchPublicEvents,
} from "../lib/publicEventsApi";

test("fetchCreatorPublishedEventsByUsername returns serialized published events", async () => {
  const response = await fetchCreatorPublishedEventsByUsername("kazu", {
    findCreatorByUsername: async (username) => {
      assert.equal(username, "kazu");
      return { id: 1n };
    },
    findPublishedEventsByCreatorProfileId: async (creatorProfileId) => {
      assert.equal(creatorProfileId, 1n);
      return [
        {
          id: 11n,
          title: "Launch party",
          description: "first show",
          startAt: new Date("2026-03-20T10:00:00.000Z"),
          goalAmountJpyc: 1000n,
          eventCategories: ["LIVE", "INVALID", "TECH"],
        },
      ];
    },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    events: [
      {
        id: "11",
        title: "Launch party",
        description: "first show",
        date: "2026-03-20T10:00:00.000Z",
        goalAmount: "1000",
        categories: ["LIVE", "TECH"],
      },
    ],
  });
});

test("fetchCreatorPublishedEventsByUsername returns an empty list when the creator is missing", async () => {
  const response = await fetchCreatorPublishedEventsByUsername("missing", {
    findCreatorByUsername: async () => null,
    findPublishedEventsByCreatorProfileId: async () => [],
  });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { events: [] });
});

test("fetchCreatorPublishedEventsByUsername returns 500 when the creator event read fails", async () => {
  const response = await fetchCreatorPublishedEventsByUsername("kazu", {
    findCreatorByUsername: async () => {
      throw new Error("boom");
    },
    findPublishedEventsByCreatorProfileId: async () => [],
  });

  assert.equal(response.status, 500);
  assert.deepEqual(response.body, { error: "EVENT_LIST_FAILED" });
});

test("fetchPublicEvents normalizes query params and serializes the public event list", async () => {
  const response = await fetchPublicEvents({
    excludeRaw: " kazu, ,mika ",
    limitRaw: "999",
    categoryRaw: "LIVE",
    deps: {
      findPublicEvents: async ({ excludeUsernames, limit, category }) => {
        assert.deepEqual(excludeUsernames, ["kazu", "mika"]);
        assert.equal(limit, 200);
        assert.equal(category, "LIVE");

        return [
          {
            id: 21n,
            title: "Community live",
            description: null,
            startAt: new Date("2026-03-21T11:00:00.000Z"),
            goalAmountJpyc: 2500n,
            eventCategories: ["LIVE", "OTHER", "INVALID"],
            creatorProfile: {
              username: "mika",
              displayName: "Mika",
              avatarUrl: "/avatars/mika.jpg",
              themeColor: "#222222",
              creatorType: "MUSICIAN",
            },
          },
        ];
      },
    },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    events: [
      {
        id: "21",
        title: "Community live",
        description: null,
        date: "2026-03-21T11:00:00.000Z",
        goalAmount: "2500",
        categories: ["LIVE", "OTHER"],
        creator: {
          username: "mika",
          displayName: "Mika",
          avatarUrl: "/avatars/mika.jpg",
          themeColor: "#222222",
          creatorType: "MUSICIAN",
        },
      },
    ],
  });
});

test("fetchPublicEvents ignores an invalid category filter and returns 500 on failures", async () => {
  const response = await fetchPublicEvents({
    excludeRaw: null,
    limitRaw: "5",
    categoryRaw: "INVALID",
    deps: {
      findPublicEvents: async ({ category }) => {
        assert.equal(category, null);
        throw new Error("boom");
      },
    },
  });

  assert.equal(response.status, 500);
  assert.deepEqual(response.body, { error: "PUBLIC_EVENT_LIST_FAILED" });
});
