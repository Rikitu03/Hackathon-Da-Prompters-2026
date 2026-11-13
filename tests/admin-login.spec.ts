import { expect, test, type Page } from "@playwright/test";

async function showSignedOutAdmin(page: Page) {
  await page.route("**/api/auth/session", route => route.fulfill({
    status: 401, json: { error: "Authentication required" },
  }));
  await page.goto("/admin/login");
  await expect(page.getByRole("heading", { name: /Sign In to GabayIskolar/i })).toBeVisible();
}

test("admin login matches the branded split layout and has accessible password visibility", async ({ page, isMobile }) => {
  await showSignedOutAdmin(page);
  await expect(page.getByRole("heading", { name: /Support Every Scholarship Journey/i })).toBeVisible();
  const passwordInput = page.locator("#admin-password");
  await expect(passwordInput).toHaveAttribute("type", "password");
  await passwordInput.fill("test-password");
  await page.getByRole("button", { name: "Show password" }).click();
  await expect(passwordInput).toHaveAttribute("type", "text");
  await expect(passwordInput).toHaveValue("test-password");
  await page.getByRole("button", { name: "Hide password" }).click();
  await expect(passwordInput).toHaveAttribute("type", "password");
  await expect(page.locator('img[src*="students-pasig"]')).toHaveCount(1);
  await page.screenshot({ path: test.info().outputPath(isMobile ? "admin-login-mobile.png" : "admin-login-desktop.png"), fullPage: true });
});

test("admin login shows inline errors and blocks invalid submissions", async ({ page }) => {
  let requests = 0;
  await page.route("**/api/auth/login", route => {
    requests += 1;
    return route.fulfill({ status: 401, json: { error: "Invalid credentials" } });
  });
  await showSignedOutAdmin(page);

  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(page.locator("#admin-email-error")).toHaveText("Enter your email address.");
  await expect(page.locator("#admin-password-error")).toHaveText("Enter your password.");
  expect(requests).toBe(0);

  await page.getByRole("textbox", { name: "Email address" }).fill("invalid-email");
  await page.locator("#admin-password").fill("anything");
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(page.locator("#admin-email-error")).toHaveText("Enter a valid email address.");
  expect(requests).toBe(0);

  await page.getByRole("textbox", { name: "Email address" }).fill("editor@example.com");
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(page.locator(".admin-login-server-error[role=\"alert\"]")).toContainText("Invalid credentials");
  expect(requests).toBe(1);
  await expect(page.locator("#admin-password")).toHaveValue("");
});

test("forgot password offers real account-recovery guidance instead of a dead link", async ({ page }) => {
  await showSignedOutAdmin(page);
  await page.getByRole("button", { name: "Forgot password?" }).click();
  await expect(page.locator("#admin-login-help")).toContainText("project administrator");
  await page.getByRole("button", { name: "Forgot password?" }).click();
  await expect(page.locator("#admin-login-help")).toHaveCount(0);
});

test("admin login avoids horizontal overflow at 320px", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile-only layout check");
  await showSignedOutAdmin(page);
  const size = await page.evaluate(() => ({
    actual: document.documentElement.scrollWidth,
    viewport: document.documentElement.clientWidth,
  }));
  expect(size.actual).toBeLessThanOrEqual(size.viewport + 1);
});