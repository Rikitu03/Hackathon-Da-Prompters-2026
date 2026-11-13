import { expect, test } from "@playwright/test";
import { chooseGuide, CYCLE_ID, GROUNDED_REPLY, mockChat, mockPublishedGuide, PROGRAM_ID, REQ_ENROLL_ID, SOURCE_URL } from "./support/applicant-mocks";

test.beforeEach(async ({ page }) => {
  await page.route(/https:\/\//, route => route.abort());
  await mockPublishedGuide(page);
  await chooseGuide(page);
});

test("launcher opens without navigating and retains drafts on minimize, close and Escape", async ({ page }) => {
  test.setTimeout(60_000); // Several keyboard/focus round trips, including a cold browser start.
  await page.goto("/dashboard");
  await expect(page.getByRole("navigation", { name: "Student workspace" }).getByRole("link", { name: "Ask Gabay" })).toHaveCount(0);
  const question = page.getByLabel("Your scholarship question");
  await page.getByRole("button", { name: "Open Ask Gabay", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByLabel("Your product question")).toBeFocused();
  await page.getByRole("button", { name: "Scholarship guide", exact: true }).click();
  await question.focus();
  await expect(question).toBeFocused();
  await expect(page.getByRole("button", { name: "Send question" })).toBeDisabled();
  await page.getByRole("button", { name: "How do I apply?", exact: true }).click();
  await expect(question).toHaveValue("How do I apply?");
  await question.press("Shift+Enter");
  await question.pressSequentially("And which documents?");
  const draft = await question.inputValue();
  expect(draft).toContain("\n");
  await page.getByRole("button", { name: "Minimize Ask Gabay", exact: true }).first().click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Open Ask Gabay" })).toBeFocused();
  await page.getByRole("button", { name: "Open Ask Gabay" }).click();
  await expect(question).toHaveValue(draft);
  await question.press("Escape");
  await page.getByRole("button", { name: "Open Ask Gabay" }).click();
  await expect(question).toHaveValue(draft);
  await page.getByRole("button", { name: "Close Ask Gabay", exact: true }).click();
  await page.getByRole("button", { name: "Open Ask Gabay" }).click();
  await expect(question).toHaveValue(draft);
});

test("real API adapter sends only supported context and preserves chat across applicant navigation", async ({ page, isMobile }) => {
  const chat = await mockChat(page, [GROUNDED_REPLY]);
  await page.goto(`/requirements/${REQ_ENROLL_ID}?program=${PROGRAM_ID}&cycle=${CYCLE_ID}`);
  await page.getByRole("button", { name: "Ask Gabay about this item" }).click();
  const question = page.getByLabel("Your scholarship question");
  await question.fill("Saan po kukuha ng proof of enrollment?");
  await question.press("Enter");
  await expect(page.getByRole("link", { name: "[1]", exact: true })).toHaveAttribute("href", SOURCE_URL);
  expect(chat.bodies).toEqual([{ cycleId: CYCLE_ID, requirementId: REQ_ENROLL_ID, message: "Saan po kukuha ng proof of enrollment?" }]);
  await page.getByRole("button", { name: "Close Ask Gabay", exact: true }).click();
  if (isMobile) await page.getByRole("button", { name: "Open navigation", exact: true }).click();
  await page.getByRole("navigation", { name: "Student workspace" }).getByRole("link", { name: "Dashboard", exact: true }).click();
  await page.getByRole("button", { name: "Open Ask Gabay" }).click();
  await expect(page.getByRole("link", { name: "[1]", exact: true })).toBeVisible();
});

test("in-flight requests survive minimize, reject duplicates, and allow typing the next draft", async ({ page }) => {
  let requests = 0;
  let release!: () => void;
  const response = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/ai/chat", async route => { requests++; await response; await route.fulfill({ json: GROUNDED_REPLY }); });
  await page.goto("/dashboard?gabay=open");
  const question = page.getByLabel("Your scholarship question");
  await question.fill("What documents do I need?");
  await question.press("Enter");
  await expect(page.getByRole("button", { name: "Stop request" })).toBeVisible();
  await question.fill("My next scholarship question");
  await question.press("Enter");
  await page.getByRole("button", { name: "Close Ask Gabay", exact: true }).click();
  release();
  await page.getByRole("button", { name: "Open Ask Gabay" }).click();
  await expect(page.getByRole("link", { name: "[1]", exact: true })).toBeVisible();
  await expect(question).toHaveValue("My next scholarship question");
  expect(requests).toBe(1);
});

for (const status of [429, 500, 503]) {
  test(`HTTP ${status} shows a retry without duplicating the user message`, async ({ page }) => {
    let requests = 0;
    await page.route("**/api/ai/chat", route => {
      requests++;
      return requests === 1 ? route.fulfill({ status, json: { error: "Service failure" } }) : route.fulfill({ json: GROUNDED_REPLY });
    });
    await page.goto("/dashboard?gabay=open");
    await page.getByLabel("Your scholarship question").fill("What are the requirements?");
    await page.getByRole("button", { name: "Send question" }).click();
    await expect(page.getByRole("dialog", { name: "Ask Gabay" }).getByRole("alert")).toBeVisible();
    await page.getByRole("button", { name: "Retry last question" }).click();
    await expect(page.getByRole("link", { name: "[1]", exact: true })).toBeVisible();
    await expect(page.locator(".gabay-message-user")).toHaveCount(1);
  });
}

test("server scope and insufficient-evidence responses are shown without fabricated citations", async ({ page }) => {
  const text = "I'm Gabay, your scholarship preparation assistant. I can help with scholarship requirements, documents, and application preparation.";
  await mockChat(page, [{ answer: text, grounded: false, sources: [] }, { answer: "Unsupported claim [1]", grounded: true, sources: [] }]);
  await page.goto("/dashboard?gabay=open");
  const question = page.getByLabel("Your scholarship question");
  await question.fill("Write a program for me"); await question.press("Enter");
  await expect(page.locator(".gabay-message-notice")).toContainText(text);
  await question.fill("What are the fees?"); await question.press("Enter");
  await expect(page.locator(".gabay-message-notice").last()).toContainText("I couldn't find this in the published guide");
  await expect(page.locator(".gabay-citation, .gabay-sources a")).toHaveCount(0);
});

test("network failures retain a manual retry", async ({ page }) => {
  await page.route("**/api/ai/chat", route => route.abort());
  await page.goto("/dashboard?gabay=open");
  await page.getByLabel("Your scholarship question").fill("What documents should I prepare?");
  await page.getByLabel("Your scholarship question").press("Enter");
  await expect(page.getByRole("dialog", { name: "Ask Gabay" }).getByRole("alert")).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry last question" })).toBeEnabled();
});

test("the real application chat route reports disabled service honestly", async ({ page }) => {
  // Unlike response-fixture tests, this POST reaches the local route. The test
  // server explicitly disables Lumen, so no credentials, credits or provider calls.
  await page.goto("/dashboard?gabay=open");
  await page.getByLabel("Your scholarship question").fill("What are the requirements?");
  const response = page.waitForResponse(r => r.url().endsWith("/api/ai/chat"));
  await page.getByRole("button", { name: "Send question" }).click();
  expect((await response).status()).toBe(503);
  await expect(page.getByRole("dialog", { name: "Ask Gabay" }).getByRole("alert")).toContainText("unavailable");
  await expect(page.getByRole("button", { name: "Retry last question" })).toBeEnabled();
  await expect(page.locator(".gabay-message-assistant")).toHaveCount(0);
});

test("widget stays within the viewport in light and dark themes and keyboard-sized heights", async ({ page }) => {
  await page.goto("/dashboard?gabay=open");
  for (const colorScheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    const panel = page.getByRole("dialog", { name: "Ask Gabay" });
    await expect(panel).toBeVisible();
    await expect(page.getByText("Hi! I'm Gabay!", { exact: false })).toBeInViewport();
    const box = await panel.boundingBox();
    const viewport = page.viewportSize()!;
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
    expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
    await page.screenshot({ path: `test-results/gabay-${viewport.width}-${colorScheme}.png` });
  }
  await page.setViewportSize({ width: 360, height: 440 });
  await expect(page.getByRole("button", { name: "Send question" })).toBeInViewport();
  await expect(page.getByRole("button", { name: "Close Ask Gabay", exact: true })).toBeInViewport();
});

test("applicant routes have a launcher and admin/backend routes do not", async ({ page }) => {
  for (const path of ["/", "/dashboard", "/my-checklist", "/onboarding", "/scholarships", "/document-review", "/summary", "/application-draft"]) {
    await page.goto(path);
    await expect(page.getByRole("button", { name: "Open Ask Gabay" })).toBeVisible();
  }
  for (const path of ["/admin/demo", "/backend-lab"]) {
    await page.goto(path);
    await expect(page.locator(".gabay-widget")).toHaveCount(0);
  }
});
