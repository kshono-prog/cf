import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const creatorUsername = process.env.E2E_CREATOR_USERNAME ?? "kazu";

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

test("discover page renders core UI", async ({ page }) => {
  await page.goto("/creators");

  await expect(
    page.getByRole("heading", { name: "クリエイターを探す" })
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "すべて" })).toBeVisible();
  await expect(page.getByRole("link", { name: /@/ }).first()).toBeVisible();
});

test("discover page has no critical accessibility violations", async ({ page }) => {
  test.slow();

  await page.goto("/creators");

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
  const issues = attachBrowserIssueCollectors(page);

  await page.goto(`/${creatorUsername}/mypage?manualCheck=1`);

  await expect(
    page.getByRole("heading", { name: new RegExp(`${creatorUsername} のワークスペース`, "i") })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /今日の仕事場/ })
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "投稿する" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Manager Desk" })).toBeVisible();
  await expect(
    page.locator(".workspace-segment").getByRole("button", { name: "ホーム" })
  ).toBeVisible();
  await expect(
    page.locator(".workspace-segment").getByRole("button", { name: "設定" })
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "発見" })).toHaveCount(0);

  expectNoBrowserIssues(issues);
});

test("creator workspace exposes stable fan-preview and ai-office shortcut links", async ({
  page,
}) => {
  const issues = attachBrowserIssueCollectors(page);

  await page.goto(`/${creatorUsername}/mypage?manualCheck=1`);

  await expect(page.getByRole("link", { name: "ファン目線を確認 ↗" })).toHaveAttribute(
    "href",
    `/${creatorUsername}`
  );
  await expect(page.getByRole("link", { name: "AI事務所を開く" })).toHaveAttribute(
    "href",
    `/${creatorUsername}/mypage?manualCheck=1#ai-office`
  );
  await expect(page.getByRole("link", { name: "この担当を開く" })).toHaveAttribute(
    "href",
    /aiOfficeView=CREATE/
  );

  expectNoBrowserIssues(issues);
});

test("ai office shortcuts navigate to the expected deep links", async ({
  page,
}) => {
  await page.goto(`/${creatorUsername}/mypage?manualCheck=1`);
  await page.getByRole("link", { name: "AI事務所を開く" }).click();
  await expect(page).toHaveURL(
    new RegExp(`/${creatorUsername}/mypage\\?manualCheck=1#ai-office$`)
  );

  await page.goto(`/${creatorUsername}/mypage?manualCheck=1`);
  await page.getByRole("link", { name: "この担当を開く" }).click();
  await expect(page).toHaveURL(
    new RegExp(`/${creatorUsername}/mypage\\?manualCheck=1&aiOfficeView=CREATE#ai-office$`)
  );

  await page.goto(`/${creatorUsername}/mypage?manualCheck=1`);
  await page.getByRole("link", { name: "下書きを作る" }).first().click();
  await expect(page).toHaveURL(
    new RegExp(
      `/${creatorUsername}/mypage\\?manualCheck=1&aiOfficeView=CREATE&aiOfficeRole=[A-Z_]+#ai-office$`
    )
  );
});
