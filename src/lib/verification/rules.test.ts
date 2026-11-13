import { describe, expect, it } from "vitest";
import type { Flag } from "./contract";
import { checkDocument } from "./rules";

const NOW = new Date(2026, 10, 13);
const COR = { detected: "certificate_of_registration", evidence: "CERTIFICATE OF REGISTRATION" } as const;
const cor = (o: Record<string, string> = {}) => ({
  student_no: "23-00314", student_name: "DELA CRUZ, JUAN MATEO", address: "12 Ilog Street, Barangay Rosario, Pasig City",
  course: "BSIT", department: "CCS", enrollment_date: "2026-08-04", school_year: "2026-2027", year_level: "4th Year", ...o,
});
const ids = (f: Flag[]) => f.map((x) => `${x.id}:${x.severity}`);
const run = (o: Record<string, string> = {}, now = NOW) =>
  checkDocument({ profileId: "certificate_of_registration", values: cor(o), detected: COR, now });

describe("Certificate of Registration rules", () => {
  it("a current, consistent COR has no flags", () => expect(run()).toEqual([]));

  it.each([["2025-03-10", "warning"], ["2024-03-10", "warning"], ["2023-03-10", "alert"]])(
    "enrollment date %s is outdated (%s)",
    (d, s) => expect(ids(run({ enrollment_date: d }))).toContain(`enrollment-date-outdated:${s}`),
  );

  it("an enrollment date in the current school year is never outdated, even after New Year", () =>
    expect(ids(run({}, new Date(2027, 0, 20)))).not.toContain("enrollment-date-outdated:warning"));

  it("flags a future enrollment date", () =>
    expect(ids(run({ enrollment_date: "2027-02-01" }))).toContain("enrollment-date-future:alert"));

  it("flags an enrollment date outside the school year", () =>
    expect(ids(run({ enrollment_date: "2025-12-01" }))).toContain("school-year-enrollment-mismatch:alert"));

  it("flags a school year spanning two years", () =>
    expect(ids(run({ school_year: "2026-2028" }))).toContain("school-year-span:warning"));

  it("flags an older school year", () =>
    expect(ids(run({ school_year: "2024-2025", enrollment_date: "2024-08-01" }))).toEqual(
      expect.arrayContaining(["school-year-not-current:warning", "enrollment-date-outdated:warning"]),
    ));

  it("notes a year level that differs from the student number", () =>
    expect(ids(run({ year_level: "2nd Year" }))).toEqual(["year-level-student-no:info"]));

  it("notes an unusual student number format", () =>
    expect(ids(run({ student_no: "2300314" }))).toEqual(["student-no-format:info"]));

  it("lists missing key details once", () => {
    const f = run({ student_no: "", school_year: "" });
    expect(ids(f)).toEqual(["missing-key-details:warning"]);
    expect(f[0].fieldKeys).toEqual(["student_no", "school_year"]);
  });

  it("flag copy never states a verdict", () =>
    expect(JSON.stringify(run({ enrollment_date: "2020-01-01", school_year: "2019-2023", year_level: "1st" })))
      .not.toMatch(/\b(invalid|fake|forged|rejected|ineligible|verified|authentic)\b/i));
});

describe("document type rules", () => {
  it("flags a different document type", () => {
    const f = checkDocument({
      profileId: "certificate_of_residency", values: {},
      detected: { detected: null, otherTitle: "Certificate of Indigency", evidence: "x" }, now: NOW,
    });
    expect(f[0]).toMatchObject({ id: "document-type-mismatch", severity: "alert", title: "This looks like a Certificate of Indigency" });
  });

  it("flags an unrecognised title", () =>
    expect(ids(checkDocument({
      profileId: "school_id", values: { full_name: "A B", student_no: "23-00314", section: "1" },
      detected: { detected: null, evidence: "" }, now: NOW,
    }))).toEqual(["document-type-unknown:warning"]));

  it("a government ID skips student-number checks", () =>
    expect(ids(checkDocument({
      profileId: "school_id", now: NOW,
      detected: { detected: "school_id", variant: "government_id", evidence: "PASSPORT" },
      values: { full_name: "Juan Dela Cruz", student_no: "", section: "" },
    }))).toEqual(["government-id:info"]));
});

describe("Certificate of Residency rules", () => {
  const residency = (values: Record<string, string>) =>
    checkDocument({ profileId: "certificate_of_residency", detected: { detected: "certificate_of_residency", evidence: "x" }, now: NOW, values });
  const base = { full_name: "A B", address: "C", years_stayed: "8", date_issued: "2026-11-01", city_issued: "Pasig" };

  it("flags a future issue date and unreadable years", () =>
    expect(ids(residency({ ...base, years_stayed: "many", date_issued: "2027-01-05" }))).toEqual(
      expect.arrayContaining(["date-issued-future:alert", "years-stayed-unreadable:warning"]),
    ));

  it("an ambiguous date is future only if both readings are", () =>
    expect(ids(residency({ ...base, date_issued: "12/01/2026" }))).not.toContain("date-issued-future:alert"));

  it("an unreadable issue date is flagged for checking", () =>
    expect(ids(residency({ ...base, date_issued: "sometime" }))).toContain("date-issued-unreadable:warning"));
});
