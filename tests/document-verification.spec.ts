import { expect, test, type Page } from "@playwright/test";
import { mockOcr } from "./support/applicant-mocks";
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

const ID_FIELDS = [
  { key: "full_name", label: "Name", value: "Juan M. Dela Cruz", needsReview: false, originalText: "Name: Juan M. Dela Cruz", warnings: [] },
  { key: "student_no", label: "Student number", value: "22-01187", needsReview: false, originalText: "Student No: 22-01187", warnings: [] },
  { key: "section", label: "Section", value: "BSIT 4-1", needsReview: false, originalText: "Section: BSIT 4-1", warnings: [] },
];
async function uploadFor(page: Page) {
  await page.locator('#document-check input[type="file"]').setInputFiles("tests/fixtures/demo-certificate.png");
  await page.getByLabel(/Send this document to Lumen OCR and Lumen AI/).check();
  await page.getByRole("button", { name: "Check document", exact: true }).click();
}

test("an uploaded School ID is compared with the checked COR", async ({ page }) => {
  await useDemoGuide(page);
  await mockVerify(page, { status: "ok", flags: [] });
  let profile = "";
  await page.route("**/api/ai/ocr", async (route) => {
    profile = String(route.request().postDataBuffer()?.toString().match(/name="profile"\r\n\r\n([a-z_]+)/)?.[1]);
    await route.fulfill({ json: { rawText: "STUDENT IDENTIFICATION CARD", fields: ID_FIELDS, warnings: [], disclaimer: "d", profileId: "school_id", detected: { detected: "school_id", evidence: "STUDENT IDENTIFICATION CARD" } } });
  });
  await page.goto(requirementUrl("illustrative-enrollment"));
  await page.getByRole("button", { name: "Try a clean sample" }).click();
  await page.keyboard.press("Escape");
  await page.goto(requirementUrl("illustrative-school-id"));
  await uploadFor(page);
  const dialog = dialogFor(page, "School ID or government-issued ID");
  await expect(dialog.getByText("Student number differs from your Certificate of Registration")).toBeVisible();
  expect(profile).toBe("school_id");
});

test("a wrong document type is flagged", async ({ page }) => {
  await useDemoGuide(page);
  await mockOcr(page, { rawText: "CERTIFICATE OF INDIGENCY", fields: [], warnings: [], disclaimer: "d", profileId: "certificate_of_residency", detected: { detected: null, otherTitle: "Certificate of Indigency", evidence: "CERTIFICATE OF INDIGENCY" } });
  await page.goto(requirementUrl("illustrative-residency"));
  await uploadFor(page);
  await expect(dialogFor(page, "Certificate of Residency").getByText("This looks like a Certificate of Indigency")).toBeVisible();
});

test("an unreadable upload explains recovery", async ({ page }) => {
  await useDemoGuide(page);
  await mockOcr(page, { error: "x" }, 422);
  await page.goto(COR_URL);
  await uploadFor(page);
  await expect(page.getByText("Couldn't check this document")).toBeVisible();
  await expect(page.locator("#document-check").getByRole("alert")).toContainText("Try a clearer, well-lit photo"); // scoped: the toast may also be an alert
});

const CHECKLIST_REGION = "How your documents compare";

test("the checklist summarises checks and opens results", async ({ page }) => {
  await useDemoGuide(page);
  await page.goto(requirementUrl("illustrative-enrollment"));
  await page.getByRole("button", { name: "Try a clean sample" }).click();
  await page.keyboard.press("Escape");
  await page.goto(requirementUrl("illustrative-school-id"));
  await page.getByRole("button", { name: "Try a sample with issues" }).click();
  await page.keyboard.press("Escape");
  await page.goto("/my-checklist");
  const trio = page.getByRole("region", { name: CHECKLIST_REGION });
  await expect(trio.getByText("Student number differs")).toBeVisible();
  await expect(trio.getByText("Not compared yet")).toBeVisible();
  await expect(page.getByLabel("Check document for Certificate of Residency")).toHaveAttribute(
    "href", /illustrative-residency\?program=illustrative-college&cycle=illustrative-college-cycle#document-check$/);
  await expect(page.locator(".checklist-row").nth(0)).toContainText("Possible mismatch");
  await page.getByRole("button", { name: "View check for School ID or government-issued ID" }).click();
  await expect(dialogFor(page, "School ID or government-issued ID")).toBeVisible();
});

test("a correction updates the checklist chip", async ({ page }) => {
  await useDemoGuide(page);
  await page.goto(requirementUrl("illustrative-enrollment"));
  await page.getByRole("button", { name: "Try a clean sample" }).click();
  await page.keyboard.press("Escape");
  await page.goto(requirementUrl("illustrative-school-id"));
  await page.getByRole("button", { name: "Try a sample with issues" }).click();
  const dialog = dialogFor(page, "School ID or government-issued ID");
  await dialog.getByRole("button", { name: /Extracted details/ }).click();
  await dialog.getByLabel("Student number").fill("23-00314");
  await dialog.getByRole("button", { name: "Save corrections" }).click();
  await page.keyboard.press("Escape");
  await page.goto("/my-checklist");
  await expect(page.getByRole("region", { name: CHECKLIST_REGION }).getByText("Details match")).toBeVisible();
});

test("clearing checked details resets the checklist", async ({ page }) => {
  await useDemoGuide(page);
  await page.goto(requirementUrl("illustrative-enrollment"));
  await page.getByRole("button", { name: "Try a clean sample" }).click();
  await page.keyboard.press("Escape");
  await page.goto("/my-checklist");
  await page.getByRole("button", { name: "Clear checked details" }).click();
  await expect(page.getByText("Checked details cleared")).toBeVisible();
  await expect(page.getByRole("region", { name: CHECKLIST_REGION })).toHaveCount(0);
});
