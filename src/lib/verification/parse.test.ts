import { describe, expect, it } from "vitest";
import { currentSchoolYear, parseDate, parseSchoolYear, parseStudentNo, parseYearLevel, parseYears } from "./parse";

describe("parseDate", () => {
  it.each([
    ["2026-08-04", { year: 2026, month: 8, day: 4, ambiguous: false }],
    ["August 4, 2026", { year: 2026, month: 8, day: 4, ambiguous: false }],
    ["4 Aug 2026", { year: 2026, month: 8, day: 4, ambiguous: false }],
    ["Aug. 4, 2026", { year: 2026, month: 8, day: 4, ambiguous: false }],
    ["08/24/2026", { year: 2026, month: 8, day: 24, ambiguous: false }],
    ["08/04/2026", { year: 2026, month: 8, day: 4, ambiguous: true }],
    ["June 2026", { year: 2026, month: 6, day: null, ambiguous: false }],
  ])("parseDate(%j)", (v, e) => expect(parseDate(v)).toEqual(e));

  it.each(["", "TBA", "2026-13-40", "32/32/2026"])("parseDate(%j) is null", (v) => expect(parseDate(v)).toBeNull());
});

describe("parseSchoolYear", () => {
  it.each([
    ["2026-2027", [2026, 2027]],
    ["SY 2026–2027", [2026, 2027]],
    ["A.Y. 2026 - 27", [2026, 2027]],
    ["2026/2027", [2026, 2027]],
    ["2026-2028", [2026, 2028]],
  ])("parseSchoolYear(%j)", (v, [start, end]) => expect(parseSchoolYear(v as string)).toEqual({ start, end }));

  it.each(["2026", "TBA"])("parseSchoolYear(%j) is null", (v) => expect(parseSchoolYear(v)).toBeNull());
});

describe("parseYearLevel", () => {
  it.each([
    ["4th Year", 4], ["Fourth Year", 4], ["IV", 4], ["3", 3], ["Grade 5", 5], ["First year", 1], ["Irregular", null],
  ])("parseYearLevel(%j)", (v, e) => expect(parseYearLevel(v as string)).toBe(e));
});

describe("parseStudentNo", () => {
  it("parses student numbers", () => {
    expect(parseStudentNo("23-00314", "^\\d{2}-\\d{5}$")).toEqual({ normalized: "23-00314", entryYear: 2023, matchesPattern: true });
    expect(parseStudentNo("2023-00314", "^\\d{2}-\\d{5}$")).toMatchObject({ entryYear: 2023, matchesPattern: false });
    expect(parseStudentNo("2300314", "^\\d{2}-\\d{5}$")).toMatchObject({ entryYear: null, matchesPattern: false });
  });
});

describe("parseYears", () => {
  it("parses years stayed", () => {
    const now = new Date(2026, 10, 13);
    expect([parseYears("8", now), parseYears("8 years", now), parseYears("Since 2018", now), parseYears("many", now)]).toEqual([8, 8, 8, null]);
  });
});

describe("currentSchoolYear", () => {
  it("knows the current school year", () => {
    expect(currentSchoolYear(new Date(2026, 10, 13), 6)).toEqual({ start: 2026, end: 2027 });
    expect(currentSchoolYear(new Date(2027, 0, 20), 6)).toEqual({ start: 2026, end: 2027 });
  });
});
