import type { Page } from "@playwright/test";

export const GUIDE_ID = "pscs-core-college-renewal";
export const CYCLE_ID = "pscs-core-college-renewal-ay2026-s1";
export const GUIDE_PREFS = { level: "College / university", applicantType: "Renewal", programId: GUIDE_ID, cycleId: CYCLE_ID };

/** Select the built-in R26 College guide and stub the browser-reference request the workspace makes. */
export async function useBuiltInGuide(page: Page) {
  await page.route("**/api/applicant/session", (route) =>
    route.fulfill({ json: { sessionId: "40000000-0000-4000-8000-000000000001", expiresAt: new Date(Date.now() + 86_400_000).toISOString() } }));
  await page.addInitScript((prefs) => {
    if (!localStorage.getItem("gabayiskolar:preferences:v1")) localStorage.setItem("gabayiskolar:preferences:v1", JSON.stringify(prefs));
  }, GUIDE_PREFS);
}

export const requirementUrl = (id: string) => `/requirements/${id}?program=${GUIDE_ID}&cycle=${CYCLE_ID}`;

/** Answer /api/ai/ocr with a fixed body and record which document profile the page asked for. */
export async function mockOcrFor(page: Page, body: object, status = 200): Promise<{ profiles: string[] }> {
  const profiles: string[] = [];
  await page.route("**/api/ai/ocr", async (route) => {
    const match = route.request().postDataBuffer()?.toString().match(/name="profile"\r\n\r\n([a-z_]+)/);
    profiles.push(match?.[1] ?? "");
    await route.fulfill({ status, json: body });
  });
  return { profiles };
}
