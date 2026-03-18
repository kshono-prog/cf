import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAnnouncementPostingComposeHandoff,
  buildAnnouncementPostingComposeText,
  buildPostingComposeHref,
  parsePostingComposeHandoff,
} from "../components/mypage/postingComposeHandoff";

test("announcement posting compose text joins headline, body, and CTA", () => {
  assert.equal(
    buildAnnouncementPostingComposeText({
      headline: "最新のお知らせ",
      body: "進捗をまとめました。",
      callToAction: "応援してもらえるとうれしいです。",
    }),
    "最新のお知らせ\n\n進捗をまとめました。\n\n応援してもらえるとうれしいです。"
  );
});

test("announcement posting compose handoff keeps project and payload text", () => {
  const handoff = buildAnnouncementPostingComposeHandoff({
    projectId: "project-1",
    channel: "GENERAL",
    summary: "公開向け告知文案を生成しました。",
    headline: "最新のお知らせ",
    body: "進捗をまとめました。",
    callToAction: "応援してもらえるとうれしいです。",
    createdAt: "2026-03-18T00:00:00.000Z",
  });

  assert.equal(handoff.projectId, "project-1");
  assert.equal(handoff.sourceTaskType, "ANNOUNCEMENT_DRAFT");
  assert.match(handoff.payloadText, /最新のお知らせ/);
});

test("posting compose handoff parser rejects invalid task types", () => {
  assert.equal(
    parsePostingComposeHandoff({
      sourceTaskType: "SUPPORTER_MESSAGE_DRAFT",
      projectId: null,
      channel: "SUPPORTERS",
      summary: "summary",
      payloadText: "body",
      createdAt: "2026-03-18T00:00:00.000Z",
    }),
    null
  );
});

test("posting compose href normalizes mypage routes to support-page", () => {
  assert.equal(
    buildPostingComposeHref({ pathname: "/kazu/mypage/supporters" }),
    "/kazu/mypage/support-page#posting-compose"
  );
});
