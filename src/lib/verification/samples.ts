import type { OcrInputPage } from "@/lib/ocr/extract-fields";
import type { ProfileId } from "./contract";
import { currentSchoolYear } from "./parse";
import { config } from "./profiles";

export type SampleVariant = "clean" | "with-issues";

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d: Date, n: number) => {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
};
const yy = (year: number) => String(year).slice(-2);

const HEADER = "SAMPLE - FICTIONAL DATA - FOR TESTING ONLY";
const FOOTER = "This is a fictional test record. It has no legal validity.";

/**
 * Fictional OCR pages for each document, built relative to `now` so the clean samples never go stale.
 * "with-issues" changes only the details a student might misread or mistype.
 */
export function samplePages(profileId: ProfileId, variant: SampleVariant, now: Date): OcrInputPage[] {
  const clean = variant === "clean";
  const current = currentSchoolYear(now, config.rules.schoolYearStartMonth);
  const schoolYearStart = new Date(current.start, config.rules.schoolYearStartMonth - 1, 1);
  const recent = addDays(now, -30);
  const studentNo = `${yy(current.start - 3)}-00314`;

  let lines: string[];
  if (profileId === "certificate_of_registration") {
    lines = [
      HEADER,
      "PASIG DEMO COLLEGE - FICTIONAL",
      "CERTIFICATE OF REGISTRATION",
      `Student No: ${studentNo}`,
      "Student Name: DELA CRUZ, JUAN MATEO",
      "Address: 12 Ilog Street, Barangay Rosario, Pasig City",
      "Course: Bachelor of Science in Information Technology",
      "Department: College of Computer Studies",
      `Enrollment Date: ${clean ? iso(recent > schoolYearStart ? recent : schoolYearStart) : `${current.start - 1}-01-15`}`,
      `School Year: ${current.start}-${current.end}`,
      `Year Level: ${clean ? "4th Year" : "2nd Year"}`,
      FOOTER,
    ];
  } else if (profileId === "certificate_of_residency") {
    lines = [
      HEADER,
      "Republic of the Philippines - DEMO",
      "Barangay Rosario, Pasig City - fictional",
      "CERTIFICATE OF RESIDENCY",
      `Name: ${clean ? "Juan Mateo Dela Cruz" : "Juana Dela Cruz"}`,
      `Address: ${clean ? "12 Ilog Street, Barangay Rosario, Pasig City" : "45 Kalayaan Avenue, Barangay Ugong, Pasig City"}`,
      "Years of Residence: 8",
      `Date Issued: ${iso(addDays(now, clean ? -10 : 45))}`,
      "City: Pasig City",
      FOOTER,
    ];
  } else {
    lines = [
      HEADER,
      "PASIG DEMO COLLEGE - FICTIONAL",
      "STUDENT IDENTIFICATION CARD",
      "Name: Juan M. Dela Cruz",
      `Student No: ${clean ? studentNo : `${yy(current.start - 4)}-01187`}`,
      "Section: BSIT 4-1",
      "No barcode, signature, or usable identifier is present.",
    ];
  }
  return [{ pageNumber: 1, lines: lines.map((text) => ({ text, confidence: 0.99 })) }];
}
