import { describe, expect, it } from "vitest";
import { analyzeDocument, recordFromSample, type Analysis } from "./analyze";
import { PROFILE_IDS, documentRecordSchema, type DocumentRecord, type RecordMap } from "./contract";
import { samplePages, type SampleVariant } from "./samples";

const NOW = new Date(2026, 10, 13);
const all = (variant: SampleVariant, now = NOW) =>
  Object.fromEntries(PROFILE_IDS.map((id) => [id, recordFromSample(id, variant, now)])) as RecordMap;
const ids = (a: Analysis | null) => a!.flags.map((f) => `${f.id}:${f.severity}`);

describe("fictional samples", () => {
  it("clean samples raise no alerts or warnings and match each other", () => {
    const records = all("clean");
    for (const id of PROFILE_IDS)
      expect(analyzeDocument(id, records, NOW)!.flags.filter((f) => f.severity !== "info")).toEqual([]);
    expect(analyzeDocument("school_id", records, NOW)!.comparisons.map((c) => c.status)).toEqual(["match", "match"]);
  });

  it("clean samples stay clean at the start of a school year", () => {
    const now = new Date(2027, 5, 3);
    expect(analyzeDocument("certificate_of_registration", all("clean", now), now)!.flags).toEqual([]);
  });

  it("the clean COR shows the example student number", () =>
    expect(recordFromSample("certificate_of_registration", "clean", NOW).fields.find((f) => f.key === "student_no")!.value).toBe("23-00314"));

  it("marks every sample fictional", () => {
    for (const id of PROFILE_IDS)
      for (const v of ["clean", "with-issues"] as const)
        expect(samplePages(id, v, NOW)[0].lines[0].text).toBe("SAMPLE - FICTIONAL DATA - FOR TESTING ONLY");
  });

  it("records survive their own schema", () => {
    for (const id of PROFILE_IDS) expect(documentRecordSchema.parse(recordFromSample(id, "with-issues", NOW))).toBeTruthy();
  });
});

describe("analyzeDocument", () => {
  it("COR with issues: recency, school year and year level", () =>
    expect(ids(analyzeDocument("certificate_of_registration",
      { certificate_of_registration: recordFromSample("certificate_of_registration", "with-issues", NOW) }, NOW)))
      .toEqual(["school-year-enrollment-mismatch:alert", "enrollment-date-outdated:warning", "year-level-student-no:info"]));

  it("residency with issues against a clean COR", () => {
    const r = { ...all("clean"), certificate_of_residency: recordFromSample("certificate_of_residency", "with-issues", NOW) };
    expect(ids(analyzeDocument("certificate_of_residency", r, NOW)))
      .toEqual(["date-issued-future:alert", "cross-residency-address:alert", "cross-residency-name:warning"]);
  });

  it("ID with issues: student number mismatch", () => {
    const r = { ...all("clean"), school_id: recordFromSample("school_id", "with-issues", NOW) };
    expect(ids(analyzeDocument("school_id", r, NOW))).toEqual(["cross-id-student-no:alert"]);
  });

  it("includes AI flags after rule flags of the same severity", () => {
    const rec = {
      ...recordFromSample("certificate_of_registration", "with-issues", NOW),
      ai: { status: "ok", reviewedAt: NOW.toISOString(), flags: [{ id: "ai-1", severity: "info", title: "t", detail: "d", fieldKeys: [], origin: "ai" }] },
    } as DocumentRecord;
    expect(ids(analyzeDocument("certificate_of_registration", { certificate_of_registration: rec }, NOW)).at(-1)).toBe("ai-1:info");
  });

  it("counts flags by severity", () =>
    expect(analyzeDocument("certificate_of_registration",
      { certificate_of_registration: recordFromSample("certificate_of_registration", "with-issues", NOW) }, NOW)!.counts)
      .toEqual({ alert: 1, warning: 1, info: 1 }));

  it("ignores unavailable AI reviews", () => {
    const rec = { ...recordFromSample("school_id", "clean", NOW), ai: { status: "unavailable", message: "off" } } as DocumentRecord;
    expect(analyzeDocument("school_id", { school_id: rec }, NOW)!.flags).toEqual([]);
  });

  it("returns null without a record", () => expect(analyzeDocument("school_id", {}, NOW)).toBeNull());
});
