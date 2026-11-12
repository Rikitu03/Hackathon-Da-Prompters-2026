import { describe, expect, it } from "vitest";
import { renumberCitations, type PromptSource } from "./citations";

const included: PromptSource[] = [
  { sourceId: "src-a", title: "Requirements", url: "https://example.gov.ph/req", content: "..." },
  { sourceId: "src-b", title: "How to get documents", url: null, content: "..." },
  { sourceId: "src-a", title: "Requirements", url: "https://example.gov.ph/req", content: "second chunk" },
];

describe("renumberCitations", () => {
  it("maps [S#] markers to their sources in order of first mention", () => {
    const result = renumberCitations("Sa Barangay Hall [S2]. Kailangan din ng ID [S1].", included);
    expect(result.answer).toBe("Sa Barangay Hall [1]. Kailangan din ng ID [2].");
    expect(result.sources).toEqual([
      { sourceId: "src-b", title: "How to get documents" },
      { sourceId: "src-a", title: "Requirements", url: "https://example.gov.ph/req" },
    ]);
  });
  it("handles grouped markers and dedupes by sourceId", () => {
    const result = renumberCitations("Both apply [S1, S3] [S1].", included);
    expect(result.answer).toBe("Both apply [1] [1].");
    expect(result.sources).toEqual([
      { sourceId: "src-a", title: "Requirements", url: "https://example.gov.ph/req" },
    ]);
  });
  it("drops markers that point at sources we did not send", () => {
    expect(renumberCitations("Invented [S9] and [S0].", included)).toEqual({ answer: "Invented and.", sources: [] });
  });
  it("returns nothing for an answer without markers", () => {
    expect(renumberCitations("I could not find this.", included).sources).toEqual([]);
  });
  it("retains known references in a mixed group and ignores other brackets", () => {
    expect(renumberCitations("Hall [S2, S99]. [School 1] [S1oops]", included).answer)
      .toBe("Hall [1]. [School 1] [S1oops]");
  });
});
