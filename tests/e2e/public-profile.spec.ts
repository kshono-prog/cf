import { expect, test } from "@playwright/test";

import { mockCreatorPublicPage } from "@/tests/e2e/fixtures/mockApi";

test("public profile smoke renders core supporter UI", async ({ page }) => {
  const username = "e2e-public";

  await mockCreatorPublicPage(page, username);
  await page.goto(`/${username}?e2eMock=publicProfile`);

  await expect(page.getByText("E2E Creator").first()).toBeVisible();
  await expect(page.getByTestId("wallet-section").first()).toBeVisible();
  await expect(page.getByTestId("send-amount-input").first()).toBeVisible();
  await expect(page.getByTestId("project-progress-card").first()).toBeVisible();
  await expect(page.getByTestId("featured-videos")).toBeVisible();
});
