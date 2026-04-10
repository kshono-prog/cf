import assert from "node:assert/strict";
import test from "node:test";

import {
  buildGenericSupportHref,
  buildPublicSupportActionThemes,
} from "../lib/aiManager/supportActionThemes";

test("buildPublicSupportActionThemes keeps project and purpose order, limits items, and builds support deep-links", () => {
  const result = buildPublicSupportActionThemes({
    username: "kazu",
    projects: [
      {
        projectId: "101",
        title: "Spring Tour",
        currency: "JPYC",
        purposes: [
          {
            id: "501",
            label: "制作準備",
            description: "  次の制作準備に使いたい応援です  ",
          },
          {
            id: "502",
            label: "発信強化",
            description: null,
          },
        ],
      },
      {
        projectId: "102",
        title: "Summer Live",
        currency: "USDC",
        purposes: [
          {
            id: "601",
            label: "イベント運営",
            description: null,
          },
          {
            id: "602",
            label: "extra",
            description: null,
          },
        ],
      },
    ],
  });

  assert.equal(result.length, 3);
  assert.deepEqual(
    result.map((item) => item.id),
    ["101:501", "101:502", "102:601"]
  );
  assert.equal(
    result[0]?.helper,
    "次の制作準備に使いたい応援です。"
  );
  assert.equal(
    result[1]?.helper,
    "次の発信や近況共有につながる応援です。"
  );
  assert.equal(
    result[2]?.helper,
    "イベント準備や現場対応を前に進めるための応援です。"
  );
  assert.equal(
    result[0]?.href,
    "/kazu?projectId=101&purposeId=501&support=1#support-projects"
  );
});

test("buildGenericSupportHref keeps existing support sheet deep-link behavior", () => {
  assert.equal(
    buildGenericSupportHref({
      username: "kazu",
      projectId: "101",
    }),
    "/kazu?projectId=101&support=1#support-projects"
  );

  assert.equal(
    buildGenericSupportHref({
      username: "kazu",
      projectId: null,
    }),
    "/kazu#support-projects"
  );
});
