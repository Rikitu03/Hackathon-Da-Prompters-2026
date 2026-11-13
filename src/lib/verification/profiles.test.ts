import { describe, expect, it } from "vitest";
import raw from "./document-keywords.json";
import { config, getProfile, parseConfig, profileForRequirement } from "./profiles";

describe("document keyword storage", () => {
  it("loads the three profiles in demo order", () =>
    expect(config.profiles.map((p) => p.id)).toEqual(["certificate_of_registration", "certificate_of_residency", "school_id"]));

  it("lists the requested details for each document", () => {
    expect(getProfile("certificate_of_registration").fields.map((f) => f.key)).toEqual(
      ["student_no", "student_name", "address", "course", "department", "enrollment_date", "school_year", "year_level"]);
    expect(getProfile("certificate_of_residency").fields.map((f) => f.key)).toEqual(
      ["full_name", "address", "years_stayed", "date_issued", "city_issued"]);
    expect(getProfile("school_id").fields.map((f) => f.key)).toEqual(["full_name", "student_no", "section"]);
  });

  it("pins the user's rule values", () => {
    expect(config.rules.enrollmentRecency).toEqual({ warnYearsBehind: 1, alertYearsBehind: 3 });
    expect(new RegExp(config.rules.studentNoPattern).test("23-00314")).toBe(true);
  });

  it.each([
    [{ id: "certificate-of-registration", title: "x" }, "certificate_of_registration"],
    [{ id: "barangay-residency", title: "x" }, "certificate_of_residency"],
    [{ id: "school-or-valid-id", title: "x" }, "school_id"],
    [{ id: "a1", title: "Certificate of Registration (COR)" }, "certificate_of_registration"],
    [{ id: "a2", title: "Barangay Certificate of Residency" }, "certificate_of_residency"],
    [{ id: "a3", title: "School ID or any Valid-ID" }, "school_id"],
    [{ id: "a4", title: "Record of grades" }, null],
  ])("maps %o to %s", (req, expected) => expect(profileForRequirement(req)).toBe(expected));

  it("rejects a malformed config", () => {
    expect(() => parseConfig({ ...raw, profiles: [] })).toThrow();
    expect(() =>
      parseConfig({ ...raw, crossChecks: [{ ...raw.crossChecks[0], left: { profile: "school_id", field: "nope" } }] }),
    ).toThrow();
  });
});
