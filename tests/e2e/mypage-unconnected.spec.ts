import { expect, test } from "@playwright/test";

test("mypage renders a safe unconnected state", async ({ page }) => {
  await page.goto("/e2e-unconnected/mypage");

  await expect(page.getByTestId("mypage-root").first()).toHaveAttribute(
    "data-mypage-status",
    "unconnected"
  );
  await expect(
    page.getByText("設定を使うには、まずウォレット接続")
  ).toBeVisible();
  await expect(
    page.getByText("右上のウォレットから接続すると、自分のページ準備やユーザー登録をこの画面から始められます。")
  ).toBeVisible();
});
