import type { Page } from "@playwright/test";

export const DEMO_PROGRAM_ID = "illustrative-college";
export const DEMO_CYCLE_ID = "illustrative-college-cycle";
export const DEMO_PREFS = {
  level: "College / university",
  applicantType: "New applicant",
  programId: DEMO_PROGRAM_ID,
  cycleId: DEMO_CYCLE_ID,
};

/** Select the built-in demo guide (no network) and stub the browser-reference request the workspace makes. */
export async function useDemoGuide(page: Page) {
  await page.route("**/api/applicant/session", (route) =>
    route.fulfill({ json: { sessionId: "40000000-0000-4000-8000-000000000001", expiresAt: new Date(Date.now() + 86_400_000).toISOString() } }));
  await page.addInitScript((prefs) => {
    if (!localStorage.getItem("gabayiskolar:preferences:v1")) localStorage.setItem("gabayiskolar:preferences:v1", JSON.stringify(prefs));
  }, DEMO_PREFS);
}

export const requirementUrl = (id: string) => `/requirements/${id}?program=${DEMO_PROGRAM_ID}&cycle=${DEMO_CYCLE_ID}`;

/** Answer /api/ai/verify with a fixed body and record what the page sent. */
export async function mockVerify(page: Page, body: object, status = 200): Promise<{ bodies: unknown[] }> {
  const bodies: unknown[] = [];
  await page.route("**/api/ai/verify", async (route) => {
    const posted = route.request().postData();
    if (posted) bodies.push(JSON.parse(posted));
    await route.fulfill({ status, json: body });
  });
  return { bodies };
}

/** Local calendar date as YYYY-MM-DD, `offsetDays` from today. */
export function localIsoDate(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
