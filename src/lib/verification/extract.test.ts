import { describe, expect, it } from "vitest";
import { classifyDocument, extractProfileFields } from "./extract";

const page = (texts: string[], confidence = 0.99) => [
  { pageNumber: 1, lines: texts.map((text) => ({ text, confidence })) },
];
const val = (r: ReturnType<typeof extractProfileFields>, k: string) => r.fields.find((f) => f.key === k)!;

describe("extractProfileFields", () => {
  it("reads labelled COR details in profile order", () => {
    const r = extractProfileFields(
      page([
        "CERTIFICATE OF REGISTRATION", "Student No: 23-00314", "Student Name: DELA CRUZ, JUAN MATEO",
        "Address: 12 Ilog Street, Barangay Rosario, Pasig City", "Course: BS Information Technology",
        "Department: College of Computer Studies", "Enrollment Date: 2026-08-04", "School Year: 2026-2027",
        "Year Level: 4th Year",
      ]),
      "certificate_of_registration",
    );
    expect(r.fields.map((f) => [f.key, f.value])).toEqual([
      ["student_no", "23-00314"], ["student_name", "DELA CRUZ, JUAN MATEO"],
      ["address", "12 Ilog Street, Barangay Rosario, Pasig City"], ["course", "BS Information Technology"],
      ["department", "College of Computer Studies"], ["enrollment_date", "2026-08-04"],
      ["school_year", "2026-2027"], ["year_level", "4th Year"],
    ]);
    expect(r.detected).toEqual({ detected: "certificate_of_registration", evidence: "CERTIFICATE OF REGISTRATION" });
  });

  it("reads a value printed on the line after its label", () => {
    const f = val(extractProfileFields(page(["School Year", "2026-2027"]), "certificate_of_registration"), "school_year");
    expect([f.value, f.originalText]).toEqual(["2026-2027", "School Year\n2026-2027"]);
  });

  it("never takes the next label as a value", () => {
    const r = extractProfileFields(page(["School Year:", "Year Level: 3rd Year"]), "certificate_of_registration");
    expect(val(r, "school_year").value).toBe("");
    expect(val(r, "year_level").value).toBe("3rd Year");
  });

  it("falls back to narrative patterns", () =>
    expect(
      val(
        extractProfileFields(
          page(["CERTIFICATE OF RESIDENCY", "This certifies that Juan Mateo Dela Cruz has resided in Barangay Rosario for 8 years."]),
          "certificate_of_residency",
        ),
        "years_stayed",
      ).value,
    ).toBe("8"));

  it("keeps OCR confidence warnings", () =>
    expect(val(extractProfileFields(page(["Section: BSIT 4-1"], 0.5), "school_id"), "section").warnings).toEqual([
      "Low confidence. Please check.",
    ]));

  it("leaves missing details empty", () =>
    expect(val(extractProfileFields(page(["nothing here"]), "school_id"), "student_no")).toMatchObject({
      value: "", needsReview: true, warnings: ["Not found. Please fill this in if it applies."],
    }));

  it("never claims verification", () =>
    expect(
      JSON.stringify(extractProfileFields(page(["CERTIFICATE OF REGISTRATION"]), "certificate_of_registration")),
    ).not.toMatch(/\b(verified|authentic|eligible|approved)\b/i));
});

describe("classifyDocument", () => {
  it.each([
    ["PHILIPPINE IDENTIFICATION CARD", { detected: "school_id", variant: "government_id", evidence: "PHILIPPINE IDENTIFICATION CARD" }],
    ["STUDENT IDENTIFICATION CARD", { detected: "school_id", evidence: "STUDENT IDENTIFICATION CARD" }],
    ["CERTIFICATE OF INDIGENCY", { detected: null, otherTitle: "Certificate of Indigency", evidence: "CERTIFICATE OF INDIGENCY" }],
    ["SCORE SHEET", { detected: null, evidence: "" }],
  ])("classifies %s", (text, expected) => expect(classifyDocument([{ text }])).toEqual(expected));
});
