import { expect, test } from "@playwright/test";

import { mockMeUserOnly } from "@/tests/e2e/fixtures/mockApi";

test("mypage userOnly state shows registration and creator apply UI", async ({
  page,
}) => {
  const username = "e2e-useronly";

  await mockMeUserOnly(page, username);
  await page.goto(`/${username}/mypage?manualCheck=1&e2eMock=userOnly`);

  await expect(page.getByTestId("mypage-root")).toHaveAttribute(
    "data-mypage-status",
    "userOnly"
  );
  await expect(page.getByTestId("user-registration-form")).toBeVisible();
  await expect(page.getByTestId("creator-apply-card")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "クリエイターとして申請する" })
  ).toBeVisible();
});
