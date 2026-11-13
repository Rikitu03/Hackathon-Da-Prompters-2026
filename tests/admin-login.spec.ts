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

test("compact desktop card is centered while the background wave reaches the viewport bottom", async ({ page, isMobile }) => {
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
    const cardHeight = measures.card.bottom - measures.card.top;
    const emptySpace = measures.skyline.top - measures.submit.bottom;
    expect(measures.card.top, "compact card must be visible").toBeGreaterThan(0);
    expect(measures.card.bottom, "compact card must fit above the viewport bottom").toBeLessThan(height - 10);
    expect(cardHeight, "card must follow content rather than stretching to screen height").toBeLessThan(700);
    expect(Math.abs(measures.card.top - (height - measures.card.bottom)), "card must be vertically centered").toBeLessThanOrEqual(3);
    expect(emptySpace, "no large empty area between sign-in and skyline").toBeGreaterThanOrEqual(0);
    expect(emptySpace, "no large empty area between sign-in and skyline").toBeLessThanOrEqual(48);
    expect(Math.abs(measures.skyline.bottom - measures.card.bottom), "skyline anchored to card bottom").toBeLessThanOrEqual(2);
    expect(Math.abs(measures.waves.bottom - height), "background waves anchored to viewport bottom").toBeLessThanOrEqual(2);
    expect(Math.abs(measures.waves.left), "background waves should start at viewport left").toBeLessThanOrEqual(2);
    expect(Math.abs(measures.waves.right - width), "background waves should reach viewport right").toBeLessThanOrEqual(2);

    await page.screenshot({
      path: test.info().outputPath("admin-login-" + width + "x" + height + ".png"),
      fullPage: true,
    });
  }
});

test("loading screen is compact without the former full-height white card", async ({ page, isMobile }) => {
  test.skip(isMobile, "desktop-only loading-state geometry check");
  await page.route("**/api/auth/session", async route => {
    await new Promise(resolve => setTimeout(resolve, 2200));
    await route.fulfill({ status: 401, json: { error: "Authentication required" } });
  });
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/admin/login", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Checking your administrator session…")).toBeVisible();
  const geometry = await page.evaluate(() => {
    const card = document.querySelector(".admin-login-card")?.getBoundingClientRect();
    const skyline = document.querySelector(".admin-login-skyline")?.getBoundingClientRect();
    const status = document.querySelector(".admin-login-status")?.getBoundingClientRect();
    if (!card || !skyline || !status) throw new Error("Loading state layout missing");
    return { cardHeight: card.height, cardTop: card.top, cardBottom: card.bottom, skylineTop: skyline.top, statusBottom: status.bottom };
  });
  expect(geometry.cardHeight).toBeLessThan(450);
  expect(geometry.skylineTop - geometry.statusBottom).toBeLessThan(65);
  expect(Math.abs(geometry.cardTop - (768 - geometry.cardBottom))).toBeLessThanOrEqual(3);
});

test("login copy is concise and the small labels use legible font styling", async ({ page }) => {
  await showSignedOutAdmin(page);
  await expect(page.getByText("ADMIN ACCESS", { exact: true })).toHaveCount(0);
  await expect(page.getByText(/Administrator accounts are provisioned/)).toHaveCount(0);
  await expect(page.getByText("Administrator access required", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Independent student project. Not an official Pasig City government portal.")).toHaveCount(0);
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

test("demo link opens the interactive sandbox without creating an admin session", async ({ page }) => {
  await showSignedOutAdmin(page);
  await page.getByRole("link", { name: "Open interactive admin demo" }).click();
  await expect(page).toHaveURL(/\/admin\/demo(?:\?|$)/);
  await expect(page.getByText(/interactive demo sandbox/)).toBeVisible();
  await expect(page.getByText(/Nothing is sent to Supabase or published/)).toBeVisible();
  await expect(page.getByText("Demo preview")).toBeVisible();
});
