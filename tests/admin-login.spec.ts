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

test("desktop login fits 1366x768 and 1920x1080 without vertical scrolling or clipped decorations", async ({ page, isMobile }) => {
  test.skip(isMobile, "desktop viewport acceptance test");
  await page.setViewportSize({ width: 1366, height: 768 });
  await showSignedOutAdmin(page);
  await page.evaluate(() => document.fonts.ready);

  for (const [width, height] of [[1366, 768], [1440, 900], [1920, 1080]]) {
    await page.setViewportSize({ width, height });
    const measures = await page.evaluate(() => {
      const bounds = (selector: string) => {
        const rect = document.querySelector(selector)?.getBoundingClientRect();
        if (!rect) throw new Error("Missing login element: " + selector);
        return { top: rect.top, left: rect.left, right: rect.right, bottom: rect.bottom };
      };
      return {
        docWidth: document.documentElement.scrollWidth,
        width: document.documentElement.clientWidth,
        docHeight: document.documentElement.scrollHeight,
        height: document.documentElement.clientHeight,
        card: bounds(".admin-login-card"),
        submit: bounds(".admin-login-submit"),
        skyline: bounds(".admin-login-skyline"),
        waves: bounds(".admin-login-waves"),
        hero: bounds(".admin-login-hero"),
      };
    });

    expect(measures.width).toBe(width);
    expect(measures.height).toBe(height);
    expect(measures.docWidth, width + "px horizontal overflow").toBeLessThanOrEqual(width + 1);
    expect(measures.docHeight, width + "x" + height + " vertical overflow").toBeLessThanOrEqual(height + 1);
    expect(measures.card.top).toBeGreaterThanOrEqual(0);
    expect(measures.card.bottom, "card must fit the viewport").toBeLessThanOrEqual(height - 8);
    expect(measures.submit.bottom, "submit must be visible").toBeLessThan(measures.skyline.top);
    expect(Math.abs(measures.skyline.bottom - measures.card.bottom), "skyline anchored to card bottom").toBeLessThanOrEqual(2);
    expect(Math.abs(measures.waves.bottom - height), "waves anchored to viewport bottom").toBeLessThanOrEqual(2);
    expect(Math.abs(measures.waves.left), "waves should start at viewport left edge").toBeLessThanOrEqual(2);

    await page.screenshot({
      path: test.info().outputPath("admin-login-" + width + "x" + height + ".png"),
      fullPage: true,
    });
  }
});

test("login copy is concise and the small labels use legible font styling", async ({ page }) => {
  await showSignedOutAdmin(page);
  await expect(page.getByText("ADMIN ACCESS", { exact: true })).toHaveCount(0);
  await expect(page.getByText(/Administrator accounts are provisioned/)).toHaveCount(0);
  await expect(page.getByText("Administrator access required", { exact: true })).toHaveCount(0);
  const typography = await page.locator(".admin-login-eyebrow").evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      text: element.textContent?.trim(),
      fontSize: parseFloat(style.fontSize),
      fontWeight: Number(style.fontWeight),
      tracking: style.letterSpacing === "normal" ? 0 : parseFloat(style.letterSpacing),
      textTransform: style.textTransform,
      fontFamily: style.fontFamily,
    };
  });
  expect(typography.text).toBe("GabayIskolar Admin Workspace");
  expect(typography.fontSize).toBeGreaterThanOrEqual(12);
  expect(typography.fontWeight).toBeLessThanOrEqual(700);
  expect(typography.tracking).toBeLessThan(1);
  expect(typography.textTransform).toBe("none");
  expect(typography.fontFamily).toContain("Gabay Sans");

  const eyebrow = page.locator(".admin-login-card-eyebrow");
  await expect(eyebrow).toHaveText(/Authorized administrators only/);
  expect(await eyebrow.evaluate(el => getComputedStyle(el).textTransform)).toBe("none");
});

test("the mobile form scrolls naturally and keeps all controls reachable", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile-only flow check");
  await showSignedOutAdmin(page);
  await page.locator("#admin-password").fill("passphrase");
  await page.getByRole("button", { name: "Show password" }).click();
  await expect(page.locator("#admin-password")).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Sign In", exact: true }).scrollIntoViewIfNeeded();
  await expect(page.getByRole("button", { name: "Sign In", exact: true })).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(await page.evaluate(() => document.documentElement.clientWidth + 1));
});
