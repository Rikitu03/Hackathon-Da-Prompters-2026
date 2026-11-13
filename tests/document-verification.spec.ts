import { expect, test } from "@playwright/test";
import { requirementUrl, useDemoGuide } from "./support/verification-mocks";

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
