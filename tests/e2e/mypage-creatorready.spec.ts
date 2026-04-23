import { expect, test } from "@playwright/test";

import {
  createCreatorReadyMockState,
  mockCreateProjectSuccess,
  mockGoalSaveSuccess,
  mockMeCreatorReady,
  mockSummarySuccess,
} from "@/tests/e2e/fixtures/mockApi";

test("creatorReady workspace protects the core project management flow", async ({
  page,
}) => {
  const username = "e2e-creator";
  const state = createCreatorReadyMockState(username);

  await mockMeCreatorReady(page, username);
  await mockSummarySuccess(page, state);
  await mockCreateProjectSuccess(page, state);
  await mockGoalSaveSuccess(page, state);

  await page.goto(`/${username}/mypage/project?manualCheck=1&e2eMock=creatorReady`);

  await expect(page.getByTestId("mypage-root")).toHaveAttribute(
    "data-mypage-status",
    "creatorReady"
  );
  await expect(page.getByRole("link", { name: /公開ページ ↗/ }).first()).toBeVisible();
  await expect(page.getByText("Project / Goal 詳細設定")).toBeVisible();
  await expect(page.getByTestId("goal-section").first()).toBeVisible();
  await expect(page.getByTestId("summary-actions-section").first()).toBeVisible();

  await page
    .getByRole("button", { name: "新しい Project を作る（切り替え）" })
    .first()
    .click();

  const projectCreateCard = page.getByTestId("project-create-card").first();
  await expect(projectCreateCard).toBeVisible();
  await projectCreateCard
    .getByPlaceholder("例）ライブ活動を広げる最初の Project")
    .fill("Updated E2E Project");
  await projectCreateCard
    .getByRole("button", { name: "Project を作成する" })
    .click();

  await expect(page.getByText("Updated E2E Project").first()).toBeVisible();

  const goalSection = page.getByTestId("goal-section").first();
  await goalSection.getByPlaceholder("例: 1000").fill("12000");
  await goalSection.getByRole("button", { name: "Goal を保存" }).click();

  const summaryResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "GET" &&
      response.url().includes(`/api/projects/${state.summary.project.id}/summary`)
  );

  await goalSection.getByRole("button", { name: "Summary更新" }).click();
  await summaryResponse;

  await expect(page.getByTestId("summary-actions-section").first()).toContainText(
    "Project status"
  );
  await expect(goalSection).toContainText("12,000");
});
