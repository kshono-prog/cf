import assert from "node:assert/strict";
import test from "node:test";

import {
  AI_OFFICE_URL_PARAMS,
  buildAiOfficePanelHref,
  buildAiOfficePanelSearchParams,
  parseAiOfficePanelUrlState,
} from "../components/mypage/aiOfficePanelUrlState";

test("AI Office URL state parser reads supported view and role params", () => {
  const searchParams = new URLSearchParams({
    [AI_OFFICE_URL_PARAMS.view]: "INBOX",
    [AI_OFFICE_URL_PARAMS.role]: "PROMOTION",
    [AI_OFFICE_URL_PARAMS.inboxRole]: "FINANCE",
  });

  assert.deepEqual(parseAiOfficePanelUrlState(searchParams), {
    activeView: "INBOX",
    selectedRoleId: "PROMOTION",
    selectedInboxRoleId: "FINANCE",
  });
});

test("AI Office URL state parser ignores invalid view and role params", () => {
  const searchParams = new URLSearchParams({
    [AI_OFFICE_URL_PARAMS.view]: "DETAIL",
    [AI_OFFICE_URL_PARAMS.role]: "UNKNOWN",
    [AI_OFFICE_URL_PARAMS.inboxRole]: "UNKNOWN",
  });

  assert.deepEqual(parseAiOfficePanelUrlState(searchParams), {
    activeView: undefined,
    selectedRoleId: undefined,
    selectedInboxRoleId: null,
  });
});

test("AI Office URL state builder preserves unrelated params and omits defaults", () => {
  const searchParams = new URLSearchParams({
    foo: "bar",
    [AI_OFFICE_URL_PARAMS.view]: "INBOX",
    [AI_OFFICE_URL_PARAMS.role]: "PROMOTION",
    [AI_OFFICE_URL_PARAMS.inboxRole]: "PROMOTION",
  });

  const built = buildAiOfficePanelSearchParams(searchParams, {
    activeView: "OVERVIEW",
    selectedRoleId: "MANAGER",
    selectedInboxRoleId: null,
  });

  assert.equal(built.get("foo"), "bar");
  assert.equal(built.has(AI_OFFICE_URL_PARAMS.view), false);
  assert.equal(built.has(AI_OFFICE_URL_PARAMS.role), false);
  assert.equal(built.has(AI_OFFICE_URL_PARAMS.inboxRole), false);
});

test("AI Office URL state builder keeps explicit role and inbox filters", () => {
  const searchParams = new URLSearchParams({
    foo: "bar",
  });

  const built = buildAiOfficePanelSearchParams(searchParams, {
    activeView: "CREATE",
    selectedRoleId: "FAN_RELATION",
    selectedInboxRoleId: "FAN_RELATION",
  });

  assert.equal(built.get("foo"), "bar");
  assert.equal(built.get(AI_OFFICE_URL_PARAMS.view), "CREATE");
  assert.equal(built.get(AI_OFFICE_URL_PARAMS.role), "FAN_RELATION");
  assert.equal(
    built.get(AI_OFFICE_URL_PARAMS.inboxRole),
    "FAN_RELATION"
  );
});

test("AI Office URL href builder keeps hash and appends role context", () => {
  const href = buildAiOfficePanelHref({
    pathname: "/kazu/mypage",
    hash: "#ai-office-phase1",
    currentSearchParams: new URLSearchParams({
      foo: "bar",
    }),
    state: {
      activeView: "INBOX",
      selectedRoleId: "FINANCE",
      selectedInboxRoleId: "FINANCE",
    },
  });

  assert.equal(
    href,
    "/kazu/mypage?foo=bar&aiOfficeView=INBOX&aiOfficeRole=FINANCE&aiOfficeInboxRole=FINANCE#ai-office-phase1"
  );
});
