import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import {
  createCreatorReadyMockState,
  mockCreateProjectSuccess,
  mockCreatorPublicPage,
  mockGoalSaveSuccess,
  mockMeCreatorReady,
  mockSummarySuccess,
} from "@/tests/e2e/fixtures/mockApi";

const creatorUsername = process.env.E2E_CREATOR_USERNAME ?? "e2e-creator";
const publicUsername = "e2e-public";

type BrowserIssue = {
  source: "console" | "pageerror";
  message: string;
};

function attachBrowserIssueCollectors(page: Page): BrowserIssue[] {
  const issues: BrowserIssue[] = [];

  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    issues.push({
      source: "console",
      message: msg.text(),
    });
  });

  page.on("pageerror", (error) => {
    issues.push({
      source: "pageerror",
      message: error.message,
    });
  });

  return issues;
}

function expectNoBrowserIssues(issues: BrowserIssue[]): void {
  expect(issues).toEqual([]);
}

test("public profile mock renders the supporter smoke surface", async ({ page }) => {
  await mockCreatorPublicPage(page, publicUsername);
  await page.goto(`/${publicUsername}?e2eMock=publicProfile`);

  await expect(page.getByText("E2E Creator").first()).toBeVisible();
  await expect(page.getByTestId("project-progress-card").first()).toBeVisible();
});

test("public profile mock has no critical accessibility violations", async ({ page }) => {
  test.slow();

  await mockCreatorPublicPage(page, publicUsername);
  await page.goto(`/${publicUsername}?e2eMock=publicProfile`);

  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();

  const criticalViolations = accessibilityScanResults.violations.filter(
    (violation) => violation.impact === "critical"
  );

  expect(criticalViolations).toEqual([]);
});

test("creator workspace manual check page stays free of browser errors", async ({
  page,
}) => {
  const state = createCreatorReadyMockState(creatorUsername);
  const issues = attachBrowserIssueCollectors(page);

  await mockMeCreatorReady(page, creatorUsername);
  await mockSummarySuccess(page, state);
  await mockCreateProjectSuccess(page, state);
  await mockGoalSaveSuccess(page, state);
  await page.goto(`/${creatorUsername}/mypage?manualCheck=1&e2eMock=creatorReady`);

  await expect(page.getByTestId("mypage-root")).toHaveAttribute(
    "data-mypage-status",
    "creatorReady"
  );
  await expect(page.getByRole("button", { name: "投稿する" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Manager Desk" })).toBeVisible();
  await expect(page.getByRole("button", { name: "プロジェクト" }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "AI オフィス" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /公開ページ ↗/ }).first()).toBeVisible();

  expectNoBrowserIssues(issues);
});

test("creator workspace exposes stable fan-preview and ai-office shortcut links", async ({
  page,
}) => {
  const issues = attachBrowserIssueCollectors(page);

  const state = createCreatorReadyMockState(creatorUsername);
  await mockMeCreatorReady(page, creatorUsername);
  await mockSummarySuccess(page, state);
  await mockCreateProjectSuccess(page, state);
  await mockGoalSaveSuccess(page, state);
  await page.goto(`/${creatorUsername}/mypage?manualCheck=1&e2eMock=creatorReady`);

  await expect(page.getByRole("link", { name: /公開ページ ↗/ }).first()).toHaveAttribute(
    "href",
    `/${creatorUsername}`
  );
  await expect(page.getByRole("link", { name: "Manager Desk" })).toHaveAttribute(
    "href",
    "/manager-desk"
  );

  expectNoBrowserIssues(issues);
});

test("ai office shortcuts expose the expected deep links", async ({ page }) => {
  const state = createCreatorReadyMockState(creatorUsername);
  await mockMeCreatorReady(page, creatorUsername);
  await mockSummarySuccess(page, state);
  await mockCreateProjectSuccess(page, state);
  await mockGoalSaveSuccess(page, state);

  await page.goto(`/${creatorUsername}/mypage?manualCheck=1&e2eMock=creatorReady`);

  await expect(page.getByRole("link", { name: "AI オフィスを開く" })).toHaveAttribute(
    "href",
    `/${creatorUsername}/mypage/ai-office`
  );
});
