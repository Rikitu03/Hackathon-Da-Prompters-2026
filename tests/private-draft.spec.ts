import { expect, test } from "@playwright/test";
import { chooseGuide, mockPublishedGuide } from "./support/applicant-mocks";

test("private drafts persist locally, export, and delete without sending personal fields", async ({ page }) => {
  await page.route(/https:\/\//, route => route.abort());
  await mockPublishedGuide(page); await chooseGuide(page);
  const bodies: string[] = [];
  page.on("request", request => { const data = request.postData(); if (data) bodies.push(data); });
  await page.goto("/application-draft");
  await expect(page.getByLabel("Full name", { exact: true })).toBeEnabled();
  await page.getByLabel("Full name", { exact: true }).fill("LOCAL-ONLY-PRIVATE-TEST");
  await page.getByLabel("Email", { exact: true }).fill("local-only@example.invalid");
  await page.getByRole("button", { name: "Save on this device", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Draft saved on this device");
  await page.reload();
  await expect(page.getByLabel("Full name", { exact: true })).toHaveValue("LOCAL-ONLY-PRIVATE-TEST");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export private draft", exact: true }).click();
  expect((await download).suggestedFilename()).toBe("gabayiskolar-private-draft.json");
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "Delete local draft", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Saved draft deleted");
  await page.reload();
  await expect(page.getByLabel("Full name", { exact: true })).toHaveValue("");
  expect(bodies.some(body => body.includes("LOCAL-ONLY-PRIVATE-TEST") || body.includes("local-only@example.invalid"))).toBe(false);
});

test("a missing reference backend does not prevent local draft saves", async ({ page }) => {
  await page.route(/https:\/\//, route => route.abort());
  await mockPublishedGuide(page); await chooseGuide(page);
  await page.route("**/api/applicant/session", route => route.fulfill({ status: 503, json: { error: "Unavailable" } }));
  await page.goto("/application-draft");
  await expect(page.getByText("Browser reference: Browser reference unavailable. Guides and local drafts still work.")).toBeVisible();
  await page.getByLabel("Preparation notes", { exact: true }).fill("Synthetic local preparation");
  await page.getByRole("button", { name: "Save on this device", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Draft saved on this device");
});
