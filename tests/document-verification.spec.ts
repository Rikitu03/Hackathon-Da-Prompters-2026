import { expect, test, type Page } from "@playwright/test";
import { localIsoDate, mockVerify, requirementUrl, useDemoGuide } from "./support/verification-mocks";

test.beforeEach(async ({ page }) => {
  // Fail closed: no browser test can reach a real provider, and AI routes answer "off" unless a test says otherwise.
  await page.route(/https:\/\//, (route) => route.abort());
  await page.route("**/api/ai/verify", (route) => route.fulfill({ status: 503, json: { error: "off" } }));
  await page.route("**/api/ai/ocr", (route) => route.fulfill({ status: 503, json: { error: "off" } }));
});

test("the demo checklist covers the three priority documents in order", async ({ page }) => {
  await useDemoGuide(page);
  await page.goto("/my-checklist");
  await expect(page.locator(".checklist-row h2")).toHaveText([
    "Certificate of Registration", "Certificate of Residency", "School ID or government-issued ID",
  ]);
  await page.goto(requirementUrl("illustrative-enrollment"));
  await expect(page.getByRole("heading", { level: 1, name: "Certificate of Registration" })).toBeVisible();
});

test("changing a status confirms it with a toast", async ({ page }) => {
  await useDemoGuide(page);
  await page.goto("/my-checklist");
  await page.getByLabel("Preparation status for Certificate of Registration").selectOption("prepared");
  await expect(page.getByText("Marked as prepared")).toBeVisible();
  await page.getByLabel("Preparation status for Certificate of Residency").selectOption("in-progress");
  await expect(page.getByText("Certificate of Residency: In progress")).toBeVisible();
});

const COR_URL = requirementUrl("illustrative-enrollment");
// exact: Base UI toasts also have role="dialog", e.g. "Certificate of Registration checked".
const dialogFor = (page: Page, name = "Certificate of Registration") => page.getByRole("dialog", { name, exact: true });

test("a COR sample with issues opens collapsible results and a toast", async ({ page }) => {
  await useDemoGuide(page);
  await mockVerify(page, { status: "ok", flags: [] });
  await page.goto(COR_URL);
  await page.getByRole("button", { name: "Try a sample with issues" }).click();
  const dialog = dialogFor(page);
  await expect(dialog.getByText(/Enrollment date is from \d{4}/)).toBeVisible();
  await expect(dialog.getByText("Possible mismatch").first()).toBeVisible();
  await expect(page.getByText("Certificate of Registration checked")).toBeVisible();
  const flags = dialog.getByRole("button", { name: /Flags to review/ });
  await expect(flags).toHaveAttribute("aria-expanded", "true");
  await flags.click();
  await expect(flags).toHaveAttribute("aria-expanded", "false");
  await expect(dialog.getByText(/Enrollment date is from \d{4}/)).toBeHidden();
  await expect(dialog.getByRole("button", { name: /Read text/ })).toHaveAttribute("aria-expanded", "false");
});

test("correcting a detail re-runs the checks", async ({ page }) => {
  await useDemoGuide(page);
  await mockVerify(page, { status: "ok", flags: [] });
  await page.goto(COR_URL);
  await page.getByRole("button", { name: "Try a sample with issues" }).click();
  const dialog = dialogFor(page);
  await expect(page.getByText("Lumen AI review finished")).toBeVisible(); // let the AI save first
  await dialog.getByRole("button", { name: /Extracted details/ }).click();
  await dialog.getByLabel("Enrollment date").fill(localIsoDate(-1));
  await dialog.getByRole("button", { name: "Save corrections" }).click();
  await expect(page.getByText("Corrections saved")).toBeVisible();
  await expect(dialog.getByText(/Enrollment date is from/)).toBeHidden();
  await expect(dialog.getByText(/outside school year/)).toBeHidden();
  await dialog.getByRole("button", { name: /Lumen AI review/ }).click();
  await expect(dialog.getByText("Based on the original read, before your corrections.")).toBeVisible();
});

test("Lumen AI suggestions are labelled and requests stay small", async ({ page }) => {
  await useDemoGuide(page);
  const ai = await mockVerify(page, {
    status: "ok",
    flags: [{ id: "ai-1", severity: "info", origin: "ai", fieldKeys: ["course"], title: "Course name is abbreviated", detail: "Compare it with your original." }],
  });
  await page.goto(COR_URL);
  await page.getByRole("button", { name: "Try a clean sample" }).click();
  await expect(dialogFor(page).getByText("Course name is abbreviated")).toBeVisible();
  await expect(dialogFor(page).getByText("Suggested by Lumen AI")).toBeVisible();
  expect(ai.bodies[0]).toMatchObject({ consent: true, profileId: "certificate_of_registration" });
  expect((ai.bodies[0] as { rawText: string }).rawText.length).toBeLessThanOrEqual(1500);
});

test("unavailable AI keeps the rule checks", async ({ page }) => {
  await useDemoGuide(page);
  await page.goto(COR_URL); // default 503 mock
  await page.getByRole("button", { name: "Try a sample with issues" }).click();
  const dialog = dialogFor(page);
  await dialog.getByRole("button", { name: /Lumen AI review/ }).click();
  await expect(dialog.getByText(/Lumen AI review is unavailable/)).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Try Lumen AI again" })).toBeVisible();
  await expect(dialog.getByText(/Enrollment date is from \d{4}/)).toBeVisible();
});

test("results persist across reloads in the same tab", async ({ page }) => {
  await useDemoGuide(page);
  await page.goto(COR_URL);
  await page.getByRole("button", { name: "Try a sample with issues" }).click();
  await expect(dialogFor(page)).toBeVisible();
  await page.keyboard.press("Escape");
  await page.reload();
  await expect(page.getByText(/Checked from a fictional sample\. \d+ flags? to review\./)).toBeVisible();
  await page.getByRole("button", { name: "View results" }).click();
  await expect(dialogFor(page)).toBeVisible();
});

test("the results dialog fits 320px without sideways scroll", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile project only");
  await useDemoGuide(page);
  await page.goto(COR_URL);
  await page.getByRole("button", { name: "Try a sample with issues" }).click();
  await expect(dialogFor(page)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
