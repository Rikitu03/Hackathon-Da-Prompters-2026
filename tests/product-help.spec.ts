import { expect, test, type Page } from "@playwright/test";
import { chooseGuide, mockPublishedGuide, mockChat, GROUNDED_REPLY, PROGRAM_ID } from "./support/applicant-mocks";

const reply = { answer: "Open My checklist to track your preparation [1].", grounded: true,
  sources: [{ sourceId: "product-help:checklist:1", title: "GabayIskolar product guide — Saving checklist progress" }] };
test.beforeEach(async ({ page }) => {
  await page.route(/https:\/\//, route => route.abort());
  await mockPublishedGuide(page);
});
async function openProduct(page: Page, path = "/") {
  await page.goto(path);
  await page.getByRole("button", { name: "Open Ask Gabay", exact: true }).click();
  await expect(page.getByRole("button", { name: "Product help", exact: true })).toHaveAttribute("aria-pressed", "true");
  return page.getByLabel("Your product question");
}

test("product help works without a guide and sends only the question", async ({ page }) => {
  const bodies: unknown[] = [];
  await page.route("**/api/ai/help", route => { bodies.push(route.request().postDataJSON()); return route.fulfill({ json: reply }); });
  const input = await openProduct(page);
  await input.fill("How do I use my checklist?"); await input.press("Enter");
  await expect(page.getByLabel("Product documentation")).toContainText("Saving checklist progress");
  await expect(page.getByLabel("Product documentation")).not.toContainText("No link provided");
  expect(bodies).toEqual([{ message: "How do I use my checklist?" }]);
});

test("mode transcripts and drafts remain separate across navigation and cycle changes", async ({ page, isMobile }) => {
  await chooseGuide(page);
  await page.route("**/api/ai/help", route => route.fulfill({ json: reply }));
  await mockChat(page, [GROUNDED_REPLY]);
  const input = await openProduct(page, "/dashboard");
  await input.fill("How do I save progress?"); await input.press("Enter");
  await expect(page.getByLabel("Product documentation")).toBeVisible();
  await input.fill("Unsent product draft");
  await page.getByRole("button", { name: "Scholarship guide", exact: true }).click();
  const guideInput = page.getByLabel("Your scholarship question");
  await guideInput.fill("Where do I get the certificate?"); await guideInput.press("Enter");
  await expect(page.getByLabel("Published sources")).toBeVisible();
  await page.getByRole("button", { name: "Product help", exact: true }).click();
  await expect(input).toHaveValue("Unsent product draft");
  await expect(page.getByLabel("Product documentation")).toBeVisible();
  // Client-side guide selection changes the cycle without unmounting the chat.
  await page.getByRole("button", { name: "Close Ask Gabay", exact: true }).click();
  await mockPublishedGuide(page, { id: "20000000-0000-4000-8000-000000000002", academic_year: "Another cycle" });
  if (isMobile) await page.getByRole("button", { name: "Open navigation", exact: true }).click();
  await page.getByRole("navigation", { name: "Student workspace" }).getByRole("link", { name: "Scholarships", exact: true }).click();
  await page.locator(`a[href="/scholarships/${PROGRAM_ID}"]`).first().click();
  await page.getByRole("button", { name: "Use this guide", exact: true }).click();
  await page.getByRole("button", { name: "Open Ask Gabay", exact: true }).click();
  await expect(input).toHaveValue("Unsent product draft");
  await expect(page.getByLabel("Product documentation")).toBeVisible();
  await page.getByRole("button", { name: "Scholarship guide", exact: true }).click();
  await expect(page.locator(".gabay-message")).toHaveCount(0);
});

test("switching mode cancels an in-flight response and ignores its late reply", async ({ page }) => {
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  let requested = false;
  await page.route("**/api/ai/help", async route => { requested = true; await held; await route.fulfill({ json: reply }).catch(() => {}); });
  const input = await openProduct(page);
  await input.fill("How do I save progress?"); await input.press("Enter");
  await expect(page.getByRole("button", { name: "Stop request" })).toBeVisible();
  await input.fill("Next product draft");
  await page.getByRole("button", { name: "Scholarship guide", exact: true }).click();
  release();
  await expect(page.locator(".gabay-message")).toHaveCount(0);
  await page.getByRole("button", { name: "Product help", exact: true }).click();
  await expect(input).toHaveValue("Next product draft");
  await expect(page.locator(".gabay-message-assistant")).toHaveCount(0);
  expect(requested).toBe(true);
});

for (const status of [429, 503]) test(`product HTTP ${status} supports manual retry without a duplicate message`, async ({ page }) => {
  let calls = 0;
  await page.route("**/api/ai/help", route => ++calls === 1 ? route.fulfill({ status, json: { error: "Product service unavailable" } }) : route.fulfill({ json: reply }));
  const input = await openProduct(page);
  await input.fill("How do I use the checklist?"); await input.press("Enter");
  await page.getByRole("button", { name: "Retry last question" }).click();
  await expect(page.getByLabel("Product documentation")).toBeVisible();
  await expect(page.locator(".gabay-message-user")).toHaveCount(1);
});

test("product controls work with closed cycles and scholarship controls explain the restriction", async ({ page }) => {
  await chooseGuide(page); await mockPublishedGuide(page, { application_end: "2020-01-01" });
  await page.route("**/api/ai/help", route => route.fulfill({ json: reply }));
  const input = await openProduct(page, "/dashboard");
  await expect(input).toBeEnabled();
  await page.getByRole("button", { name: "Scholarship guide", exact: true }).click();
  await expect(page.getByLabel("Your scholarship question")).toBeDisabled();
  await page.getByRole("button", { name: "Product help", exact: true }).click();
  await expect(input).toBeEnabled();
});

test("product mode is accessible in both themes at a keyboard-sized mobile height", async ({ page }) => {
  const input = await openProduct(page);
  await page.setViewportSize({ width: 320, height: 520 });
  for (const colorScheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    await expect(input).toBeInViewport();
    await expect(page.getByRole("button", { name: "Close Ask Gabay", exact: true })).toBeInViewport();
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(width).toBeLessThanOrEqual(320);
    const mode = page.getByRole("button", { name: "Scholarship guide", exact: true });
    await mode.focus(); await mode.press("Enter");
    await expect(mode).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Product help", exact: true }).click();
  }
  await input.press("Escape");
  await expect(page.getByRole("button", { name: "Open Ask Gabay", exact: true })).toBeFocused();
});

test("the real product route is honestly disabled during automated browser checks", async ({ page }) => {
  const input = await openProduct(page);
  await input.fill("How does my checklist work?");
  const pending = page.waitForResponse(response => response.url().endsWith("/api/ai/help"));
  await input.press("Enter");
  expect((await pending).status()).toBe(503);
  await expect(page.getByRole("alert")).toContainText("unavailable");
  await expect(page.locator(".gabay-message-assistant")).toHaveCount(0);
});
