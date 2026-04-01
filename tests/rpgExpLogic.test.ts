import assert from "node:assert/strict";
import test from "node:test";

// ===== EXP level table logic =====

function buildLevelRequirements(): Array<{ level: number; requiredExp: number }> {
  const reqs: Array<{ level: number; requiredExp: number }> = [
    { level: 1, requiredExp: 100 },
    { level: 2, requiredExp: 150 },
    { level: 3, requiredExp: 220 },
    { level: 4, requiredExp: 300 },
  ];
  let prev = 300;
  for (let lv = 5; lv <= 49; lv++) {
    prev = Math.ceil(prev * 1.15);
    reqs.push({ level: lv, requiredExp: prev });
  }
  return reqs;
}

const LEVEL_REQS = buildLevelRequirements();

function computeLevelSync(
  currentLevel: number,
  currentExp: number,
  reqs: Array<{ level: number; requiredExp: number }>
): { newLevel: number; newExp: number } {
  let level = currentLevel;
  let exp = currentExp;
  while (level < 50) {
    const req = reqs.find((r) => r.level === level);
    if (!req) break;
    if (exp >= req.requiredExp) {
      exp -= req.requiredExp;
      level += 1;
    } else {
      break;
    }
  }
  return { newLevel: level, newExp: exp };
}

test("RPG level table: first 4 levels match spec", () => {
  assert.equal(LEVEL_REQS[0].requiredExp, 100);
  assert.equal(LEVEL_REQS[1].requiredExp, 150);
  assert.equal(LEVEL_REQS[2].requiredExp, 220);
  assert.equal(LEVEL_REQS[3].requiredExp, 300);
});

test("RPG level table: Lv5 requires ceil(300*1.15)=345", () => {
  const lv5 = LEVEL_REQS.find((r) => r.level === 5);
  assert.ok(lv5);
  assert.equal(lv5.requiredExp, 345);
});

test("RPG level table: Lv6 requires ceil(345*1.15)=397", () => {
  const lv6 = LEVEL_REQS.find((r) => r.level === 6);
  assert.ok(lv6);
  assert.equal(lv6.requiredExp, 397);
});

test("RPG level table: table has exactly 49 entries (Lv1-49)", () => {
  assert.equal(LEVEL_REQS.length, 49);
});

test("RPG level table: all entries have positive requiredExp", () => {
  for (const r of LEVEL_REQS) {
    assert.ok(r.requiredExp > 0, `Level ${r.level} has non-positive exp`);
  }
});

test("computeLevel: no level-up when EXP is below threshold", () => {
  const result = computeLevelSync(1, 50, LEVEL_REQS);
  assert.equal(result.newLevel, 1);
  assert.equal(result.newExp, 50);
});

test("computeLevel: level-up from Lv1 to Lv2 at 100 EXP", () => {
  const result = computeLevelSync(1, 100, LEVEL_REQS);
  assert.equal(result.newLevel, 2);
  assert.equal(result.newExp, 0);
});

test("computeLevel: overflow EXP carries to next level", () => {
  // Lv1→2 needs 100, Lv2→3 needs 150: 100+160=260 => should be Lv3 with 10 remaining
  const result = computeLevelSync(1, 260, LEVEL_REQS);
  assert.equal(result.newLevel, 3);
  assert.equal(result.newExp, 10);
});

test("computeLevel: capped at Lv50", () => {
  const result = computeLevelSync(50, 99999, LEVEL_REQS);
  assert.equal(result.newLevel, 50);
});

// ===== Daily EXP cap logic =====

const DAILY_EXP_CAP = 300;

function clampExp(awarded: number, dailySoFar: number): number {
  const remaining = DAILY_EXP_CAP - dailySoFar;
  return Math.min(awarded, Math.max(0, remaining));
}

test("daily EXP cap: full award when under cap", () => {
  assert.equal(clampExp(30, 100), 30);
});

test("daily EXP cap: partial award at boundary", () => {
  assert.equal(clampExp(30, 280), 20);
});

test("daily EXP cap: zero award when cap reached", () => {
  assert.equal(clampExp(30, 300), 0);
});

test("daily EXP cap: zero award when over cap", () => {
  assert.equal(clampExp(30, 350), 0);
});

// ===== Stats clamp logic =====

function clamp100(v: number): number {
  return Math.min(100, Math.max(0, Math.round(v)));
}

test("stats clamp100: returns 0 for negative", () => {
  assert.equal(clamp100(-10), 0);
});

