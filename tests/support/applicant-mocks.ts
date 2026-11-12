import type { Page } from "@playwright/test";
import type { PublicCycle, PublicProgram } from "../../src/lib/guides/data";

export const PROGRAM_ID = "10000000-0000-4000-8000-000000000001";
export const CYCLE_ID = "20000000-0000-4000-8000-000000000001";
export const REQ_ENROLL_ID = "30000000-0000-4000-8000-000000000001";
export const REQ_RESIDENCY_ID = "30000000-0000-4000-8000-000000000002";
export const OFFICIAL_URL = "https://example.org/apply";
export const SOURCE_URL = "https://example.org/reference";

export async function mockPublishedGuide(page: Page, cycle: Partial<PublicCycle> = {}) {
  const program: PublicProgram = {
    id: PROGRAM_ID, title: "Test scholarship preparation", description: "Fictional content for browser acceptance tests only.", status: "published",
    application_cycles: [{
      id: CYCLE_ID, academic_year: "Test cycle", application_start: "2020-01-01",
      application_end: `${new Date().getFullYear() + 1}-12-31`, official_url: OFFICIAL_URL,
      published_at: "2026-11-01T00:00:00Z", status: "published",
      requirements: [
        { id: REQ_ENROLL_ID, title: "Proof of enrollment", description: "Review a fictional school certificate.", is_required: true, position: 0,
          requirement_steps: [{ id: "step-1", position: 0, instruction: "Ask the registrar for a certificate of enrollment." }],
          faqs: [{ id: "faq-1", question: "Where do I get this?", answer: "Ask the registrar." }] },
        { id: REQ_RESIDENCY_ID, title: "Residency certificate", description: "Review the residence printed on your fictional certificate.", is_required: true, position: 1,
          requirement_steps: [{ id: "step-2", position: 0, instruction: "Read the published residency instructions." }], faqs: [] },
      ],
      knowledge_sources: [{ id: "source-1", title: "Enrollment reference", source_url: SOURCE_URL, reviewed_at: "2026-11-01T00:00:00Z" }],
      ...cycle,
    }],
  };
  await page.route("**/api/scholarships?*", (route) => route.fulfill({ json: { programs: [program], page: 1, pageSize: 20 } }));
  await page.route(`**/api/scholarships/${PROGRAM_ID}`, (route) => route.fulfill({ json: { program } }));
}

export async function chooseGuide(page: Page) {
  await page.addInitScript(({ programId, cycleId }) => {
    if (!localStorage.getItem("gabayiskolar:preferences:v1")) {
      localStorage.setItem("gabayiskolar:preferences:v1", JSON.stringify({ level: "College / university", applicantType: "New applicant", programId, cycleId }));
    }
  }, { programId: PROGRAM_ID, cycleId: CYCLE_ID });
}
export async function mockChat(page: Page, replies: object[]) {
  const bodies: Record<string, unknown>[] = [];
  await page.route("**/api/ai/chat", async (route) => {
    bodies.push(route.request().postDataJSON());
    await route.fulfill({ json: replies[Math.min(bodies.length - 1, replies.length - 1)] });
  });
  return { bodies };
}
export async function mockOcr(page: Page, response: object, status = 200) {
  await page.route("**/api/ai/ocr", (route) => route.fulfill({ status, json: response }));
}
export const OCR_REVIEW = {
  rawText: "Certificate of Enrollment\nName: Juan Dela Cruz (fictional)",
  disclaimer: "Automatically read text may contain errors.", warnings: [], fields: [
    { key: "full_name", label: "Full name", value: "Juan Dela Cruz (fictional)", needsReview: false, originalText: "Name: Juan Dela Cruz (fictional)", warnings: [] },
    { key: "barangay", label: "Barangay", value: "", needsReview: true, originalText: "", warnings: ["Not found. Please fill this in if it applies."] },
  ],
};
export const GROUNDED_REPLY = {
  answer: "Ask the registrar for a certificate of enrollment [1].", grounded: true,
  sources: [{ sourceId: "source-1", title: "Enrollment reference", url: SOURCE_URL }],
};
