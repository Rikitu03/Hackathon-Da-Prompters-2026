import { expect, test, type Page } from "@playwright/test";
import { chooseGuide, CYCLE_ID, GROUNDED_REPLY, mockChat, mockOcr, mockPublishedGuide, OCR_REVIEW, OFFICIAL_URL, PROGRAM_ID, REQ_ENROLL_ID, SOURCE_URL } from "./support/applicant-mocks";

test.beforeEach(async ({ page }) => {
  // Fail closed: no browser test can send data to a real provider or shared database.
  await page.route(/https:\/\//, (route) => route.abort());
});

async function onboard(page: Page) {
  await page.getByRole("combobox", { name: "Education level", exact: true }).selectOption("College / university");
  await page.getByRole("combobox", { name: "I’m preparing as a", exact: true }).selectOption("New applicant");
  await page.getByRole("combobox", { name: "Intended scholarship guide", exact: true }).selectOption(PROGRAM_ID);
  await page.getByRole("button", { name: "Create my workspace" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}
async function checkDocument(page: Page) {
  await page.locator('input[type="file"]').setInputFiles("tests/fixtures/demo-certificate.png");
  await page.getByLabel(/Send this document to Lumen OCR/).check();
  await page.getByRole("button", { name: "Extract details", exact: true }).click();
  await expect(page.getByText("Read from document: Name: Juan Dela Cruz (fictional)")).toBeVisible();
  await expect(page.getByText("Not found. Please fill this in if it applies.")).toBeVisible();
  await page.getByLabel("Barangay", { exact: true }).fill("San Antonio");
  await page.getByLabel(/I compared these details/).check();
  await page.getByRole("button", { name: "Confirm my review" }).click();
}

test("dashboard marks the next stage and offers consistent navigation", async ({ page, isMobile }) => {
  await mockPublishedGuide(page); await chooseGuide(page); await page.goto("/dashboard");
  const rail = page.getByRole("navigation", { name: "Your preparation journey" });
  await expect(rail.getByRole("link", { name: "Choose a guide, done", exact: true })).toBeVisible();
  await expect(rail.locator('[aria-current="step"]')).toHaveAccessibleName("Prepare your checklist");
  if (isMobile) await page.getByRole("button", { name: "Open navigation", exact: true }).click();
  await expect(page.getByRole("navigation", { name: "Student workspace" }).getByRole("link"))
    .toHaveText(["Dashboard", "Scholarships", "My checklist", "Private draft", "Check a document", "Official step"]);
});

test("onboarding offers all PSCS levels and creates the selected workspace", async ({ page }) => {
  await mockPublishedGuide(page); await page.goto("/onboarding");
  await expect(page.getByRole("combobox", { name: "Education level", exact: true }).locator("option")).toHaveText([
    "Choose your level", "Elementary (Grades 4–6)", "Junior high school (Grades 7–10)", "Senior high school (Grades 11–12)", "College / university",
  ]);
  await onboard(page);
});

test("the landing page names the same five stages", async ({ page }) => {
  await page.goto("/");
  for (const name of ["Choose a guide", "Prepare your checklist", "Check a document", "Ask Gabay", "Take the official step"])
    await expect(page.locator(".journey-grid").getByRole("heading", { name, exact: true })).toBeVisible();
});

test("closed guides explain the date while keeping the written guide available", async ({ page }) => {
  await mockPublishedGuide(page, { application_end: "2020-01-31" });
  await page.goto(`/scholarships/${PROGRAM_ID}`);
  await expect(page.getByText("Closed", { exact: true })).toBeVisible();
  await expect(page.getByText(/Applications for this cycle closed on 31 Jan 2020/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Use this guide" })).toBeEnabled();
});

test("a requirement leads to a document check without changing its status", async ({ page }) => {
  await mockPublishedGuide(page); await chooseGuide(page); await mockOcr(page, OCR_REVIEW);
  await page.goto(`/requirements/${REQ_ENROLL_ID}?program=${PROGRAM_ID}&cycle=${CYCLE_ID}`);
  await page.getByRole("link", { name: "Check my document" }).click();
  await expect(page.getByLabel("Document for")).toHaveValue(REQ_ENROLL_ID);
  await expect(page.getByText(/Lumen keeps a copy/)).toBeVisible();
  await checkDocument(page);
  await expect(page.getByRole("heading", { name: /What's next for/ })).toBeVisible();
  await expect(page.getByLabel(/Preparation status for/)).toHaveValue("not-started");
  await page.getByRole("button", { name: /Ask Gabay about Proof/ }).click();
  await expect(page.getByRole("dialog", { name: "Ask Gabay" })).toBeVisible();
  await expect(page.getByLabel("Ask about", { exact: true })).toHaveValue(REQ_ENROLL_ID);
});

test("requirement questions show linked citations and server notices", async ({ page }) => {
  await mockPublishedGuide(page); await chooseGuide(page);
  const chat = await mockChat(page, [GROUNDED_REPLY, { answer: "The published guide does not give an office fee.", grounded: false, sources: [], officialUrl: OFFICIAL_URL }]);
  await page.goto(`/assistant?requirement=${REQ_ENROLL_ID}`);
  await page.getByLabel("Your scholarship question").fill("Where do I get proof of enrollment?");
  await page.getByLabel("Your scholarship question").press("Enter");
  await expect(page.getByRole("link", { name: "[1]", exact: true })).toHaveAttribute("href", SOURCE_URL);
  expect(chat.bodies[0]).toMatchObject({ cycleId: CYCLE_ID, requirementId: REQ_ENROLL_ID });
  await page.getByLabel("Your scholarship question").fill("What is the office fee?");
  await page.getByLabel("Your scholarship question").press("Enter");
  const notice = page.locator(".gabay-message-notice");
  await expect(notice.getByText("Published guidance unavailable")).toBeVisible();
  await expect(notice).toContainText("The published guide does not give an office fee.");
  await expect(notice.getByRole("link", { name: "Open the official page" })).toHaveAttribute("href", OFFICIAL_URL);
});

test("long pastes are capped and stale requirement links send whole-guide context", async ({ page }) => {
  await mockPublishedGuide(page); await chooseGuide(page); const chat = await mockChat(page, [GROUNDED_REPLY]);
  await page.goto("/assistant?requirement=00000000-0000-4000-8000-000000000000");
  await expect(page.getByRole("combobox", { name: "Ask about", exact: true })).toHaveValue("");
  await page.getByLabel("Your scholarship question").fill("x".repeat(600));
  await expect(page.getByLabel("Your scholarship question")).toHaveValue("x".repeat(500));
  await expect(page.getByText(/500\/500/)).toBeVisible();
  await page.getByLabel("Your scholarship question").press("Enter");
  await expect(page.getByRole("link", { name: "[1]", exact: true })).toBeVisible();
  expect(chat.bodies[0]).not.toHaveProperty("requirementId");
  expect(String(chat.bodies[0].message)).toHaveLength(500);
});

test("closed cycles disable questions without calling chat", async ({ page }) => {
  await mockPublishedGuide(page, { application_end: "2020-01-31" }); await chooseGuide(page);
  const chat = await mockChat(page, [GROUNDED_REPLY]); await page.goto("/assistant");
  await expect(page.getByLabel("Your scholarship question")).toBeDisabled();
  await expect(page.getByText(/Applications for this cycle closed on 31 Jan 2020/)).toBeVisible();
  expect(chat.bodies).toEqual([]);
});

test("summary uses the cycle destination and retains the general portal link", async ({ page }) => {
  await mockPublishedGuide(page); await chooseGuide(page); await page.goto("/summary");
  await expect(page.getByRole("link", { name: "Continue to the official application page" })).toHaveAttribute("href", OFFICIAL_URL);
  await expect(page.getByRole("link", { name: "Pasig City Scholarship Portal", exact: true })).toHaveAttribute("href", "https://scholars.pasigcity.gov.ph/");
});

test("unpublished saved guides explain how to recover", async ({ page }) => {
  await page.route(`**/api/scholarships/${PROGRAM_ID}`, (r) => r.fulfill({ status: 404, json: { error: "Record not found" } }));
  await chooseGuide(page); await page.goto("/my-checklist");
  await expect(page.getByText("This guide is no longer published. Choose a current guide to continue.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Choose another guide" })).toHaveAttribute("href", "/onboarding");
});

test("checklist changes update the journey counts during the visit", async ({ page, isMobile }) => {
  await mockPublishedGuide(page); await chooseGuide(page); await page.goto("/my-checklist");
  await expect(page.getByLabel(/Preparation status for/)).toHaveCount(2);
  for (const control of await page.getByLabel(/Preparation status for/).all()) await control.selectOption("prepared");
  const rail = page.getByRole("navigation", { name: "Your preparation journey" });
  await expect(rail.getByRole("link", { name: "Prepare your checklist, done", exact: true })).toBeVisible();
  if (!isMobile) await expect(rail.getByText("2 of 2 ready")).toBeVisible();
});

test("a platform OCR timeout explains recovery and waits for a manual retry", async ({ page }) => {
  await mockPublishedGuide(page); await chooseGuide(page);
  let uploads = 0;
  await page.route("**/api/ai/ocr", (route) => { uploads++; return route.fulfill({ status: 504, contentType: "text/html", body: "<html>Gateway timeout</html>" }); });
  await page.goto(`/document-review?requirement=${REQ_ENROLL_ID}`);
  await page.locator('input[type="file"]').setInputFiles("tests/fixtures/demo-certificate.png");
  await expect(page.getByRole("button", { name: "Extract details", exact: true })).toBeDisabled();
  await page.getByLabel(/Send this document to Lumen OCR/).check();
  await page.getByRole("button", { name: "Extract details", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Document review" })).toContainText("didn't respond in time");
  expect(uploads).toBe(1);
  await page.getByRole("button", { name: "Retry extraction", exact: true }).click();
  await expect.poll(() => uploads).toBe(2);
});

test("a student completes the whole preparation journey", async ({ page, isMobile }) => {
  test.setTimeout(120_000);
  await mockPublishedGuide(page); await mockOcr(page, OCR_REVIEW); const chat = await mockChat(page, [GROUNDED_REPLY]);
  await page.goto("/"); await page.getByRole("link", { name: "Start preparing", exact: true }).first().click();
  await onboard(page);
  await page.getByRole("link", { name: "Continue preparing", exact: true }).click();
  await page.getByRole("link", { name: "Read preparation steps", exact: true }).first().click();
  await expect(page).toHaveURL(new RegExp(`/requirements/${REQ_ENROLL_ID}`));
  await expect(page.getByRole("heading", { level: 1, name: "Proof of enrollment", exact: true })).toBeVisible();
  await page.getByLabel(/Preparation status for/).selectOption("in-progress");
  await page.getByRole("link", { name: "Check my document" }).click(); await checkDocument(page);
  await expect(page.getByLabel(/Preparation status for/)).toHaveValue("in-progress");
  await page.getByRole("button", { name: /Ask Gabay about Proof/ }).click();
  await page.getByLabel("Your scholarship question").fill("Where do I get this certificate?");
  await page.getByLabel("Your scholarship question").press("Enter");
  await expect(page.getByRole("link", { name: "[1]", exact: true })).toHaveAttribute("href", SOURCE_URL);
  expect(chat.bodies[0].requirementId).toBe(REQ_ENROLL_ID);
  await page.getByRole("button", { name: "Close Ask Gabay", exact: true }).click();
  if (isMobile) await page.getByRole("button", { name: "Open navigation", exact: true }).click();
  await page.getByRole("link", { name: "Official step", exact: true }).click();
  await expect(page.getByText("Documents you checked this visit: 1")).toBeVisible();
  await expect(page.getByRole("link", { name: "Continue to the official application page" })).toHaveAttribute("href", OFFICIAL_URL);
  await page.reload(); await expect(page.getByText("In progress", { exact: true })).toBeVisible();
  await expect(page.getByText("Documents you checked this visit: 0")).toBeVisible();
});

test("no applicant route scrolls sideways at 320px", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile only"); test.setTimeout(120_000);
  await mockPublishedGuide(page); await chooseGuide(page);
  for (const path of ["/", "/onboarding", "/scholarships", `/scholarships/${PROGRAM_ID}`, "/dashboard", "/my-checklist", `/requirements/${REQ_ENROLL_ID}?program=${PROGRAM_ID}&cycle=${CYCLE_ID}`, "/document-review", "/assistant", "/summary"]) {
    await page.goto(path);
    await page.getByRole("heading", { level: 1 }).waitFor();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), { message: path }).toBe(true);
  }
});