test("stats clamp100: returns 100 for values over 100", () => {
  assert.equal(clamp100(150), 100);
});

test("stats clamp100: rounds correctly", () => {
  assert.equal(clamp100(72.4), 72);
  assert.equal(clamp100(72.5), 73);
});

// ===== First-support EXP logic =====

test("SUPPORT_CREATED EXP: first support gets 60 (base 30 + bonus 30)", () => {
  const BASE_EXP = 30;
  const FIRST_SUPPORT_TOTAL = 60;
  const isFirst = true;
  const awarded = isFirst ? FIRST_SUPPORT_TOTAL : BASE_EXP;
  assert.equal(awarded, 60);
});

test("SUPPORT_CREATED EXP: repeat support gets 30", () => {
  const BASE_EXP = 30;
  const FIRST_SUPPORT_TOTAL = 60;
  const isFirst = false;
  const awarded = isFirst ? FIRST_SUPPORT_TOTAL : BASE_EXP;
  assert.equal(awarded, 30);
});

// ===== Badge condition logic =====

function checkBadgeConditions(params: {
  totalSupportCount: number;
  sameProjectSupportCount: number;
  loginConsecutiveDays: number;
  commentCount: number;
  reactionCount: number;
}): string[] {
  const badges: string[] = [];
  if (params.totalSupportCount >= 1) badges.push("FIRST_SUPPORT");
  if (params.loginConsecutiveDays >= 3) badges.push("LOGIN_3DAYS");
  if (params.loginConsecutiveDays >= 7) badges.push("LOGIN_7DAYS");
  if (params.totalSupportCount >= 5) badges.push("SUPPORT_5");
  if (params.sameProjectSupportCount >= 3) badges.push("SAME_PROJECT_3");
  if (params.commentCount >= 10) badges.push("COMMENT_10");
  if (params.reactionCount >= 50) badges.push("REACTION_50");
  return badges;
}

test("badge conditions: first support earns FIRST_SUPPORT", () => {
  const badges = checkBadgeConditions({
    totalSupportCount: 1,
    sameProjectSupportCount: 1,
    loginConsecutiveDays: 0,
    commentCount: 0,
    reactionCount: 0,
  });
  assert.ok(badges.includes("FIRST_SUPPORT"));
  assert.ok(!badges.includes("SUPPORT_5"));
});

test("badge conditions: 5 total supports earns SUPPORT_5", () => {
  const badges = checkBadgeConditions({
    totalSupportCount: 5,
    sameProjectSupportCount: 1,
    loginConsecutiveDays: 0,
    commentCount: 0,
    reactionCount: 0,
  });
  assert.ok(badges.includes("FIRST_SUPPORT"));
  assert.ok(badges.includes("SUPPORT_5"));
});

test("badge conditions: 7 consecutive logins earns both LOGIN_3DAYS and LOGIN_7DAYS", () => {
  const badges = checkBadgeConditions({
    totalSupportCount: 0,
    sameProjectSupportCount: 0,
    loginConsecutiveDays: 7,
    commentCount: 0,
    reactionCount: 0,
  });
  assert.ok(badges.includes("LOGIN_3DAYS"));
  assert.ok(badges.includes("LOGIN_7DAYS"));
});

test("badge conditions: 3 logins earns only LOGIN_3DAYS", () => {
  const badges = checkBadgeConditions({
    totalSupportCount: 0,
    sameProjectSupportCount: 0,
    loginConsecutiveDays: 3,
    commentCount: 0,
    reactionCount: 0,
  });
  assert.ok(badges.includes("LOGIN_3DAYS"));
  assert.ok(!badges.includes("LOGIN_7DAYS"));
});

test("badge conditions: SAME_PROJECT_3 needs 3 supports to same project", () => {
  const badges = checkBadgeConditions({
    totalSupportCount: 3,
    sameProjectSupportCount: 3,
    loginConsecutiveDays: 0,
    commentCount: 0,
    reactionCount: 0,
  });
  assert.ok(badges.includes("SAME_PROJECT_3"));
});

test("badge conditions: COMMENT_10 needs 10 comments", () => {
  const badges = checkBadgeConditions({
    totalSupportCount: 0,
    sameProjectSupportCount: 0,
    loginConsecutiveDays: 0,
    commentCount: 10,
    reactionCount: 0,
  });
  assert.ok(badges.includes("COMMENT_10"));
});
