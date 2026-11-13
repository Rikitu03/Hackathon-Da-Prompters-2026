import { describe, expect, it } from "vitest";
import { OCR_DISCLAIMER, extractFields } from "./extract-fields";
import { demoPages } from "./__fixtures__/demo-pages";

const valueOf = (res: ReturnType<typeof extractFields>, key: string) => res.fields.find((f) => f.key === key);

describe("extractFields", () => {
  it("extracts labelled fields from the observed demo certificate", () => {
    const res = extractFields(demoPages);
    expect(res.fields.map((f) => [f.key, f.value])).toEqual([
      ["document_type", "CERTIFICATE OF INDIGENCY"],
      ["full_name", "Juan Dela Cruz (fictional)"],
      ["barangay", "Demo Barangay"],
      ["date_issued", "2026-11-13"],
      ["purpose", "Scholarship application (demo)"],
      ["issuing_office", "Office of the Punong Barangay (demo)"],
    ]);
    expect(res.fields.every((f) => f.warnings.length === 0 && f.needsReview === false)).toBe(true);
    expect(valueOf(res, "full_name")?.originalText).toBe("Name: Juan Dela Cruz (fictional)");
    expect(res.rawText.split("\n")).toHaveLength(8);
    expect(res.warnings).toEqual([]);
    expect(res.disclaimer).toBe(OCR_DISCLAIMER);
  });

  it("accepts Filipino labels", () => {
    const res = extractFields([{ pageNumber: 1, lines: [{ text: "Pangalan: Maria Santos", confidence: 0.99 }] }]);
    expect(valueOf(res, "full_name")?.value).toBe("Maria Santos");
  });

  it("warns on low or unreported confidence", () => {
    const res = extractFields([{ pageNumber: 1, lines: [
      { text: "Name: Jvan Dela Crvz", confidence: 0.5 },
      { text: "Barangay: Demo", confidence: undefined },
    ] }]);
    expect(valueOf(res, "full_name")?.warnings).toEqual(["Low confidence. Please check."]);
    expect(valueOf(res, "full_name")?.needsReview).toBe(true);
    expect(valueOf(res, "barangay")?.warnings).toEqual(["Confidence not reported. Please check."]);
    expect(valueOf(res, "barangay")?.needsReview).toBe(true);
  });

  it("leaves missing fields empty with a warning instead of guessing", () => {
    const res = extractFields([{ pageNumber: 1, lines: [{ text: "Some unrelated text", confidence: 0.99 }] }]);
    expect(valueOf(res, "date_issued")).toEqual({
      key: "date_issued", label: "Date issued", value: "", needsReview: true, originalText: "",
      warnings: ["Not found. Please fill this in if it applies."],
    });
  });

  it("adds document-level warnings for empty reads and failed pages", () => {
    expect(extractFields([]).warnings).toEqual(["No text was found. Try a clearer, well-lit photo."]);
    expect(extractFields(demoPages, { failedPages: [2, 3] }).warnings).toEqual(["Some pages could not be read: 2, 3."]);
  });

  it("never claims verification or eligibility", () => {
    expect(JSON.stringify(extractFields(demoPages))).not.toMatch(/\b(verified|authentic|eligible|approved|valid)\b/i);
  });

  it.each(["Name:   ", "Name: ____"])("flags a blank or placeholder label value (%j) as not found", (text) => {
    const res = extractFields([{ pageNumber: 1, lines: [{ text, confidence: 0.99 }] }]);
    const f = res.fields.find((x) => x.key === "full_name")!;
    expect(f.value).toBe("");
    expect(f.needsReview).toBe(true);
    expect(f.warnings).toEqual(["Not found. Please fill this in if it applies."]);
  });
});
