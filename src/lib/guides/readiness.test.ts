import { describe, expect, it } from "vitest";
import { publicationReadiness } from "./readiness";
import type { GuideDocument } from "./schema";
const document: GuideDocument = {
  programId: "p", cycleId: "c", status: "draft", title: "Synthetic guide", description: "Reviewed test description", academicYear: "Test year",
  applicationStart: "2026-11-01", applicationEnd: "2026-12-01", officialUrl: "https://example.test/apply",
  requirements: [{ title: "Test document", description: "Example", required: true, steps: ["Read the instructions"], faqs: [] }],
  sources: [{ id: "s", title: "Test reference", url: "https://example.test/reference", content: "Reviewed reference text", approved: true }],
};
describe("server publication readiness", () => {
  it("enables publication only for a complete reviewed draft and a publisher", () => {
    expect(publicationReadiness(document, new Set(["s"]), true).ready).toBe(true);
    expect(publicationReadiness(document, new Set(["s"]), false).ready).toBe(false);
  });
  it("rejects link-only sources, missing review evidence, and invalid cycles", () => {
    expect(publicationReadiness({ ...document, sources: [{ ...document.sources[0], content: "" }] }, new Set(["s"]), true).ready).toBe(false);
    expect(publicationReadiness(document, new Set(), true).ready).toBe(false);
    expect(publicationReadiness({ ...document, applicationEnd: "" }, new Set(["s"]), true).ready).toBe(false);
    expect(publicationReadiness({ ...document, requirements: [] }, new Set(["s"]), true).ready).toBe(false);
  });
});
