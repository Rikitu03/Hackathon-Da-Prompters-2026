import { describe, expect, it } from "vitest";
import { mapCitations, type PromptSource } from "./citations";

const included: PromptSource[] = [
  { sourceId: "src-a", title: "Requirements", url: "https://example.gov.ph/req", content: "..." },
  { sourceId: "src-b", title: "How to get documents", url: null, content: "..." },
  { sourceId: "src-a", title: "Requirements", url: "https://example.gov.ph/req", content: "second chunk" },
];

describe("mapCitations", () => {
  it("maps [S#] markers to their sources in order of first mention", () => {
    expect(mapCitations("Sa Barangay Hall [S2]. Kailangan din ng ID [S1].", included)).toEqual([
      { sourceId: "src-b", title: "How to get documents" },
      { sourceId: "src-a", title: "Requirements", url: "https://example.gov.ph/req" },
    ]);
  });
  it("handles grouped markers and dedupes by sourceId", () => {
    expect(mapCitations("Both apply [S1, S3] [S1].", included)).toEqual([
      { sourceId: "src-a", title: "Requirements", url: "https://example.gov.ph/req" },
    ]);
  });
  it("drops markers that point at sources we did not send", () => {
    expect(mapCitations("Invented [S9] and [S0].", included)).toEqual([]);
  });
  it("returns nothing for an answer without markers", () => {
    expect(mapCitations("I could not find this.", included)).toEqual([]);
  });
});
