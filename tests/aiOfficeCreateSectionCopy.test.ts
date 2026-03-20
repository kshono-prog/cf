import test from "node:test";
import assert from "node:assert/strict";

import { getAiOfficeCreateSectionCopy } from "@/components/mypage/aiOfficeCreateSectionCopy";

test("getAiOfficeCreateSectionCopy keeps manager and finance task setup neutral", () => {
  const managerCopy = getAiOfficeCreateSectionCopy("MANAGER");
  const financeCopy = getAiOfficeCreateSectionCopy("FINANCE");

  assert.equal(managerCopy.title, "1. 参考情報を確認する");
  assert.equal(financeCopy.title, "1. 参考情報を確認する");
  assert.match(managerCopy.description, /Project、Goal、Summary/);
  assert.match(financeCopy.description, /Project、Summary、配分準備/);
});

test("getAiOfficeCreateSectionCopy keeps promotion and fan relation copy post-aware", () => {
  const promotionCopy = getAiOfficeCreateSectionCopy("PROMOTION");
  const fanRelationCopy = getAiOfficeCreateSectionCopy("FAN_RELATION");

  assert.equal(promotionCopy.title, "1. 投稿と反応を確認する");
  assert.equal(fanRelationCopy.title, "1. 投稿と反応を確認する");
  assert.match(promotionCopy.description, /投稿と反応/);
  assert.match(fanRelationCopy.description, /支援者向け/);
});

test("getAiOfficeCreateSectionCopy falls back to manager copy when role is missing", () => {
  const fallbackCopy = getAiOfficeCreateSectionCopy(undefined);

  assert.equal(fallbackCopy.title, "1. 参考情報を確認する");
  assert.match(fallbackCopy.description, /次の一手/);
});
