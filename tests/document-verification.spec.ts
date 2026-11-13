import { expect, test, type Page } from "@playwright/test";
import { mockOcrFor, requirementUrl, useBuiltInGuide } from "./support/verification-mocks";

test.beforeEach(async ({ page }) => {
  // Fail closed: no browser test reaches a real provider; AI routes answer "off" unless a test says otherwise.
  await page.route(/https:\/\//, (route) => route.abort());
  await page.route("**/api/ai/verify", (route) => route.fulfill({ status: 503, json: { error: "off" } }));
  await page.route("**/api/ai/ocr", (route) => route.fulfill({ status: 503, json: { error: "off" } }));
});

// exact: Base UI toasts also have role="dialog", e.g. "Certificate of Registration checked".
const dialogFor = (page: Page, name: string) => page.getByRole("dialog", { name, exact: true });
const field = (key: string, label: string, value: string) => ({ key, label, value, needsReview: false, originalText: `${label}: ${value}`, warnings: [] });

async function upload(page: Page) {
  await page.locator('#document-check input[type="file"]').setInputFiles("tests/fixtures/demo-certificate.png");
  await page.getByLabel(/Send this document to Lumen OCR and Lumen AI/).check();
  await page.getByRole("button", { name: "Check document", exact: true }).click();
}

test("the checklist lists the three R26 documents with a scope notice", async ({ page }) => {
  await useBuiltInGuide(page);
  await page.goto("/my-checklist");
  await expect(page.locator(".checklist-row h2")).toHaveText([
    "Certificate of Registration", "Barangay Certificate of Residency", "School ID or any Valid-ID",
  ]);
  await expect(page.getByText(/This guide covers 3 documents only/)).toBeVisible();
});

test("an uploaded ID is compared with the uploaded Certificate of Registration", async ({ page }) => {
  await useBuiltInGuide(page);
  const cor = await mockOcrFor(page, {
    rawText: "CERTIFICATE OF REGISTRATION", warnings: [], disclaimer: "d", profileId: "certificate_of_registration",
    detected: { detected: "certificate_of_registration", evidence: "CERTIFICATE OF REGISTRATION" },
    fields: [field("student_no", "Student number", "23-00314"), field("student_name", "Student name", "DELA CRUZ, JUAN MATEO")],
  });
  await page.goto(requirementUrl("certificate-of-registration"));
  await upload(page);
  await expect(dialogFor(page, "Certificate of Registration")).toBeVisible();
  expect(cor.profiles).toEqual(["certificate_of_registration"]);
  await page.keyboard.press("Escape");

  await mockOcrFor(page, {
    rawText: "STUDENT IDENTIFICATION CARD", warnings: [], disclaimer: "d", profileId: "school_id",
    detected: { detected: "school_id", evidence: "STUDENT IDENTIFICATION CARD" },
    fields: [field("full_name", "Name", "Juan M. Dela Cruz"), field("student_no", "Student number", "22-01187"), field("section", "Section", "BSIT 4-1")],
  });
  await page.goto(requirementUrl("school-or-valid-id"));
  await upload(page);
  await expect(dialogFor(page, "School ID or any Valid-ID").getByText("Student number differs from your Certificate of Registration")).toBeVisible();

  await page.goto("/my-checklist");
  await expect(page.getByRole("region", { name: "How your documents compare" }).getByText("Student number differs")).toBeVisible();
});

test("a wrong document type is flagged", async ({ page }) => {
  await useBuiltInGuide(page);
  await mockOcrFor(page, {
    rawText: "CERTIFICATE OF INDIGENCY", fields: [], warnings: [], disclaimer: "d", profileId: "certificate_of_residency",
    detected: { detected: null, otherTitle: "Certificate of Indigency", evidence: "CERTIFICATE OF INDIGENCY" },
  });
  await page.goto(requirementUrl("barangay-residency"));
  await upload(page);
  await expect(dialogFor(page, "Barangay Certificate of Residency").getByText("This looks like a Certificate of Indigency")).toBeVisible();
});

test("an unreadable upload explains recovery", async ({ page }) => {
  await useBuiltInGuide(page);
  await mockOcrFor(page, { error: "x" }, 422);
  await page.goto(requirementUrl("certificate-of-registration"));
  await upload(page);
  await expect(page.getByText("Couldn't check this document")).toBeVisible();
  await expect(page.locator("#document-check").getByRole("alert")).toContainText("Try a clearer, well-lit photo");
});
