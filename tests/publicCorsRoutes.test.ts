/* eslint-disable @typescript-eslint/no-require-imports */
import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";

const publicCreatorApiModule = require("../lib/publicCreatorApi") as typeof import("../lib/publicCreatorApi");
const publicCreatorRouteModule = require("../app/api/public/creator/route") as typeof import("../app/api/public/creator/route");
const publicEventsApiModule = require("../lib/publicEventsApi") as typeof import("../lib/publicEventsApi");
const creatorEventsRouteModule = require("../app/api/creators/[username]/events/route") as typeof import("../app/api/creators/[username]/events/route");

const ALLOWED_ORIGIN = "http://127.0.0.1:3001";

test("public creator route OPTIONS and GET stay read-only under CORS", async () => {
  const optionsResponse = await publicCreatorRouteModule.OPTIONS(
    new NextRequest("http://127.0.0.1/api/public/creator", {
      method: "OPTIONS",
      headers: { origin: ALLOWED_ORIGIN },
    })
  );

  assert.equal(optionsResponse.status, 204);
  assert.equal(
    optionsResponse.headers.get("Access-Control-Allow-Methods"),
    "GET,OPTIONS"
  );
  assert.equal(
    optionsResponse.headers.get("Access-Control-Allow-Origin"),
    ALLOWED_ORIGIN
  );

  const original = publicCreatorApiModule.fetchPublicCreatorByUsername;
  publicCreatorApiModule.fetchPublicCreatorByUsername = async (username) => {
    assert.equal(username, "kazu");
    return {
      status: 200,
      body: {
        ok: true,
        creator: {
          username: "kazu",
          displayName: "Kazu",
          profile: "profile",
          avatarUrl: null,
          qrcode: null,
          url: null,
          themeColor: null,
          creatorType: null,
          projectId: null,
          projectIdsByCurrency: { JPYC: null, USDC: null },
          latestProjectSummary: null,
        },
        projectId: null,
        projectIdsByCurrency: { JPYC: null, USDC: null },
        latestProjectSummary: null,
        summary: null,
        summariesByCurrency: { JPYC: null, USDC: null },
      },
    } as Awaited<ReturnType<typeof publicCreatorApiModule.fetchPublicCreatorByUsername>>;
  };

  try {
    const response = await publicCreatorRouteModule.GET(
      new NextRequest("http://127.0.0.1/api/public/creator?username=kazu", {
        headers: { origin: ALLOWED_ORIGIN },
      })
    );

    assert.equal(response.status, 200);
    assert.equal(
      response.headers.get("Access-Control-Allow-Methods"),
      "GET,OPTIONS"
    );
    assert.equal(
      response.headers.get("Access-Control-Allow-Origin"),
      ALLOWED_ORIGIN
    );

    const body = (await response.json()) as Awaited<ReturnType<typeof publicCreatorApiModule.fetchPublicCreatorByUsername>>["body"];
    assert.equal(body.ok, true);
    assert.equal(body.creator.username, "kazu");
  } finally {
    publicCreatorApiModule.fetchPublicCreatorByUsername = original;
  }
});

test("creator published events route keeps cross-origin access read-only", async () => {
  const optionsResponse = await creatorEventsRouteModule.OPTIONS(
    new NextRequest("http://127.0.0.1/api/creators/kazu/events", {
      method: "OPTIONS",
      headers: { origin: ALLOWED_ORIGIN },
    })
  );

  assert.equal(optionsResponse.status, 204);
  assert.equal(
    optionsResponse.headers.get("Access-Control-Allow-Methods"),
    "GET,OPTIONS"
  );
  assert.equal(
    optionsResponse.headers.get("Access-Control-Allow-Origin"),
    ALLOWED_ORIGIN
  );

  const original = publicEventsApiModule.fetchCreatorPublishedEventsByUsername;
  publicEventsApiModule.fetchCreatorPublishedEventsByUsername = async (
    username
  ) => {
    assert.equal(username, "kazu");
    return {
      status: 200,
      body: {
        events: [
          {
            id: "1",
            title: "Launch party",
            description: "first show",
            date: "2026-03-20T10:00:00.000Z",
            goalAmount: "1000",
            categories: ["LIVE"],
          },
        ],
      },
    } as Awaited<ReturnType<typeof publicEventsApiModule.fetchCreatorPublishedEventsByUsername>>;
  };

  try {
    const response = await creatorEventsRouteModule.GET(
      new NextRequest("http://127.0.0.1/api/creators/kazu/events", {
        headers: { origin: ALLOWED_ORIGIN },
      }),
      { params: Promise.resolve({ username: "kazu" }) }
    );

    assert.equal(response.status, 200);
    assert.equal(
      response.headers.get("Access-Control-Allow-Methods"),
      "GET,OPTIONS"
    );
    assert.equal(
      response.headers.get("Access-Control-Allow-Origin"),
      ALLOWED_ORIGIN
    );

    const body = (await response.json()) as Awaited<ReturnType<typeof publicEventsApiModule.fetchCreatorPublishedEventsByUsername>>["body"];
    assert.deepEqual(body, {
      events: [
        {
          id: "1",
          title: "Launch party",
          description: "first show",
          date: "2026-03-20T10:00:00.000Z",
          goalAmount: "1000",
          categories: ["LIVE"],
        },
      ],
    });
  } finally {
    publicEventsApiModule.fetchCreatorPublishedEventsByUsername = original;
  }
});
