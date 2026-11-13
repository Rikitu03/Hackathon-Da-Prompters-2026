import { describe, expect, it } from "vitest";
import { compareAddresses, compareIds, compareNames, crossCheck, flagsFromComparisons } from "./compare";

describe("compareNames", () => {
  it.each([
    ["DELA CRUZ, JUAN MATEO", "Juan Mateo Dela Cruz", "match"],
    ["DELA CRUZ, JUAN MATEO", "Juan M. Dela Cruz", "match"],
    ["Juan Dela Cruz Jr.", "Juan Dela Cruz", "match"],
    ["José Rizal", "Jose Rizal", "match"],
    ["Juan Mateo Dela Cruz", "Juan Dela Cruz", "partial"],
    ["DELA CRUZ, JUAN MATEO", "Jvan Mateo Dela Cruz", "partial"],
    ["DELA CRUZ, JUAN MATEO", "Juana Dela Cruz", "partial"],
    ["DELA CRUZ, JUAN MATEO", "Maria Santos", "mismatch"],
  ])("compareNames(%j, %j) = %s", (a, b, e) => expect(compareNames(a, b)).toBe(e));

  it("is symmetric for the same person written two ways", () =>
    expect(compareNames("Juan M. Dela Cruz", "DELA CRUZ, JUAN MATEO")).toBe(compareNames("DELA CRUZ, JUAN MATEO", "Juan M. Dela Cruz")));
});

describe("compareIds", () => {
  it.each([
    ["23-00314", "23-00314", "match"],
    ["23-00314", "23 00314", "match"],
    ["23-00314", "2300314", "match"],
    ["23-00314", "23-00341", "partial"],
    ["23-00314", "22-01187", "mismatch"],
  ])("compareIds(%j, %j) = %s", (a, b, e) => expect(compareIds(a, b)).toBe(e));
});

describe("compareAddresses", () => {
  it.each([
    ["12 Ilog Street, Barangay Rosario, Pasig City", "12 Ilog St., Brgy. Rosario, Pasig", "match"],
    ["12 Ilog Street, Barangay Rosario, Pasig City", "Rosario, Pasig City", "partial"],
    ["12 Ilog Street, Barangay Rosario, Pasig City", "45 Kalayaan Avenue, Barangay Ugong, Pasig City", "mismatch"],
  ])("compareAddresses(%j, %j) = %s", (a, b, e) => expect(compareAddresses(a, b)).toBe(e));
});

const COR = { student_no: "23-00314", student_name: "DELA CRUZ, JUAN MATEO", address: "12 Ilog Street, Barangay Rosario, Pasig City" };

describe("crossCheck", () => {
  it("compares an ID with the COR", () =>
    expect(
      crossCheck({ certificate_of_registration: COR, school_id: { full_name: "Juan M. Dela Cruz", student_no: "23-00314" } })
        .map((c) => [c.id, c.status]),
    ).toEqual([["id-name", "match"], ["id-student-no", "match"]]));

  it("skips pairs with a missing document or value", () =>
    expect(
      crossCheck({ school_id: { full_name: "Juan", student_no: "" }, certificate_of_registration: { ...COR, student_no: "" } }).map((c) => c.id),
    ).toEqual(["id-name"]));
});

describe("flagsFromComparisons", () => {
  it("flags the viewed side of a mismatch", () => {
    const c = crossCheck({ certificate_of_registration: COR, school_id: { full_name: "Juan M. Dela Cruz", student_no: "22-01187" } });
    expect(flagsFromComparisons(c, "school_id")).toEqual([
      expect.objectContaining({
        id: "cross-id-student-no", severity: "alert", origin: "cross-check", fieldKeys: ["student_no"],
        title: "Student number differs from your Certificate of Registration",
      }),
    ]);
    expect(flagsFromComparisons(c, "certificate_of_registration")[0].fieldKeys).toEqual(["student_no"]);
    expect(flagsFromComparisons(c, "certificate_of_residency")).toEqual([]);
  });

  it("uses a softer flag when details only partly match", () => {
    const c = crossCheck({ certificate_of_registration: COR, school_id: { full_name: "Juana Dela Cruz", student_no: "23-00314" } });
    expect(flagsFromComparisons(c, "school_id")).toEqual([
      expect.objectContaining({ id: "cross-id-name", severity: "warning", title: "Name doesn't fully match your Certificate of Registration" }),
    ]);
  });
});
